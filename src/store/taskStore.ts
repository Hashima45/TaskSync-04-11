import { create } from 'zustand';
import { Task, UserProfile, AIScheduleSettings, DEFAULT_SCHEDULE_SETTINGS } from '@/types';
import { AIScheduleResult } from '@/services/AIScheduleService';

const SETTINGS_STORAGE_KEY = 'tasksync_ai_schedule_settings';

function loadSettings(): AIScheduleSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SCHEDULE_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SCHEDULE_SETTINGS;
}

interface TaskStore {
  tasks: Task[];
  user: UserProfile | null;
  currentSchedule: Map<string, Date>;
  aiScheduleResult: AIScheduleResult | null;
  scheduleSettings: AIScheduleSettings;
  
  // Task actions
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  clearTasks: () => void;
  getTasks: () => Task[];
  getTaskById: (id: string) => Task | undefined;
  
  // Schedule
  setCurrentSchedule: (schedule: Map<string, Date>) => void;
  getSchedule: () => Map<string, Date>;
  
  // AI Schedule
  setAIScheduleResult: (result: AIScheduleResult | null) => void;
  getAIScheduleResult: () => AIScheduleResult | null;
  
  // Settings
  setScheduleSettings: (settings: AIScheduleSettings) => void;
  
  // User
  setUser: (user: UserProfile) => void;
  getUser: () => UserProfile | null;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  user: null,
  currentSchedule: new Map(),
  aiScheduleResult: null,
  scheduleSettings: loadSettings(),

  addTask: (task: Task) => {
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: task.id || generateId() }],
    }));
  },

  updateTask: (id: string, updates: Partial<Task>) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
      ),
    }));
  },

  deleteTask: (id: string) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },

  setTasks: (tasks: Task[]) => {
    set({ tasks });
  },

  clearTasks: () => {
    set({ tasks: [], currentSchedule: new Map() });
  },

  getTasks: () => get().tasks,

  getTaskById: (id: string) => {
    return get().tasks.find((task) => task.id === id);
  },

  setCurrentSchedule: (schedule: Map<string, Date>) => {
    set({ currentSchedule: schedule });
  },

  getSchedule: () => get().currentSchedule,

  setAIScheduleResult: (result: AIScheduleResult | null) => {
    set({ aiScheduleResult: result });
  },

  getAIScheduleResult: () => get().aiScheduleResult,

  setScheduleSettings: (settings: AIScheduleSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
    set({ scheduleSettings: settings });
  },

  setUser: (user: UserProfile) => {
    set({ user });
  },

  getUser: () => get().user,
}));
