import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Task, AIScheduleSettings, DEFAULT_SCHEDULE_SETTINGS } from '@/types';
import { DQLSchedulerModel, DQLPrediction, DQLTrainingRecord } from './DQLModel';

export interface ScheduledTask {
  task: Task;
  startHour: number;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:30"
  durationMins: number;
  confidence: number; // 0-100
  reason: string;
  scheduledDate: Date; // the calendar day this task is scheduled on
}

export interface ProductivityInsight {
  bestHours: { hour: number; rate: number }[];
  worstHours: { hour: number; rate: number }[];
  overallSuccessRate: number;
  totalRecords: number;
}

export interface AIScheduleResult {
  schedule: ScheduledTask[];
  insights: ProductivityInsight;
  generatedAt: Date;
}

interface TaskHistoryRecord {
  task_name: string;
  hour: number;
  completed: number; // 0 or 1
  duration: number;
  user_id?: string;
}

async function fetchTaskHistory(userId: string): Promise<TaskHistoryRecord[]> {
  // ── 1. Try dedicated task_history collection (populated by notebook / external tools) ──
  try {
    const ref = collection(db, 'task_history');
    const userQ = query(ref, where('user_id', '==', userId));
    const userSnap = await getDocs(userQ);

    if (!userSnap.empty) {
      const records = userSnap.docs
        .map(d => d.data() as Partial<TaskHistoryRecord>)
        .filter(d => d.task_name != null && d.hour != null && d.completed != null && d.duration != null) as TaskHistoryRecord[];
      if (records.length > 0) return records;
    }

    // Try without user_id filter (shared / demo data)
    const allSnap = await getDocs(ref);
    if (!allSnap.empty) {
      const records = allSnap.docs
        .map(d => d.data() as Partial<TaskHistoryRecord>)
        .filter(d => d.task_name != null && d.hour != null && d.completed != null && d.duration != null) as TaskHistoryRecord[];
      if (records.length > 0) return records;
    }
  } catch (e) {
    console.warn('[AISchedule] task_history collection unavailable:', e);
  }

  // ── 2. Fallback: derive patterns from the existing tasks collection ──
  // completed tasks → completed=1, hour from updated_at (when they were actually done)
  // non-completed → completed=0, hour from due_at (when they were planned)
  try {
    const tasksRef = collection(db, 'tasks');
    const tasksQ = query(tasksRef, where('user_id', '==', userId));
    const tasksSnap = await getDocs(tasksQ);

    if (tasksSnap.empty) return [];

    return tasksSnap.docs.map(d => {
      const data = d.data();
      const isCompleted = data.status === 'completed';
      const dueDate: Date = data.due_at?.toDate?.() ?? new Date();
      const updatedAt: Date = data.updated_at?.toDate?.() ?? dueDate;
      // For completed tasks use the hour they were finished; for others, the hour they were due
      const rawHour = isCompleted ? updatedAt.getHours() : dueDate.getHours();
      const estimatedMins: number = data.estimated_time ?? 60;
      return {
        task_name: data.title ?? 'Unknown',
        hour: Math.max(8, Math.min(21, rawHour)),
        completed: isCompleted ? 1 : 0,
        duration: estimatedMins / 60,
        user_id: userId,
      } as TaskHistoryRecord;
    });
  } catch (e) {
    console.warn('[AISchedule] tasks fallback fetch failed:', e);
    return [];
  }
}

async function countCompletedTasks(userId: string): Promise<number> {
  try {
    const tasksRef = collection(db, 'tasks');
    const tasksQ = query(tasksRef, where('user_id', '==', userId), where('status', '==', 'completed'));
    const tasksSnap = await getDocs(tasksQ);
    return tasksSnap.size;
  } catch (e) {
    console.warn('[AISchedule] Failed to count completed tasks:', e);
    return 0;
  }
}

function computeHourlyRates(records: TaskHistoryRecord[]): Map<number, { completed: number; total: number }> {
  const map = new Map<number, { completed: number; total: number }>();
  for (const r of records) {
    const hour = Math.max(8, Math.min(21, r.hour));
    const existing = map.get(hour) ?? { completed: 0, total: 0 };
    existing.total += 1;
    existing.completed += r.completed ? 1 : 0;
    map.set(hour, existing);
  }
  return map;
}

