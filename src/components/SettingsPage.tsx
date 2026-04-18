import React, { useState } from 'react';
import { Clock3, Heart, Save, CheckCircle2 } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { AIScheduleSettings } from '@/types';

const SettingsPage: React.FC = () => {
  const { scheduleSettings, setScheduleSettings } = useTaskStore();
  const [saved, setSaved] = useState(false);

  const [workStart, setWorkStart] = useState(scheduleSettings.workStart);
  const [workEnd, setWorkEnd] = useState(scheduleSettings.workEnd);
  const [peakStart, setPeakStart] = useState(scheduleSettings.peakStart);
  const [peakEnd, setPeakEnd] = useState(scheduleSettings.peakEnd);
  const [stressLevel, setStressLevel] = useState<AIScheduleSettings['stressLevel']>(scheduleSettings.stressLevel);
  const [schedulingStyle, setSchedulingStyle] = useState<AIScheduleSettings['schedulingStyle']>(scheduleSettings.schedulingStyle);

  // Helper function to convert 24-hour format to 12-hour format with AM/PM
  const formatTime12Hour = (hour: number): string => {
    const period = hour < 12 ? 'AM' : 'PM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:00 ${period}`;
  };

  const handleSave = () => {
    setScheduleSettings({ workStart, workEnd, peakStart, peakEnd, taskBlock: 45, breakMinutes: 15, stressLevel, schedulingStyle });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="tasks-page-enter space-y-6">
      <div className="tasks-page-section">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-lg text-slate-500">Configure your preferences for AI scheduling</p>
      </div>

      <section className="task-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: '180ms' }}>
        <div className="mb-5 flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-blue-500" />
          <h2 className="text-3xl font-bold text-slate-900">Work Schedule</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Work Start: {formatTime12Hour(workStart)}</span>
            <input
              type="range"
              min={0}
              max={23}
              value={workStart}
              onChange={(event) => setWorkStart(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Work End: {formatTime12Hour(workEnd)}</span>
            <input
              type="range"
              min={0}
              max={23}
              value={workEnd}
              onChange={(event) => setWorkEnd(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Peak Start: {formatTime12Hour(peakStart)}</span>
            <input
              type="range"
              min={0}
              max={23}
              value={peakStart}
              onChange={(event) => setPeakStart(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Peak End: {formatTime12Hour(peakEnd)}</span>
            <input
              type="range"
              min={0}
              max={23}
              value={peakEnd}
              onChange={(event) => setPeakEnd(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </div>
      </section>

      <section className="task-card-enter rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: '320ms' }}>
        <div className="mb-5 flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          <h2 className="text-3xl font-bold text-slate-900">Wellbeing & AI Behavior</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stress Level</span>
            <select
              value={stressLevel}
              onChange={(event) => setStressLevel(event.target.value as 'Low' | 'Moderate' | 'High')}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-700"
            >
              <option>Low</option>
              <option>Moderate</option>
              <option>High</option>
            </select>
            <p className="mt-2 text-sm text-slate-400">High stress = AI schedules lighter workloads</p>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduling Style</span>
            <select
              value={schedulingStyle}
              onChange={(event) => setSchedulingStyle(event.target.value as 'Balanced' | 'Focused' | 'Flexible')}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-700"
            >
              <option>Balanced</option>
              <option>Focused</option>
              <option>Flexible</option>
            </select>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              {schedulingStyle === 'Balanced' && '📊 Use your best productivity hours within your work window. Great balance between focus and flexibility.'}
              {schedulingStyle === 'Focused' && '🎯 Schedule tasks only during your peak productivity hours. Perfect for deep work and high-priority tasks.'}
              {schedulingStyle === 'Flexible' && '🔄 Distribute tasks across all available work hours. Maximum flexibility with fewer time constraints.'}
            </p>
            {schedulingStyle === 'Focused' && (peakStart < workStart || peakEnd > workEnd) && (
              <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-sm text-amber-800">
                ⚠️ <strong>Warning:</strong> Peak hours must be within your work schedule. Currently, peak hours ({formatTime12Hour(peakStart)} - {formatTime12Hour(peakEnd)}) extend outside your work window ({formatTime12Hour(workStart)} - {formatTime12Hour(workEnd)}).
              </p>
            )}
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-lg font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
      >
        {saved ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Preferences Saved!
          </>
        ) : (
          <>
            <Save className="h-5 w-5" />
            Save Preferences
          </>
        )}
      </button>
    </div>
  );
};

export default SettingsPage;
