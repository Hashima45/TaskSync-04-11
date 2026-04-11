export interface AIScheduleSettings {
  workStart: number;       // hour 0-23
  workEnd: number;         // hour 0-23
  peakStart: number;       // hour 0-23
  peakEnd: number;         // hour 0-23
  taskBlock: number;       // default task duration in minutes (used when estimatedTime is 0)
  breakMinutes: number;    // not used (kept for compatibility) — AI uses fixed breaks based on stressLevel
  stressLevel: 'Low' | 'Moderate' | 'High';
  schedulingStyle: 'Balanced' | 'Focused' | 'Flexible';
}

export const DEFAULT_SCHEDULE_SETTINGS: AIScheduleSettings = {
  workStart: 8,
  workEnd: 18,
  peakStart: 9,
  peakEnd: 12,
  taskBlock: 45,
  breakMinutes: 15,  // not used — AI uses fixed breaks: Low=10min, Moderate=20min, High=35min
  stressLevel: 'Moderate',
  schedulingStyle: 'Balanced',
};

export interface Task {
  id: string;
  title: string;
  description: string;
  createdByUid?: string;
  createdByName?: string;
  createdByEmail?: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed' | 'blocked';
  category: string;
  categoryId?: string;
  tags: string[];
  urgency?: number; // 0-10 scale for AI scheduling
  importance?: number; // 0-10 scale for AI scheduling
  estimatedTime: number; // in minutes
  actualTime: number; // in minutes
  aiRecommendation?: string;
  subtasks: Subtask[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Soft delete timestamp - task hidden but data preserved
}

export interface TaskCategory {
  category_id: string;
  name: string;
  color: string;
}

export interface TaskSchedule {
  schedule_id: string;
  task_id: string;
  start_at: Date;
  end_at: Date;
  scheduled_by: string;
  created_at: Date;
}

export interface TaskLog {
  log_id: string;
  task_id: string;
  event_type: 'created' | 'status_changed' | 'updated' | 'deleted' | 'priority_changed';
  event_at: Date;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface AIRecommendation {
  taskId: string;
  reason: string;
  confidence: number;
  suggestedPriority: Task['priority'];
  estimatedDuration: number;
  bestTimeToStart: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    workingHours: { start: number; end: number };
    breakDuration: number;
  };
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface PriorityScore {
  score_id?: string; // Firestore document ID (auto-generated)
  task_id: string; // FK reference to task
  score: number; // Priority score (0-100)
  priority_distribution: string; // JSON string representation of priority breakdown
  computed_at: Date; // When the score was calculated
}