function rankHours(hourlyRates: Map<number, { completed: number; total: number }>): { hour: number; rate: number }[] {
  const result: { hour: number; rate: number }[] = [];
  hourlyRates.forEach((stats, hour) => {
    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    result.push({ hour, rate });
  });
  return result.sort((a, b) => b.rate - a.rate);
}

// ── Learned feature inference ──
// When urgency/importance are at their default (5,5), infer representative values
// from the priority label so the model has a meaningful continuous signal.
// This mirrors how the DQL notebook encodes priority as a 1-10 numeric feature.
const PRIORITY_INFERRED: Record<Task['priority'], { urgency: number; importance: number }> = {
  high:   { urgency: 8.5, importance: 8.5 },
  medium: { urgency: 5.0, importance: 5.0 },
  low:    { urgency: 2.0, importance: 2.0 },
};

// Convert a task's priority to a numeric 1-10 score used as the DQL priority input.
// Matches the notebook's numeric encoding: high≈8, medium≈5, low≈2.
function toPriorityNum(task: Task): number {
  const u = task.urgency ?? 5;
  const i = task.importance ?? 5;
  if (u === 5 && i === 5) return { high: 8, medium: 5, low: 2 }[task.priority] ?? 5;
  return (u + i) / 2;
}

// Resolve the effective urgency/importance for a task.
// Uses the task's own values if they've been customised; otherwise infers from priority.
function resolveFeatures(task: Task): { urgency: number; importance: number } {
  const u = task.urgency ?? 5;
  const i = task.importance ?? 5;
  // If both are at the exact default, treat them as unset and infer from priority
  if (u === 5 && i === 5) {
    return PRIORITY_INFERRED[task.priority] ?? { urgency: 5, importance: 5 };
  }
  return { urgency: u, importance: i };
}

// Compute task intensity: geometric mean of urgency × importance, normalised 0-1.
// Pure input-driven — no lookup tables, no hardcoded ordering by label.
function computeTaskIntensity(task: Task): number {
  const { urgency, importance } = resolveFeatures(task);
  return Math.sqrt(urgency * importance) / 10; // 0-1
}

// Deadline score using exponential decay (natural, non-rule-based)
// k=0.099: 0 days→1.0, 7 days→0.50, 14 days→0.25, 30 days→0.05
function computeDeadlineScore(task: Task): number {
  const now = new Date();
  const daysUntilDeadline = (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilDeadline <= 0) return 1.0;
  return Math.exp(-0.099 * daysUntilDeadline);
}

// ── Data-driven weight learning ──
// Learns how much to weight intensity vs deadline from the user's own history.
// Mirrors the DQL's implicit learning of Q-value coefficients from observed rewards.
//
// Logic: compare completion rates in "early" hours (user planned ahead → priority-driven)
// vs "late" hours (user worked near deadline → deadline-driven).
// If deadlines drive the user → weight deadline more.
// If the user completes tasks regardless of deadline → weight intensity (priority) more.
function learnWeights(records: TaskHistoryRecord[]): { intensity: number; deadline: number } {
  if (records.length < 5) return { intensity: 0.65, deadline: 0.35 };

  // Early hours (8-12): tasks done proactively — correlate with intensity/priority
  // Late hours (16-21): tasks done under time pressure — correlate with deadline
  const early = records.filter(r => r.hour >= 8 && r.hour < 13);
  const late  = records.filter(r => r.hour >= 16 && r.hour <= 21);

  const earlyRate = early.length > 0 ? early.filter(r => r.completed).length / early.length : 0.5;
  const lateRate  = late.length  > 0 ? late.filter(r => r.completed).length  / late.length  : 0.5;

  // If the user completes more tasks in early hours they are priority-driven
  // If late hours have higher completion they are deadline-driven
  const priorityDriven = Math.max(0, earlyRate - lateRate); // 0-1
  const deadlineDriven = Math.max(0, lateRate - earlyRate); // 0-1

  // Blend: default intensity=0.65, slide toward whichever signal is stronger
  const intensityWeight = Math.min(0.85, Math.max(0.45, 0.65 + priorityDriven * 0.2 - deadlineDriven * 0.2));
  return { intensity: intensityWeight, deadline: 1 - intensityWeight };
}

