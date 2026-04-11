import React from 'react';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { Task } from '@/types';
import { isToday } from '@/utils/taskUtils';

interface TaskTimelineProps {
  tasks: Task[];
  onViewAllClick?: () => void;
  onStatusChange?: (id: string, status: Task['status']) => void;
}

const priorityDotColor: Record<Task['priority'], string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const TaskTimeline: React.FC<TaskTimelineProps> = ({ tasks, onViewAllClick }) => {
  const scheduleTasks = tasks
    .filter(t => t.status !== 'completed' && isToday(t.dueDate))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  if (scheduleTasks.length === 0) {
    return (
      <div className="task-card-enter bg-white rounded-3xl border border-gray-200 p-6 text-center" style={{ animationDelay: '250ms' }}>
        <CalendarDays className="mx-auto mb-3 h-10 w-10 text-indigo-300" />
        <p className="font-semibold text-gray-700">No tasks in today&apos;s schedule</p>
      </div>
    );
  }

  return (
    <div className="task-card-enter rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 h-full" style={{ animationDelay: '250ms' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-indigo-500" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Today&apos;s Schedule</h2>
        </div>
        <button
          type="button"
          onClick={onViewAllClick}
          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {scheduleTasks.map((task, index) => (
          <div
            key={task.id}
            className="task-card-enter flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 sm:px-4"
            style={{ animationDelay: `${320 + index * 65}ms` }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${priorityDotColor[task.priority]}`}
                />
                <p className="truncate text-lg font-semibold text-slate-900">{task.title}</p>
              </div>
              <p className="mt-0.5 pl-5 text-sm text-slate-500">
                {task.category.toLowerCase() || 'general'} · {task.estimatedTime}m
              </p>
            </div>
            {/* Start/Complete button removed as requested */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskTimeline;
