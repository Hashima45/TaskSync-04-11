import React, { useMemo, useState } from 'react';
import { Task, TaskCategory } from '@/types';
import { CalendarDays, CheckCircle2, Clock3, ListTodo, Plus, Search, Play, Clock } from 'lucide-react';
import { formatDate, isOverdue } from '@/utils/taskUtils';

const DEFAULT_CATEGORY_NAMES = ['Work', 'Personal', 'Health', 'Academics', 'Other'];
const DEFAULT_CATEGORY_LOWER = DEFAULT_CATEGORY_NAMES.map(n => n.toLowerCase());

type FilterType = 'all' | 'todo' | 'in-progress' | 'completed' | 'overdue';

interface TasksPageProps {
  tasks: Task[];
  categories: TaskCategory[];
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onNewTask: () => void;
}

const priorityChipStyles: Record<Task['priority'], string> = {
  low: 'bg-green-100 text-green-700 font-bold',
  medium: 'bg-yellow-100 text-yellow-600 font-bold',
  high: 'bg-red-100 text-red-700 font-bold',
};

const priorityDotStyles: Record<Task['priority'], string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const categorychipStyles: Record<string, string> = {
  work: 'bg-blue-100 text-blue-700',
  personal: 'bg-purple-100 text-purple-700',
  academics: 'bg-yellow-100 text-yellow-700',
  health: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
};

const getCategoryStyle = (category: string): string =>
  categorychipStyles[category.trim().toLowerCase()] ?? 'bg-gray-100 text-gray-600';

const statusOptions: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All Tasks' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  onStatusChange,
  onNewTask,
}) => {
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hoveredDoneId, setHoveredDoneId] = useState<string | null>(null);

  // Only show default categories in the filter dropdown.
  // Custom categories typed by users (e.g. "shopping") appear under "Other".
  const categoryOptions = DEFAULT_CATEGORY_NAMES;

  const filteredTasks = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    return tasks.filter((task) => {
      let matchesStatus = false;
      
      if (filter === 'all') {
        matchesStatus = task.status !== 'completed';
      } else if (filter === 'overdue') {
        matchesStatus = isOverdue(task.dueDate) && task.status !== 'completed';
      } else {
        matchesStatus = task.status === filter;
      }
      
      const matchesPriority = priorityFilter === 'all' ? true : task.priority === priorityFilter;
      
      // Handle category filtering - case-insensitive comparison
      const taskCategory = task.category?.trim() || '';
      const taskCategoryLower = taskCategory.toLowerCase();
      const filterLower = categoryFilter.toLowerCase();
      let matchesCategory = false;
      if (categoryFilter === 'all') {
        matchesCategory = true;
      } else if (filterLower === 'other') {
        // "Other" matches: empty category, category stored as "other",
        // OR any custom category the user typed (not in the default list)
        matchesCategory =
          !taskCategory ||
          taskCategoryLower === 'other' ||
          !DEFAULT_CATEGORY_LOWER.includes(taskCategoryLower);
      } else {
        matchesCategory = taskCategoryLower === filterLower;
      }
      
      const matchesQuery =
        loweredQuery.length === 0 ||
        [task.title, task.description, task.category, task.tags.join(' ')].join(' ').toLowerCase().includes(loweredQuery);

      return matchesStatus && matchesPriority && matchesCategory && matchesQuery;
    });
  }, [tasks, filter, priorityFilter, categoryFilter, query]);

  const completedCount = tasks.filter((task) => task.status === 'completed').length;

  return (
    <div className="tasks-page-enter space-y-5">
      <div className="tasks-page-section flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Tasks</h1>
          <p className="mt-1 text-base sm:text-lg text-slate-500">
            {tasks.length} tasks · {completedCount} completed
          </p>
        </div>

        <button
          type="button"
          onClick={onNewTask}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-md shadow-indigo-200 transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      <div className="tasks-page-section grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_180px_180px_180px] gap-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 xl:col-span-3">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                filter === option.value
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option.value === 'all' && <ListTodo className="h-4 w-4" />}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tasks-page-section grid grid-cols-1 sm:grid-cols-2 gap-3 xl:grid-cols-[180px_180px]">

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as 'all' | Task['priority'])}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
        >
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="tasks-page-section space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No tasks found with current filters.
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div
              key={task.id}
              className="task-card-enter rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5"
              style={{ animationDelay: `${180 + index * 70}ms` }}
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${priorityDotStyles[task.priority]}`} />
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${priorityChipStyles[task.priority]}`}>
                    Priority: {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                  {task.category && (
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${getCategoryStyle(task.category)}`}>
                      {task.category.toLowerCase()}
                    </span>
                  )}
                </div>

                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : task.status === 'todo' ? (
                  <button
                    type="button"
                    onClick={() => onStatusChange(task.id, 'in-progress')}
                    className="text-emerald-500 hover:text-emerald-600 transition-colors"
                    aria-label="Start task"
                  >
                    <Play className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStatusChange(task.id, 'completed')}
                    onMouseEnter={() => setHoveredDoneId(task.id)}
                    onMouseLeave={() => setHoveredDoneId(null)}
                    className="transition-colors text-orange-500 hover:text-green-600"
                    title="Mark as Done"
                  >
                    {hoveredDoneId === task.id
                      ? <CheckCircle2 className="h-5 w-5" />
                      : <Clock className="h-5 w-5" />}
                  </button>
                )}
              </div>
                
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="text-left"
              >
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 hover:text-indigo-600">
                  {task.title}
                </h3>
              </button>

              {task.description && <p className="mt-1 text-lg text-slate-500">{task.description}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(task.dueDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {task.estimatedTime}m
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="rounded-md border border-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksPage;
