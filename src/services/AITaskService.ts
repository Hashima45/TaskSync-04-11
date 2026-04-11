import { Task, AIRecommendation } from '@/types';

export class AITaskService {
  private static readonly trackingState = new Map<string, {
    currentTaskId: string | null;
    startedAt: Date | null;
    interruptions: number;
    paused: boolean;
  }>();

  /**
   * Adaptive Algorithm for Smart Scheduling
   * Considers user working hours, task duration, and priority
   */
  static calculateOptimalSchedule(
    tasks: Task[],
    userOrWorkingHours: string | { start: number; end: number },
    maybeWorkingHours?: { start: number; end: number }
  ): Map<string, Date> {
    const schedule = new Map<string, Date>();
    const userWorkingHours = typeof userOrWorkingHours === 'string'
      ? (maybeWorkingHours || { start: 8, end: 18 })
      : userOrWorkingHours;

    // Sort by priority and due date
    const sortedTasks = [...tasks]
      .filter(t => t.status !== 'completed')
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    let currentTime = new Date();
    currentTime.setHours(userWorkingHours.start, 0, 0, 0);

    sortedTasks.forEach(task => {
      const taskDuration = task.estimatedTime / 60; // convert to hours

      // Check if task fits in current day
      if (currentTime.getHours() + taskDuration > userWorkingHours.end) {
        // Move to next day
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(userWorkingHours.start, 0, 0, 0);
      }

      schedule.set(task.id, new Date(currentTime));
      currentTime.setHours(currentTime.getHours() + taskDuration);
    });

    return schedule;
  }

  /**
   * Generate intelligent task recommendations based on patterns
   */
  static generateIntelligenRecommendations(
    tasks: Task[]
  ): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    const now = new Date();

