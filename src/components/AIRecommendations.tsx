import React from 'react';
import { AIRecommendation } from '@/types';
import { Lightbulb, TrendingUp, Clock } from 'lucide-react';
import { formatDate } from '@/utils/taskUtils';

interface AIRecommendationsProps {
  recommendations: AIRecommendation[];
  onApplyRecommendation: (recommendation: AIRecommendation) => void;
}

const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  recommendations,
  onApplyRecommendation,
}) => {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-sm p-6 border border-yellow-200">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-bold text-gray-800">AI Recommendations</h2>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.taskId}
            className="bg-white rounded-lg p-4 border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                    <TrendingUp className="w-3 h-3" />
                    {Math.round(rec.confidence * 100)}% confidence
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                    {rec.suggestedPriority.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-700 font-medium">{rec.reason}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {rec.estimatedDuration}m estimated
                  </span>
                  <span>Best start: {formatDate(rec.bestTimeToStart)}</span>
                </div>
              </div>
              <button
                onClick={() => onApplyRecommendation(rec)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIRecommendations;