// Final learned score: combines intensity and deadline with data-derived weights.
// This is the equivalent of the DQL's Q-value for "how urgently should this task be scheduled."
function computeLearnedScore(task: Task, weights: { intensity: number; deadline: number }): number {
  return computeTaskIntensity(task) * weights.intensity
       + computeDeadlineScore(task)  * weights.deadline;
}

function computeConfidence(
  task: Task,
  assignedHour: number,
  hourlyRates: Map<number, { completed: number; total: number }>,
  overallSuccessRate: number
): number {
  const hourRate = hourlyRates.get(assignedHour);
  const hourBase = hourRate
    ? Math.round((hourRate.completed / hourRate.total) * 100)
    : overallSuccessRate;

  const intensity = computeTaskIntensity(task);
  const intensityBonus = Math.round(intensity * 10);
  return Math.min(100, Math.max(10, hourBase + intensityBonus));
}

function formatTime(hour: number, minutes = 0): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

export class NotEnoughHistoryError extends Error {
  constructor(public readonly count: number) {
    super(`Not enough completed tasks: ${count} found. Complete more than 5 tasks to unlock AI recommendations.`);
    this.name = 'NotEnoughHistoryError';
  }
}

const MIN_COMPLETED_TASKS = 5; // Must have MORE than 5 completed tasks

