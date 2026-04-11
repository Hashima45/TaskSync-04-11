import React from 'react';
import { Task } from '@/types';
import { Target, TrendingUp, Clock3, CalendarCheck2 } from 'lucide-react';

interface AnalyticsPageProps {
  tasks: Task[];
}

// Helper function to safely get priority with fallback
const getPriority = (task: Task): 'low' | 'medium' | 'high' => {
  if (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high') {
    return task.priority;
  }
  return 'medium'; // Default fallback
};

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ tasks }) => {
  const predefinedCategories = ['Work', 'Personal', 'Health', 'Academics', 'Other'];
  
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  // const completedTaskItems = tasks.filter((task) => task.status === 'completed');
  const pendingTasks = tasks.filter((task) => task.status !== 'completed').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;



  const priorityCounts = {
    critical: tasks.filter((task) => getPriority(task) === 'high').length,
    high: tasks.filter((task) => getPriority(task) === 'high').length,
    medium: tasks.filter((task) => getPriority(task) === 'medium').length,
    low: tasks.filter((task) => getPriority(task) === 'low').length,
  };

  const priorityRows = [
    {
      key: 'high',
      label: 'High',
      count: priorityCounts.high,
      barColor: 'bg-red-500',
    },
    {
      key: 'medium',
      label: 'Medium',
      count: priorityCounts.medium,
      barColor: 'bg-yellow-400',
    },
    {
      key: 'low',
      label: 'Low',
      count: priorityCounts.low,
      barColor: 'bg-green-500',
    },
  ];

  const maxPriorityCount = Math.max(...priorityRows.map((row) => row.count), 1);

  const categoryCounts = predefinedCategories.reduce<Record<string, number>>((acc, category) => {
    if (category === 'Other') {
      // Count tasks with no category or "Other" category, PLUS any uncategorized tasks
      acc[category] = tasks.filter((task) => {
        const taskCat = task.category?.trim();
        return !taskCat || taskCat === 'Other' || !predefinedCategories.includes(taskCat);
      }).length;
    } else {
      acc[category] = tasks.filter((task) => task.category?.trim() === category).length;
    }
    return acc;
  }, {});

  const categoryRows = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      // Sort according to predefinedCategories order
      return predefinedCategories.indexOf(a.name) - predefinedCategories.indexOf(b.name);
    });

  // Order matches predefinedCategories: Work, Personal, Health, Academics, Other

  const categoryColorMap: Record<string, string> = {
    'Work': '#3B82F6',
    'Personal': '#8B5CF6',
    'Health': '#22C55E',
    'Academics': '#EAB308',
    'Other': '#9CA3AF',
  };
  const categoryRowsWithColor = categoryRows.map((row) => ({
    ...row,
    color: categoryColorMap[row.name] || '#9CA3AF',
  }));

  const totalCategoryCount = categoryRowsWithColor.reduce((sum, row) => sum + row.count, 0);
  const donutStops: string[] = [];
  let runningPercent = 0;

  categoryRowsWithColor.forEach((row) => {
    const slice = totalCategoryCount > 0 ? (row.count / totalCategoryCount) * 100 : 0;
    const start = runningPercent;
    const end = runningPercent + slice;
    donutStops.push(`${row.color} ${start}% ${end}%`);
    runningPercent = end;
  });

  const donutBackground =
    donutStops.length > 0 ? `conic-gradient(${donutStops.join(', ')})` : 'conic-gradient(#E2E8F0 0% 100%)';

  // Calculate priority distribution by category
  const priorityByCategory = predefinedCategories.reduce<
    Record<string, Record<'low' | 'medium' | 'high', number>>
  >((acc, category) => {
    if (category === 'Other') {
      // Count priority tasks with no category, "Other" category, or unrecognized categories
      const otherTasks = tasks.filter((t) => {
        const taskCat = t.category?.trim();
        return !taskCat || taskCat === 'Other' || !predefinedCategories.includes(taskCat);
      });
      acc[category] = {
        low: otherTasks.filter((t) => getPriority(t) === 'low').length,
        medium: otherTasks.filter((t) => getPriority(t) === 'medium').length,
        high: otherTasks.filter((t) => getPriority(t) === 'high').length,
      };
    } else {
      acc[category] = {
        low: tasks.filter((t) => t.category?.trim() === category && getPriority(t) === 'low').length,
        medium: tasks.filter((t) => t.category?.trim() === category && getPriority(t) === 'medium').length,
        high: tasks.filter((t) => t.category?.trim() === category && getPriority(t) === 'high').length,
      };
    }
    return acc;
  }, {});

  const statCards = [
    {
      label: 'Total Tasks',
      value: tasks.length,
      icon: TrendingUp,
      iconWrap: 'bg-violet-500',
    },
    {
      label: 'Pending',
      value: pendingTasks,
      icon: Clock3,
      iconWrap: 'bg-amber-500',
    },
    {
      label: 'Completed',
      value: completedTasks,
      icon: CalendarCheck2,
      iconWrap: 'bg-sky-500',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: Target,
      iconWrap: 'bg-emerald-500',
    },
  ];

  return (
    <div className="tasks-page-enter space-y-6">
      {/* Header */}
      <div className="tasks-page-section">
<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Analytics</h1>
<p className="mt-1 text-base sm:text-lg text-slate-500">Insights into your productivity patterns</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="task-card-enter rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`${card.iconWrap} rounded-xl p-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none text-slate-900">{card.value}</p>
                  <p className="mt-1 text-lg text-slate-600">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 md:p-6 lg:p-7">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Priority Distribution</h2>

        <div className="mt-5 space-y-3">
          {priorityRows.map((row) => {
            const width = row.count > 0 ? Math.max((row.count / maxPriorityCount) * 100, 5) : 0;

            return (
              <div key={row.key} className="grid grid-cols-[110px_1fr_24px] items-center gap-3 md:grid-cols-[120px_1fr_28px]">
                <p className="text-sm text-slate-600">{row.label}</p>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${row.barColor}`} style={{ width: `${width}%` }} />
                </div>
                <p className="text-right text-sm font-semibold text-slate-700">{row.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="self-start rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-2xl font-bold text-slate-900">Tasks by Category</h2>

          <div className="mt-4 grid grid-cols-1 items-center gap-5 md:grid-cols-2">
            <div className="flex justify-center md:justify-start">
              <div
                className="relative h-24 w-24 rounded-full"
                style={{ background: donutBackground }}
                aria-label="Category distribution donut chart"
              >
                <div className="absolute inset-4 rounded-full bg-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              {categoryRowsWithColor.length > 0 ? (
                categoryRowsWithColor.map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                      <p className="text-base text-slate-700">{row.name}</p>
                    </div>
                    <p className="text-base font-semibold text-slate-700">{row.count}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No categories available yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-2xl font-bold text-slate-900">Priority by Category</h2>

          <div className="mt-6 space-y-4">
            {predefinedCategories.map((category) => {
              const priorities = priorityByCategory[category];
              const total = priorities.low + priorities.medium + priorities.high;
              
              if (total === 0) {
                return (
                  <div key={category} className="text-slate-500 text-sm">
                    {category}: No tasks
                  </div>
                );
              }

              return (
                <div key={category}>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{category}</p>
                  <div className="flex h-6 gap-1 rounded-full overflow-hidden bg-slate-100">
                    {priorities.high > 0 && (
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(priorities.high / total) * 100}%` }}
                        title={`High: ${priorities.high}`}
                      />
                    )}
                    {priorities.medium > 0 && (
                      <div
                        className="bg-yellow-400 transition-all"
                        style={{ width: `${(priorities.medium / total) * 100}%` }}
                        title={`Medium: ${priorities.medium}`}
                      />
                    )}
                    {priorities.low > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(priorities.low / total) * 100}%` }}
                        title={`Low: ${priorities.low}`}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-slate-600">
                    <span className="text-red-600 font-semibold">● High: {priorities.high}</span>
                    <span className="text-yellow-500 font-semibold">● Medium: {priorities.medium}</span>
                    <span className="text-green-600 font-semibold">● Low: {priorities.low}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AnalyticsPage;
