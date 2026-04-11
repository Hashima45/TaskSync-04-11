import React, { useState } from 'react';
import { Task } from '@/types';
import { formatDate, isOverdue, getPriorityBadgeColor, getStatusColor } from '@/utils/taskUtils';
import { Trash2, Edit2, Clock, Calendar } from 'lucide-react';
import TaskTimer from './TaskTimer';

interface TaskCardProps {
  task: Task;
  userId: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onTrackingComplete?: (taskId: string, actualTime: number, focusScore: number) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, userId, onEdit, onDelete, onStatusChange, onTrackingComplete }) => {
  const overdue = isOverdue(task.dueDate);
  const [showTimer, setShowTimer] = useState(false);

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return null;
    }
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${
      overdue ? 'border-l-red-500 bg-red-50' : 'border-l-indigo-500'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
          )}
          {task.aiRecommendation && (
            <p className="text-xs text-blue-600 mt-1 italic">AI: {task.aiRecommendation}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(task)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2 ${getPriorityBadgeColor(task.priority)}`}>
          {getPriorityIcon(task.priority)}
          Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
          {task.status.replace('-', ' ').toUpperCase()}
        </span>
        {task.tags.map((tag) => (
          <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
            {tag}
          </span>
        ))}
      </div>
      
      <p className="text-xs text-gray-500 mb-3">
        ℹ️ Priority calculated from Urgency + Importance
      </p>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex gap-4">
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
            <Calendar className="w-4 h-4" />
            {formatDate(task.dueDate)}
          </span>
          {task.estimatedTime && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              title="Mark as Done"
              className={`flex items-center gap-1 transition-colors ${
                task.status === 'completed'
                  ? 'text-green-600 font-semibold'
                  : 'text-orange-500 hover:text-green-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              {task.status === 'completed' ? 'Done' : `${task.estimatedTime}m`}
            </button>
          )}
          {task.actualTime > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <Clock className="w-4 h-4" />
              {task.actualTime}m actual
            </span>
          )}
        </div>
      </div>

      {showTimer && task.status !== 'completed' && (
        <TaskTimer
          task={task}
          userId={userId}
          onTrackingComplete={(actualTime, focusScore) => {
            onTrackingComplete?.(task.id, actualTime, focusScore);
            setShowTimer(false);
          }}
        />
      )}

      {task.status !== 'completed' && !showTimer && (
        <button
          onClick={() => setShowTimer(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-2 px-3 rounded-lg transition-colors"
        >
          <Clock className="w-4 h-4" />
          Start Tracking
        </button>
      )}
    </div>
  );
};

export default TaskCard;