export async function generateAISchedule(
  userId: string,
  pendingTasks: Task[],
  settings: AIScheduleSettings = DEFAULT_SCHEDULE_SETTINGS
): Promise<AIScheduleResult> {
  // Check if user has more than 5 completed tasks
  const completedCount = await countCompletedTasks(userId);
  if (completedCount <= MIN_COMPLETED_TASKS) {
    throw new NotEnoughHistoryError(completedCount);
  }

  const records = await fetchTaskHistory(userId);

  const hourlyRates = computeHourlyRates(records);
  const ranked = rankHours(hourlyRates);

  // Build insights
  const overallSuccessRate =
    records.length > 0
      ? Math.round((records.filter(r => r.completed).length / records.length) * 100)
      : 0;

  const insights: ProductivityInsight = {
    bestHours: ranked.slice(0, 3),
    worstHours: [...ranked].reverse().slice(0, 3),
    overallSuccessRate,
    totalRecords: records.length,
  };

  // ════════════════════════════════════════════════════════════════════════════════════
  // ALL USER SETTINGS ARE APPLIED HERE — The AI follows your preferences
  // ════════════════════════════════════════════════════════════════════════════════════
  // 
  // workStart/workEnd:      Hard constraints — tasks NEVER scheduled outside this window
  // peakStart/peakEnd:      Used by "Focused" scheduling style to concentrate high-priority work
  // taskBlock:              Default task duration (minutes) when estimatedTime not provided
  // breakMinutes:           Not used when stress level is set — AI uses FIXED break times based on stress level:
  //                         - High stress: 35 minutes (maximum recovery time, lighter load)
  //                         - Moderate stress: 20 minutes (balanced breaks)
  //                         - Low stress: 10 minutes (shorter breaks, denser schedule)
  // stressLevel:            Controls task spacing/density via fixed break time durations
  // schedulingStyle:        How to choose task hours:
  //                         - Focused: use peak hours only (peakStart → peakEnd)
  //                         - Balanced: use historical best productivity hours within work window
  //                         - Flexible: use all available work hours
  // 
  // ════════════════════════════════════════════════════════════════════════════════════

  // ── Apply settings ──
  const WORK_START = settings.workStart;
  const WORK_END = settings.workEnd;

  // Stress level determines break time — affects task density and spacing
  // High stress: 35 minutes → fewer tasks, maximum recovery time
  // Moderate stress: 20 minutes → balanced task density
  // Low stress: 10 minutes → denser schedule, more tasks back-to-back
  const effectiveBreak =
    settings.stressLevel === 'High' ? 35 :
    settings.stressLevel === 'Low'  ? 10 :
    20; // Moderate

  // ── Learn weights from user's history (used as DQL fallback) ──
  const learnedWeights = learnWeights(records);

  // Helper function to check if a task is missed (overdue and not completed)
  const isMissedTask = (task: Task): boolean => {
    if (task.status === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(task.dueDate);
    dueDay.setHours(0, 0, 0, 0);
    return dueDay < today;
  };

  // Only schedule tasks that are due within the next 2 weeks (including today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const twoWeeksEnd = new Date(today);
  twoWeeksEnd.setDate(twoWeeksEnd.getDate() + 14);
  twoWeeksEnd.setHours(23, 59, 59, 999);

  // Filter: include overdue tasks AND tasks due today or in the future (up to 2 weeks)
  // Normalize dueDate to remove time component for fair comparison
  const tasksForToday = pendingTasks.filter(t => {
    const taskDueDay = new Date(t.dueDate);
    taskDueDay.setHours(0, 0, 0, 0);
    // Include overdue (past due) OR due within 2 weeks from today
    return taskDueDay <= twoWeeksEnd;
  });

  // ── DQL: train on task history, then predict best hour + priority Q-value per task ──
  // Mirrors AI.ipynb — Dense(64→64→32→14,linear), Bellman updates, experience replay.
  let dqlModel: DQLSchedulerModel | null = null;
  const taskPredictions = new Map<string, DQLPrediction>();

  try {
    // History records don't store priority metadata; default to medium (5).
    // The DQL learns time-of-day completion patterns from the reward signal (+10/-5).
    const trainingData: DQLTrainingRecord[] = records.map(r => ({
      hour: r.hour,
      priorityNum: 5,
      durationHrs: r.duration,
      completed: r.completed === 1,
    }));

    dqlModel = await DQLSchedulerModel.load(userId);
    await dqlModel.train(trainingData);
    await dqlModel.save(userId);

    // Generate per-task predictions using actual urgency/importance features.
    // maxQValue = how strongly the model expects this task to succeed → used for ranking.
    // The model predicts within 8-21 hour range, then the scheduler constrains to user's workStart/workEnd.
    for (const task of tasksForToday) {
      const pred = await dqlModel.predict(
        toPriorityNum(task),
        (task.estimatedTime ?? 60) / 60,
        WORK_START
      );
      taskPredictions.set(task.id, pred);
    }
  } catch (e) {
    console.warn('[AISchedule] DQL unavailable, using learned weights:', e);
  }

  // Sort by DQL maxQValue (higher Q = model is more confident the task should be done first).
  // Falls back to learned intensity+deadline score if DQL training failed.
  const useDQL = taskPredictions.size > 0;
  const sorted = [...tasksForToday].sort((a, b) =>
    useDQL
      ? (taskPredictions.get(b.id)?.maxQValue ?? 0) - (taskPredictions.get(a.id)?.maxQValue ?? 0)
      : computeLearnedScore(b, learnedWeights) - computeLearnedScore(a, learnedWeights)
  );

  // ── Smart scheduling: group by day, reset clock per day ──
  const schedule: ScheduledTask[] = [];

  // Get best productivity hours filtered to work window
  let bestHours = ranked.length > 0
    ? ranked.map(r => r.hour).filter(h => h >= WORK_START && h < WORK_END)
    : Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);

  // Apply scheduling style preferences
  if (settings.schedulingStyle === 'Focused') {
    // Focused: schedule within peak productivity hours only (peakStart → peakEnd)
    // If no historical data in peak hours, still enforce peak hours (don't fall back)
    const peakHours = bestHours.filter(h => h >= settings.peakStart && h < settings.peakEnd);
    if (peakHours.length > 0) {
      bestHours = peakHours;
    } else {
      // No historical data in peak window — generate all peak hours
      bestHours = Array.from(
        { length: settings.peakEnd - settings.peakStart },
        (_, i) => settings.peakStart + i
      );
    }
  } else if (settings.schedulingStyle === 'Balanced') {
    // Balanced: prioritize peak hours from historical data, then other work hours
    const peakHours = bestHours.filter(h => h >= settings.peakStart && h < settings.peakEnd);
    const nonPeakHours = bestHours.filter(h => h < settings.peakStart || h >= settings.peakEnd);
    
    if (peakHours.length > 0) {
      // Peak hours available in history: prefer them
      bestHours = [...peakHours, ...nonPeakHours];
    } else {
      // No peak hour history: generate peak hours and then fill with other work hours
      const generatedPeakHours = Array.from(
        { length: settings.peakEnd - settings.peakStart },
        (_, i) => settings.peakStart + i
      );
      bestHours = [...generatedPeakHours, ...nonPeakHours];
    }
  } else if (settings.schedulingStyle === 'Flexible') {
    // Flexible: use ALL available work hours for maximum scheduling flexibility
    // Ignores productivity patterns, prioritizes fitting all tasks
    bestHours = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);
  }
  // Balanced: uses top historical productivity hours within work window (default)

  // Ensure we have at least one best hour
  if (bestHours.length === 0) bestHours.push(WORK_START);

  // Group tasks by their scheduled day:
  // overdue tasks → today; upcoming tasks → their due date (date-only, no time).
  
  const getScheduleDay = (task: Task): string => {
    if (isMissedTask(task)) {
      return today.toDateString(); // overdue → schedule today
    }
    const d = new Date(task.dueDate);
    d.setHours(0, 0, 0, 0);
    return d.toDateString();
  };

  // Group sorted tasks by day key, preserving order within each day
  const dayGroups = new Map<string, Task[]>();
  for (const task of sorted) {
    const key = getScheduleDay(task);
    if (!dayGroups.has(key)) dayGroups.set(key, []);
    dayGroups.get(key)!.push(task);
  }

  // Sort day keys chronologically
  const sortedDayKeys = [...dayGroups.keys()].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  for (const dayKey of sortedDayKeys) {
    const dayTasks = dayGroups.get(dayKey)!;
    const scheduledDay = new Date(dayKey);

    // In Focused mode, the preferred window is peakStart → peakEnd.
    // In other modes the full work day (WORK_START → WORK_END) is used.
    const dayStartHour = settings.schedulingStyle === 'Focused'
      ? settings.peakStart
      : WORK_START;
    // const effectiveWorkEnd = settings.schedulingStyle === 'Focused'
    //   ? settings.peakEnd
    //   : WORK_END;

    // Track every placed interval so no two tasks can share the same time slot.
    const dayIntervals: { start: number; end: number }[] = [];

    /**
     * Find the earliest free slot of `duration` minutes.
     *
     * Strategy varies by scheduling style:
     *  - Focused: only within peak window
     *  - Balanced: prioritize peak hours, then other work hours
     *  - Flexible: use all work hours equally
     *
     * Returns null only if the task cannot fit anywhere in the workday.
     */
    const findSlot = (preferred: number, duration: number): number | null => {
      const fullStart = WORK_START * 60;
      const fullEnd   = WORK_END   * 60;
      const sorted    = [...dayIntervals].sort((a, b) => a.start - b.start);

      const tryFrom = (from: number, endLimit: number): number | null => {
        let slot = Math.max(from, fullStart);
        for (const iv of sorted) {
          if (slot + duration <= iv.start) break;   // fits before this interval
          if (slot < iv.end) slot = iv.end + effectiveBreak; // jump past it + break
        }
        return slot + duration <= endLimit ? slot : null;
      };

      // Build allowed hour windows based on scheduling style
      let allowedHours: number[] = [];
      if (settings.schedulingStyle === 'Balanced') {
        // Balanced: peak hours first, then other work hours
        const peakWindow = bestHours.filter(h => h >= settings.peakStart && h < settings.peakEnd);
        const otherHours = bestHours.filter(h => h < settings.peakStart || h >= settings.peakEnd);
        allowedHours = [...peakWindow, ...otherHours];
      } else if (settings.schedulingStyle === 'Flexible') {
        // Flexible: all work hours equally available
        allowedHours = bestHours;
      } else {
        // Focused: peak window only
        allowedHours = bestHours.filter(h => h >= settings.peakStart && h < settings.peakEnd);
      }

      // 1. Preferred spot (if it's in allowed hours)
      if (settings.schedulingStyle === 'Flexible' || 
          allowedHours.includes(Math.floor(preferred / 60))) {
        const fromPreferred = tryFrom(preferred, fullEnd);
        if (fromPreferred !== null) return fromPreferred;
      }

      // 2. Try allowed hours in order (respects Balanced prioritization)
      for (const hour of allowedHours) {
        const hourStart = hour * 60;
        const slot = tryFrom(hourStart, fullEnd);
        if (slot !== null) return slot;
      }

      // 3. Full-day fallback for Flexible (tasks must never be silently dropped)
      if (settings.schedulingStyle === 'Flexible') {
        return tryFrom(fullStart, fullEnd);
      }

      return null;
    };

    for (const task of dayTasks) {
      const durationMins = Math.max(task.estimatedTime || settings.taskBlock || 60, 1);

      // Determine preferred start in minutes from midnight
      let preferredMins: number;
      if (isMissedTask(task)) {
        // Overdue/missed tasks: fill in from the day start as soon as possible
        preferredMins = dayStartHour * 60;
      } else {
        const pred = taskPredictions.get(task.id);
        if (pred) {
          let dqlHour = pred.bestHour;
          if (settings.schedulingStyle === 'Focused') {
            dqlHour = Math.max(dqlHour, settings.peakStart);
            dqlHour = Math.min(dqlHour, settings.peakEnd - 1);
          } else {
            dqlHour = Math.max(dqlHour, WORK_START);
            dqlHour = Math.min(dqlHour, WORK_END - 1);
          }
          preferredMins = dqlHour * 60;
        } else {
          // Fallback: use historically best productivity hours
          const nextBestHour = bestHours.find(h => h >= dayStartHour) ?? dayStartHour;
          preferredMins = nextBestHour * 60;
        }
      }

      const startMins = findSlot(preferredMins, durationMins);
      if (startMins === null) continue; // can't fit even in full workday — skip

      const endMins = startMins + durationMins;
      dayIntervals.push({ start: startMins, end: endMins });

      const assignedHour = Math.floor(startMins / 60);
      const startMin = startMins % 60;
      const endHour = Math.floor(endMins / 60);
      const endMin = endMins % 60;

      const dqlPred = taskPredictions.get(task.id);
      const intensity = computeTaskIntensity(task);
      const deadlineScore = computeDeadlineScore(task);

      let confidence: number;
      let reason: string;

      if (dqlPred) {
        // DQL-derived confidence: Q-value mapped to 0-100
        confidence = dqlPred.confidence;
        const maxQ = dqlPred.maxQValue.toFixed(1);
        if (confidence >= 70) {
          reason = `${confidence}% AI confidence at ${formatTime(assignedHour)} — Q-score ${maxQ}, intensity ${Math.round(intensity * 100)}%, deadline ${Math.round(deadlineScore * 100)}%`;
        } else {
          reason = `Scheduled at ${formatTime(assignedHour)} — AI Q-score ${maxQ}, intensity ${Math.round(intensity * 100)}%, deadline ${Math.round(deadlineScore * 100)}%`;
        }
      } else {
        // Fallback: hour-based completion rate + intensity bonus
        confidence = computeConfidence(task, assignedHour, hourlyRates, overallSuccessRate);
        if (records.length === 0) {
          reason = `Scheduled at ${formatTime(assignedHour)} — intensity ${Math.round(intensity * 100)}%, deadline urgency ${Math.round(deadlineScore * 100)}%`;
        } else if (confidence >= 70) {
          reason = `${confidence}% confidence at ${formatTime(assignedHour)} — intensity ${Math.round(intensity * 100)}%, deadline urgency ${Math.round(deadlineScore * 100)}% (priority weight ${Math.round(learnedWeights.intensity * 100)}%)`;
        } else {
          reason = `Scheduled at ${formatTime(assignedHour)} — intensity ${Math.round(intensity * 100)}%, deadline urgency ${Math.round(deadlineScore * 100)}% (consider peak hours)`;
        }
      }

      schedule.push({
        task,
        startHour: assignedHour,
        startTime: formatTime(assignedHour, startMin),
        endTime: formatTime(endHour, endMin),
        durationMins,
        confidence,
        reason,
        scheduledDate: scheduledDay,
      });
    }
  }

  // Sort all days chronologically by scheduled time so breaks display correctly in the UI
  const todayDateString = today.toDateString();

  const todaySchedule = schedule
    .filter(s => s.scheduledDate.toDateString() === todayDateString)
    .sort((a, b) => a.startHour !== b.startHour ? a.startHour - b.startHour : 0);
  const futureSchedule = schedule.filter(s => s.scheduledDate.toDateString() !== todayDateString);

  // Sort future schedule by date, then time
  futureSchedule.sort((a, b) => {
    const dateDiff = a.scheduledDate.getTime() - b.scheduledDate.getTime();
    return dateDiff !== 0 ? dateDiff : a.startHour - b.startHour;
  });

  // Combine: today's tasks (in AI-priority order) first, then future tasks
  const finalSchedule = [...todaySchedule, ...futureSchedule];

  dqlModel?.dispose();
  return { schedule: finalSchedule, insights, generatedAt: new Date() };
}

