import React from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Clock, TrendingUp, TrendingDown, Zap, AlertCircle, CheckCircle, Lock, Coffee } from 'lucide-react';

// Parse "9:00 AM" / "5:30 PM" → total minutes from midnight
const parseTimeToMins = (time: string): number => {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const confidenceColor = (pct: number) => {
  if (pct >= 75) return 'text-green-600';
  if (pct >= 50) return 'text-yellow-600';
  return 'text-red-500';
};

const formatHour = (h: number) => {
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
};

const confidenceBg = (pct: number) => {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-400';
};

interface AISchedulerPageProps {
  notEnoughDataMessage?: string | null;
}

const AISchedulerPage: React.FC<AISchedulerPageProps> = ({ notEnoughDataMessage }) => {
  const aiScheduleResult = useTaskStore((state) => state.getAIScheduleResult());

  // Not enough history — show locked state
  if (notEnoughDataMessage) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 border-2 border-amber-200">
            <Lock className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">AI Schedule Locked</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">{notEnoughDataMessage}</p>
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-2 rounded-full">
            <AlertCircle className="w-4 h-4" />
            Complete more tasks to unlock this feature
          </div>
          <p className="text-xs text-gray-400 mt-4">
            The AI needs your task history to learn your productivity patterns and generate a personalized schedule.
          </p>
        </div>
      </div>
    );
  }

  if (!aiScheduleResult) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <Zap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Schedule Generated Yet</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Click the "AI Schedule" button on the Dashboard to generate a personalized schedule based on your productivity patterns.
          </p>
        </div>
      </div>
    );
  }

  const { schedule, insights, generatedAt } = aiScheduleResult;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="tasks-page-section">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">AI Schedule</h1>
        <p className="text-gray-500 mt-2">
          Personalized schedule generated at {generatedAt.toLocaleTimeString()} based on your productivity patterns
        </p>
      </div>

      {/* 2-week scheduling limit notice */}
      <div className="tasks-page-section bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Scheduling limit: 2 weeks.</span> Only tasks due within the next 14 days (plus overdue tasks) are included in this schedule. Tasks with due dates beyond 2 weeks will not appear here — regenerate the schedule closer to their due date.
        </div>
      </div>

      {/* Insights */}
      {insights.totalRecords > 0 ? (
        <div className="tasks-page-section bg-indigo-50 border border-indigo-100 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold">
            <Zap className="w-5 h-5" />
            Analysis from {insights.totalRecords} historical task records • {insights.overallSuccessRate}% overall success rate
          </div>
          <div className="flex flex-wrap gap-8 justify-between">
            <div className="w-fit ml-8">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                <TrendingUp className="w-4 h-4" />
                Best Productivity Hours
              </div>
              <div className="space-y-2">
                {insights.bestHours.map(({ hour, rate }) => (
                  <div key={hour} className="flex items-center gap-4">
                    <span className="text-gray-700">{formatHour(hour)} – {formatHour(hour + 1)}</span>
                    <span className="font-semibold text-green-600">{rate}% success</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-fit mr-8">
              <div className="flex items-center gap-2 text-red-600 font-semibold mb-3">
                <TrendingDown className="w-4 h-4" />
                Lowest Productivity Hours
              </div>
              <div className="space-y-2">
                {insights.worstHours.map(({ hour, rate }) => (
                  <div key={hour} className="flex items-center gap-4">
                    <span className="text-gray-700">{formatHour(hour)} – {formatHour(hour + 1)}</span>
                    <span className="font-semibold text-red-500">{rate}% success</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="tasks-page-section bg-yellow-50 border border-yellow-100 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900">Build Your History</h3>
            <p className="text-sm text-yellow-800 mt-1">
              Complete tasks over time so the AI can learn your productivity patterns and personalize recommendations.
            </p>
          </div>
        </div>
      )}

      {/* Schedule List */}
      <div className="tasks-page-section">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your AI Schedule</h2>
        {schedule.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="text-gray-500 font-medium">No tasks to schedule.</p>
            <p className="text-sm text-gray-400 mt-1">All your tasks are completed, or you have no active tasks. Create a new task to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const today = new Date(); today.setHours(0,0,0,0);
              let lastDateKey = '';
              return schedule.map((item, idx) => {
                const dayKey = item.scheduledDate.toDateString();
                const showHeader = dayKey !== lastDateKey;
                lastDateKey = dayKey;
                const isToday = item.scheduledDate.toDateString() === today.toDateString();
                const dateLabel = isToday
                  ? 'Today'
                  : item.scheduledDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
                return (
                  <div key={item.task.id}>
                    {showHeader && (
                      <div className="text-sm font-semibold text-indigo-600 uppercase tracking-wider pt-2 pb-1 border-b border-indigo-100">
                        {dateLabel}
                      </div>
                    )}
                    {/* Break indicator between consecutive tasks on the same day */}
                    {!showHeader && (() => {
                      const prev = schedule[idx - 1];
                      if (prev.scheduledDate.toDateString() !== item.scheduledDate.toDateString()) return null;
                      const breakMins = parseTimeToMins(item.startTime) - parseTimeToMins(prev.endTime);
                      if (breakMins > 0) {
                        return (
                          <div className="flex items-center gap-2 py-1 px-3 text-xs text-gray-400">
                            <Coffee className="w-3 h-3 text-amber-400" />
                            <span>{breakMins} min break</span>
                            <div className="flex-1 border-t border-dashed border-gray-200" />
                          </div>
                        );
                      }
                      // Back-to-back: no break gap
                      return (
                        <div className="flex items-center gap-2 py-1 px-3 text-xs text-gray-400">
                          <div className="w-3 h-3 rounded-full bg-orange-300 shrink-0" />
                          <span className="text-orange-400">No break — back to back</span>
                          <div className="flex-1 border-t border-dashed border-orange-100" />
                        </div>
                      );
                    })()}
                    <div className="border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                              {idx + 1}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{item.task.title}</h3>
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                                PRIORITY_COLORS[item.task.priority] ?? ''
                              }`}
                            >
                              Priority: {item.task.priority.charAt(0).toUpperCase() + item.task.priority.slice(1)}
                            </span>
                          </div>

                          {item.task.description && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.task.description}</p>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{item.startTime} – {item.endTime}</span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <span>{item.durationMins} min</span>
                          </div>

                          <p className="text-xs text-gray-400 mt-2">{item.reason}</p>
                        </div>

                        {/* Confidence Badge */}
                        <div className="flex flex-col items-end gap-2">
                          <div className={`text-2xl font-bold ${confidenceColor(item.confidence)}`}>
                            {item.confidence}%
                          </div>
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${confidenceBg(item.confidence)}`}
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400">confidence</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="tasks-page-section bg-blue-50 border border-blue-100 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">💡 Tips for Success</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ Follow the recommended time slots to maximize productivity</li>
          <li>✓ Mark tasks as completed as you finish them to improve AI accuracy</li>
          <li>✓ The more task history you build, the better the recommendations become</li>
          <li>✓ Generate a new schedule regularly to adapt to changing patterns</li>
        </ul>
      </div>
    </div>
  );
};

export default AISchedulerPage;
