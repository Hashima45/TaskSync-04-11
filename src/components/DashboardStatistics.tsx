import React from 'react';
import { DashboardStats } from '@/types';
import { CheckCircle, Clock, AlertCircle, ListTodo } from 'lucide-react';

type FilterType = 'all' | 'todo' | 'in-progress' | 'completed' | 'overdue';

interface DashboardStatsProps {
  stats: DashboardStats;
  pendingTasks?: number;
  onFilterChange?: (filter: FilterType) => void;
}

const DashboardStatistics: React.FC<DashboardStatsProps> = ({ stats, pendingTasks = 0, onFilterChange }) => {
  const completionRatePercent = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  
  const statCards: Array<{
    label: string;
    value: number;
    subtext: string;
    icon: typeof ListTodo;
    bgColor: string;
    iconBg: string;
    filter: FilterType;
  }> = [
    {
      label: 'TOTAL TASKS',
      value: stats.totalTasks,
      subtext: `${pendingTasks} pending`,
      icon: ListTodo,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-500 text-white',
      filter: 'all',
    },
    {
      label: 'IN PROGRESS',
      value: stats.inProgressTasks,
      subtext: 'Active now',
      icon: Clock,
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-500 text-white',
      filter: 'in-progress',
    },
    {
      label: 'COMPLETED',
      value: stats.completedTasks,
      subtext: `${completionRatePercent}% rate`,
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-500 text-white',
      filter: 'completed',
    },
    {
      label: 'OVERDUE',
      value: stats.overdueTasks,
      subtext: 'Needs attention',
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-500 text-white',
      filter: 'overdue',
    },
  ];

  return (
    <div className="tasks-page-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onFilterChange?.(card.filter)}
            className={`task-card-enter ${card.bgColor} rounded-2xl p-6 flex items-start justify-between transition-transform hover:scale-105 hover:shadow-md cursor-pointer text-left`}
            style={{ animationDelay: `${180 + index * 70}ms` }}
          >
            <div>
              <p className="text-gray-600 text-xs font-semibold tracking-wider">{card.label}</p>
              <p className="text-4xl font-bold text-gray-900 mt-3 mb-2">{card.value}</p>
              <p className="text-gray-500 text-sm">{card.subtext}</p>
            </div>
            <div className={`${card.iconBg} rounded-lg p-3`}>
              <Icon className="w-6 h-6" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DashboardStatistics;
