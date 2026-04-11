import { Task } from '@/types';

export const getTaskColor = (priority: Task['priority']): string => {
  const colors = {
    low: 'bg-blue-100 text-blue-800 border-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
  };
  return colors[priority];
};

export const getPriorityBadgeColor = (priority: Task['priority']): string => {
  const colors = {
    low: 'bg-green-100 text-green-700 font-bold',
    medium: 'bg-yellow-100 text-yellow-600 font-bold',
    high: 'bg-red-100 text-red-700 font-bold',
  };
  return colors[priority];
};

export const getStatusColor = (status: Task['status']): string => {
  const colors = {
    'todo': 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'blocked': 'bg-red-100 text-red-800',
  };
  return colors[status];
};

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

export const isOverdue = (dueDate: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);
  return dueDay < today;
};

export const getDaysUntilDue = (dueDate: Date): number => {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const isToday = (date: Date | string): boolean => {
  const value = new Date(date);
  const today = new Date();
  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate()
  );
};

export const sortTasksByPriority = (tasks: Task[]): Task[] => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

export const filterTasksByStatus = (tasks: Task[], status: Task['status']): Task[] => {
  return tasks.filter((task) => task.status === status);
};

export const calculateCompletionRate = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
};
