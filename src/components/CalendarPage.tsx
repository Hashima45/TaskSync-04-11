import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '@/types';

interface CalendarPageProps {
  tasks: Task[];
}

const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const priorityDotColor: Record<Task['priority'], string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const CalendarPage: React.FC<CalendarPageProps> = ({ tasks }) => {
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
  const [jumpMonth, setJumpMonth] = useState(today.getMonth());
  const [jumpYear, setJumpYear] = useState(today.getFullYear());

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear();
    const years: number[] = [];

    for (let year = currentYear; year <= currentYear + 20; year += 1) {
      years.push(year);
    }

    return years;
  }, [today]);

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, Task[]>();

    tasks
      .filter((task) => task.status !== 'completed')
      .forEach((task) => {
        const due = new Date(task.dueDate);
        const key = toDateKey(due);
        const existing = grouped.get(key) || [];
        grouped.set(key, [...existing, task]);
      });

    grouped.forEach((dayTasks, key) => {
      grouped.set(
        key,
        [...dayTasks].sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
      );
    });

    return grouped;
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
    const daysInCurrentMonth = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + 1,
      0
    ).getDate();
    const daysInPreviousMonth = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
      0
    ).getDate();
    const startDayIndex = firstDayOfMonth.getDay();

    const cells: { date: Date; inCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDayIndex; i += 1) {
      const day = daysInPreviousMonth - startDayIndex + i + 1;
      cells.push({
        date: new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, day),
        inCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInCurrentMonth; day += 1) {
      cells.push({
        date: new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day),
        inCurrentMonth: true,
      });
    }

    while (cells.length < 42) {
      const day = cells.length - (startDayIndex + daysInCurrentMonth) + 1;
      cells.push({
        date: new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, day),
        inCurrentMonth: false,
      });
    }

    return cells;
  }, [displayMonth]);

  const selectedTasks = useMemo(() => {
    return tasks.filter(
      (task) => task.status !== 'completed' && isSameDay(new Date(task.dueDate), selectedDate)
    );
  }, [tasks, selectedDate]);

  const openMonthYearPicker = () => {
    setJumpMonth(displayMonth.getMonth());
    setJumpYear(displayMonth.getFullYear());
    setIsMonthYearPickerOpen(true);
  };

  const applyMonthYearSelection = () => {
    setDisplayMonth(new Date(jumpYear, jumpMonth, 1));
    setIsMonthYearPickerOpen(false);
  };

  return (
    <div className="tasks-page-enter space-y-6">
      <div className="tasks-page-section">
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Calendar</h1>
        <p className="mt-1 text-lg text-slate-500">View your scheduled and due tasks</p>
      </div>

      <div className="tasks-page-section grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="task-card-enter rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm" style={{ animationDelay: '180ms' }}>
          <div className="relative mb-5 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                setDisplayMonth(
                  new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1)
                );
              }}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (isMonthYearPickerOpen) {
                    setIsMonthYearPickerOpen(false);
                  } else {
                    openMonthYearPicker();
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-3xl font-bold text-slate-900 hover:bg-slate-100"
                aria-label="Open month and year picker"
              >
                {displayMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
                <ChevronDown className="h-5 w-5 text-slate-500" />
              </button>

              {isMonthYearPickerOpen && (
                <div className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold text-slate-500">
                      Month
                      <select
                        value={jumpMonth}
                        onChange={(event) => setJumpMonth(Number(event.target.value))}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                      >
                        {monthNames.map((month, index) => (
                          <option key={month} value={index}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-slate-500">
                      Year
                      <select
                        value={jumpYear}
                        onChange={(event) => setJumpYear(Number(event.target.value))}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMonthYearPickerOpen(false)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyMonthYearSelection}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Go
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setDisplayMonth(
                  new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1)
                );
              }}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {weekDays.map((day) => (
              <div key={day} className="py-1 text-xs font-semibold tracking-wider text-slate-400">
                {day}
              </div>
            ))}

            {calendarDays.map(({ date, inCurrentMonth }) => {
              const dayKey = toDateKey(date);
              const dayTasks = tasksByDay.get(dayKey) || [];
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);

              return (
                <button
                  type="button"
                  key={dayKey}
                  onClick={() => setSelectedDate(date)}
                  className={`h-24 rounded-xl border p-2 text-left transition-colors sm:h-28 ${
                    isSelected
                      ? 'border-slate-400 bg-slate-100 shadow-sm'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  } ${!inCurrentMonth ? 'text-slate-300' : 'text-slate-900'}`}
                >
                  <div
                    className={`text-base font-semibold ${
                      isToday && !isSelected ? 'text-indigo-600' : ''
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  {dayTasks.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className={`h-2 w-2 rounded-full ${priorityDotColor[task.priority]}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="task-card-enter h-fit rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm" style={{ animationDelay: '280ms' }}>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" />
            <h3 className="text-2xl font-bold text-slate-900">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </h3>
          </div>

          <div className="space-y-3">
            {selectedTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No tasks scheduled for this day.
              </div>
            )}

            {selectedTasks.map((task, index) => (
              <div key={task.id} className="task-card-enter rounded-xl border border-slate-200 bg-slate-50 p-3" style={{ animationDelay: `${340 + index * 65}ms` }}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${priorityDotColor[task.priority]}`} />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-700">
                      <span className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5">
                        Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <span className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5">
                        {task.category.toLowerCase() || 'general'}
                      </span>
                      <span className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5">
                        {task.estimatedTime}m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CalendarPage;