    tasks
      .filter(t => t.status !== 'completed')
      .slice(0, 5)
      .forEach(task => {
        const daysUntilDue = Math.floor(
          (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Rule 1: Urgency-based recommendation
        if (daysUntilDue <= 1) {
          recommendations.push({
            taskId: task.id,
            reason: daysUntilDue < 0 ? 'Task is overdue - prioritize immediately' : 'Due tomorrow',
            confidence: 0.95,
            suggestedPriority: 'high',
            estimatedDuration: task.estimatedTime,
            bestTimeToStart: new Date(now.getTime() + 1000 * 60 * 15),
          });
        }
        // Rule 2: High priority not started
        else if (task.priority === 'high' && task.status === 'todo') {
          recommendations.push({
            taskId: task.id,
            reason: 'High priority task ready to start',
            confidence: 0.85,
            suggestedPriority: 'high',
            estimatedDuration: task.estimatedTime,
            bestTimeToStart: new Date(now.getTime() + 1000 * 60 * 60),
          });
        }
        // Rule 3: Quick wins recommendation
        else if (task.estimatedTime <= 30 && task.status === 'todo') {
          recommendations.push({
            taskId: task.id,
            reason: 'Quick task - good for momentum building',
            confidence: 0.7,
            suggestedPriority: task.priority,
            estimatedDuration: task.estimatedTime,
            bestTimeToStart: new Date(now.getTime() + 1000 * 60 * 30),
          });
        }
      });

    return recommendations.slice(0, 5);
  }

  static generateIntelligentRecommendations(tasks: Task[], _userId?: string): AIRecommendation[] {
    return this.generateIntelligenRecommendations(tasks);
  }

  /**
   * Calculate effort vs. impact matrix for task prioritization
   */
  static calculateEffortImpact(task: Task): { effort: number; impact: number } {
    const priorityImpact = { low: 1, medium: 2, high: 3, urgent: 4 };
    const impact = priorityImpact[task.priority];
    const effort = (task.estimatedTime / 60); // normalize to hours

    return { effort, impact };
  }

  /**
   * Adaptive learning: Analyze completed tasks to improve future recommendations
   */
  static analyzeUserPatterns(completedTasks: Task[]): {
    avgCompletionTime: number;
    preferredCategories: Map<string, number>;
    bestWorkingHours: number;
  } {
    let totalTime = 0;
    const categoryCount = new Map<string, number>();
    const hourlyCompletion = new Map<number, number>();

    completedTasks.forEach(task => {
      // Calculate actual vs estimated time difference
      totalTime += task.actualTime || task.estimatedTime;

      // Track category preferences
      categoryCount.set(task.category, (categoryCount.get(task.category) || 0) + 1);

      // Track best working hours
      const hour = new Date(task.updatedAt).getHours();
      hourlyCompletion.set(hour, (hourlyCompletion.get(hour) || 0) + 1);
    });

    let bestHour = 9;
    let maxCompletions = 0;
    hourlyCompletion.forEach((count, hour) => {
      if (count > maxCompletions) {
        maxCompletions = count;
        bestHour = hour;
      }
    });

    return {
      avgCompletionTime: Math.round(totalTime / completedTasks.length),
      preferredCategories: categoryCount,
      bestWorkingHours: bestHour,
    };
  }

  static initializeRealTimeTracking(userId: string): void {
    if (!this.trackingState.has(userId)) {
      this.trackingState.set(userId, {
        currentTaskId: null,
        startedAt: null,
        interruptions: 0,
        paused: false,
      });
    }
  }

  static startTaskTracking(userId: string, taskId: string): void {
    this.initializeRealTimeTracking(userId);
    this.trackingState.set(userId, {
      currentTaskId: taskId,
      startedAt: new Date(),
      interruptions: 0,
      paused: false,
    });
  }

  static stopTaskTracking(userId: string): { actualTime: number; focusScore: number } {
    const tracking = this.trackingState.get(userId);

    if (!tracking?.startedAt) {
      return { actualTime: 0, focusScore: 0 };
    }

    const actualTime = Math.max(0, Math.round((Date.now() - tracking.startedAt.getTime()) / 60000));
    const focusScore = Math.max(0, 1 - tracking.interruptions * 0.15);

    this.trackingState.set(userId, {
      currentTaskId: null,
      startedAt: null,
      interruptions: 0,
      paused: false,
    });

    return { actualTime, focusScore };
  }

  static pauseTaskTracking(userId: string): void {
    const tracking = this.trackingState.get(userId);
    if (tracking) {
      tracking.paused = true;
    }
  }

  static resumeTaskTracking(userId: string): void {
    const tracking = this.trackingState.get(userId);
    if (tracking) {
      tracking.paused = false;
    }
  }

  static recordInterruption(userId: string): void {
    const tracking = this.trackingState.get(userId);
    if (tracking) {
      tracking.interruptions += 1;
    }
  }

  static getCurrentTrackingTaskId(userId: string): string | null {
    return this.trackingState.get(userId)?.currentTaskId || null;
  }

  static getProductivityInsights(_userId: string, tasks: Task[]): {
    currentFocusScore: number;
    todaysProgress: number;
    weeklyTrend: number;
    recommendations: string[];
  } {
    const completedTasks = tasks.filter((task) => task.status === 'completed');
    const todaysCompleted = completedTasks.filter((task) => {
      const updatedAt = new Date(task.updatedAt);
      const now = new Date();
      return updatedAt.toDateString() === now.toDateString();
    }).length;

    return {
      currentFocusScore: completedTasks.length > 0 ? Math.min(100, 70 + completedTasks.length * 5) : 65,
      todaysProgress: todaysCompleted,
      weeklyTrend: completedTasks.length,
      recommendations: tasks.length === 0
        ? ['Add your first task to generate scheduling insights.']
        : ['Keep your task estimates accurate to improve future schedules.'],
    };
  }

  static autoAdjustSchedule(
    _tasks: Task[],
    _userId: string,
    currentSchedule: Map<string, Date>
  ): { adjustedSchedule: Map<string, Date>; adjustments: string[] } {
    return {
      adjustedSchedule: new Map(currentSchedule),
      adjustments: [],
    };
  }

  static analyzeBehaviorPatterns(_userId: string, completedTasks: Task[]): {
    avgCompletionTime: number;
    preferredCategories: Map<string, number>;
    bestWorkingHours: number;
  } {
    if (completedTasks.length === 0) {
      return {
        avgCompletionTime: 0,
        preferredCategories: new Map(),
        bestWorkingHours: 9,
      };
    }

    return this.analyzeUserPatterns(completedTasks);
  }
}