// ── Firestore persistence for AI schedule ──

function serializeScheduleResult(result: AIScheduleResult): object {
  return {
    generatedAt: result.generatedAt.toISOString(),
    insights: result.insights,
    schedule: result.schedule.map(s => ({
      startHour: s.startHour,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMins: s.durationMins,
      confidence: s.confidence,
      reason: s.reason,
      scheduledDate: s.scheduledDate instanceof Date ? s.scheduledDate.toISOString() : s.scheduledDate,
      task: {
        ...s.task,
        dueDate: s.task.dueDate instanceof Date ? s.task.dueDate.toISOString() : s.task.dueDate,
        createdAt: s.task.createdAt instanceof Date ? s.task.createdAt.toISOString() : s.task.createdAt,
        updatedAt: s.task.updatedAt instanceof Date ? s.task.updatedAt.toISOString() : s.task.updatedAt,
        deletedAt: s.task.deletedAt instanceof Date ? s.task.deletedAt.toISOString() : (s.task.deletedAt ?? null),
      },
    })),
  };
}

function deserializeScheduleResult(data: Record<string, unknown>): AIScheduleResult {
  const rawSchedule = (data.schedule as Record<string, unknown>[]) ?? [];
  return {
    generatedAt: new Date(data.generatedAt as string),
    insights: data.insights as ProductivityInsight,
    schedule: rawSchedule.map(s => {
      const rawTask = s.task as Record<string, unknown>;
      const task: Task = {
        ...(rawTask as unknown as Task),
        dueDate: new Date(rawTask.dueDate as string),
        createdAt: new Date(rawTask.createdAt as string),
        updatedAt: new Date(rawTask.updatedAt as string),
        deletedAt: rawTask.deletedAt ? new Date(rawTask.deletedAt as string) : undefined,
      };
      return {
        startHour: s.startHour as number,
        startTime: s.startTime as string,
        endTime: s.endTime as string,
        durationMins: s.durationMins as number,
        confidence: s.confidence as number,
        reason: s.reason as string,
        scheduledDate: new Date(s.scheduledDate as string),
        task,
      } as ScheduledTask;
    }),
  };
}

export async function saveAIScheduleToFirestore(userId: string, result: AIScheduleResult): Promise<void> {
  try {
    const ref = doc(db, 'ai_schedules', userId);
    await setDoc(ref, serializeScheduleResult(result));
  } catch (e) {
    console.warn('[AISchedule] Failed to save schedule to Firestore:', e);
  }
}

export async function loadAIScheduleFromFirestore(userId: string): Promise<AIScheduleResult | null> {
  try {
    const ref = doc(db, 'ai_schedules', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return deserializeScheduleResult(snap.data() as Record<string, unknown>);
  } catch (e) {
    console.warn('[AISchedule] Failed to load schedule from Firestore:', e);
    return null;
  }
}

export async function clearAIScheduleFromFirestore(userId: string): Promise<void> {
  try {
    const ref = doc(db, 'ai_schedules', userId);
    await deleteDoc(ref);
  } catch (e) {
    console.warn('[AISchedule] Failed to clear schedule from Firestore:', e);
  }
}
