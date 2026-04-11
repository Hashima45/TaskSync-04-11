import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, StopCircle } from 'lucide-react';
import { Task } from '@/types';
import { AITaskService } from '@/services/AITaskService';

interface TaskTimerProps {
  task: Task;
  userId: string;
  onTrackingComplete: (actualTime: number, focusScore: number) => void;
}

const TaskTimer: React.FC<TaskTimerProps> = ({ task, userId, onTrackingComplete }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTracking && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleStart = () => {
    AITaskService.startTaskTracking(userId, task.id);
    setIsTracking(true);
    setElapsedSeconds(0);
    setInterruptions(0);
  };

  const handlePause = () => {
    AITaskService.pauseTaskTracking(userId);
    setIsPaused(true);
  };

  const handleResume = () => {
    AITaskService.resumeTaskTracking(userId);
    setIsPaused(false);
    // Increment interruption count
    setInterruptions(prev => prev + 1);
  };

  const handleStop = () => {
    const result = AITaskService.stopTaskTracking(userId);
    setIsTracking(false);
    setIsPaused(false);
    onTrackingComplete(result.actualTime, result.focusScore);
    setElapsedSeconds(0);
    setInterruptions(0);
  };

  const handleReset = () => {
    setIsTracking(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setInterruptions(0);
  };

  // Calculate focus score
  const focusScore = Math.max(0, 1 - interruptions * 0.15);
  const focusPercentage = Math.round(focusScore * 100);

  return (
    <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="text-2xl font-bold font-mono text-indigo-600">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Est. Time: {task.estimatedTime}m
            {task.estimatedTime && elapsedSeconds > 0 && (
              <span className={elapsedSeconds / 60 > task.estimatedTime ? ' text-red-600' : ' text-green-600'}>
                {' '}
                ({elapsedSeconds / 60 > task.estimatedTime ? 'Over' : 'Under'} estimate)
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-700">Focus Score</div>
          <div className="text-2xl font-bold text-indigo-600">{focusPercentage}%</div>
          <div className="text-xs text-gray-600">
            Interruptions: {interruptions}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {!isTracking ? (
          <button
            onClick={handleStart}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        ) : (
          <>
            {!isPaused ? (
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            <button
              onClick={handleStop}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Stop
            </button>
          </>
        )}
        {isTracking && (
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-colors"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskTimer;
