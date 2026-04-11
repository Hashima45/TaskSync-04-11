import React, { useState } from 'react';
import { CalendarDays, Pin, ChevronDown } from 'lucide-react';
import { Task } from '@/types';

interface UpcomingEventsProps {
  tasks: Task[];
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ tasks }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed' && new Date(t.dueDate) >= today)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  const formatGroupHeader = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const groupedByDate = upcomingTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = new Date(task.dueDate).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const toggleGroup = (dateKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  if (upcomingTasks.length === 0) {
    return (
      <div className="task-card-enter rounded-3xl border border-gray-200 bg-white p-5 text-center" style={{ animationDelay: '350ms' }}>
        <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="font-semibold text-gray-500">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="task-card-enter rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 flex flex-col" style={{ animationDelay: '350ms' }}>
      <div className="mb-3 flex items-center gap-2.5">
        <CalendarDays className="h-5 w-5 text-red-500" />
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Upcoming</h2>
      </div>

      <div className="space-y-2 flex-1">
        {Object.entries(groupedByDate).map(([dateKey, dateTasks]) => {
          const isExpanded = expandedGroups.has(dateKey);
          const hasMoreTasks = dateTasks.length >= 3;
          const visibleTasks = isExpanded ? dateTasks : dateTasks.slice(0, 1);

          return (
            <div key={dateKey} className="space-y-1">
              <div className="mb-1.5 rounded-md bg-slate-100 px-3 py-0.5">
                <p className="text-xs font-semibold text-slate-500">{formatGroupHeader(new Date(dateKey))}</p>
              </div>
              <div className="space-y-1.5">
                {visibleTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2.5 px-1">
                    <Pin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                    </div>
                  </div>
                ))}
                {hasMoreTasks && (
                  <button
                    onClick={() => toggleGroup(dateKey)}
                    className="mt-1.5 w-full flex items-center justify-center gap-1 rounded-md bg-slate-200 px-3 py-0.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    {isExpanded ? 'Show less' : `${dateTasks.length - 1} more`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingEvents;

