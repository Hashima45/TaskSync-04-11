import React from 'react';
import { Task } from '@/types';
import TaskCard from './TaskCard';
import { Filter } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  userId: string;
  filter: 'all' | 'todo' | 'in-progress' | 'completed' | 'blocked';
  onFilterChange: (filter: 'all' | 'todo' | 'in-progress' | 'completed' | 'blocked') => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onTrackingComplete?: (taskId: string, actualTime: number, focusScore: number) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  userId,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  onStatusChange,
  onTrackingComplete,
}) => {
  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const filterOptions: Array<{ value: 'all' | 'todo' | 'in-progress' | 'completed' | 'blocked'; label: string }> = [
    { value: 'all', label: 'All Tasks' },
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'Blocked' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-4 mb-6">
        <Filter className="w-5 h-5 text-gray-600" />
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg font-medium">No tasks found</p>
          <p className="text-gray-400 text-sm mt-2">
            {filter === 'all' ? 'Create a new task to get started' : `No ${filter} tasks`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userId={userId}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onTrackingComplete={onTrackingComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
