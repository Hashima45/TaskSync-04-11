import React from 'react';
import { Sparkles, ListTodo } from 'lucide-react';

interface HeaderProps {
  onScheduleClick?: () => void;
  onAllTasksClick?: () => void;
  userName?: string;
  schedulingLoading?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onScheduleClick, onAllTasksClick, userName, schedulingLoading }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = userName || 'User';

  return (
    <header className="tasks-page-section bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">{greeting}, {displayName}. Your AI-powered task overview.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onScheduleClick}
              disabled={schedulingLoading}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {schedulingLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  AI Schedule
                </>
              )}
            </button>
            <button
              onClick={onAllTasksClick}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-2 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ListTodo className="w-5 h-5" />
              All Tasks
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
