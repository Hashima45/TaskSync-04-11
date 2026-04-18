import React, { useState, useEffect } from 'react';
import { Task, TaskCategory } from '@/types';
import { X } from 'lucide-react';

const DEFAULT_CATEGORIES: TaskCategory[] = [
  { category_id: 'work', name: 'Work', color: '#4F46E5' },
  { category_id: 'personal', name: 'Personal', color: '#10B981' },
  { category_id: 'health', name: 'Health', color: '#F59E0B' },
  { category_id: 'academics', name: 'Academics', color: '#8B5CF6' },
  { category_id: 'other', name: 'Other', color: '#64748B' },
];

interface TaskFormProps {
  onSubmit: (task: Partial<Task>) => void;
  onClose: () => void;
  initialTask?: Task;
  categories: TaskCategory[];
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onClose, initialTask, categories }) => {
  const categoryOptions = Array.from(
    new Map(
      DEFAULT_CATEGORIES
        .filter((category) => category.name && category.category_id !== 'other')
        .map((category) => [category.category_id, category])
    ).values()
  );
  const fallbackCategory = categoryOptions[0] || DEFAULT_CATEGORIES[0];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Helper function to calculate priority from urgency and importance
  const calculatePriority = (urgency: number, importance: number): Task['priority'] => {
    const average = (urgency + importance) / 2;
    if (average >= 7.5) return 'high';
    if (average <= 4.5) return 'low';
    return 'medium';
  };

  const [formData, setFormData] = useState<Partial<Task> & { urgency?: number; importance?: number }>(
    initialTask || {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      category: fallbackCategory.name,
      categoryId: fallbackCategory.category_id,
      tags: [],
      estimatedTime: 30,
      dueDate: new Date(),
      urgency: 6,
      importance: 6,
    }
  );

  const [customCategory, setCustomCategory] = useState<string>(
    initialTask?.category && !categoryOptions.some((category) => category.category_id === initialTask.categoryId || category.name === initialTask.category)
      ? initialTask.category
      : ''
  );

  useEffect(() => {
    if (!initialTask && !formData.categoryId && fallbackCategory && formData.category !== 'Other' && !customCategory) {
      setFormData((current) => ({
        ...current,
        category: fallbackCategory.name,
        categoryId: fallbackCategory.category_id,
      }));
    }
  }, [customCategory, fallbackCategory, formData.category, formData.categoryId, initialTask]);

  useEffect(() => {
    if (customCategory || formData.categoryId || !formData.category) {
      return;
    }

    const matchedCategory = categoryOptions.find((category) => category.name === formData.category);

    if (matchedCategory) {
      setFormData((current) => ({
        ...current,
        category: matchedCategory.name,
        categoryId: matchedCategory.category_id,
      }));
    }
  }, [categoryOptions, customCategory, formData.category, formData.categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title?.trim()) {
      // Calculate priority from urgency and importance
      const calculatedPriority = calculatePriority(formData.urgency ?? 6, formData.importance ?? 6);
      onSubmit({ ...formData, priority: calculatedPriority });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">{initialTask ? 'Edit Task' : 'New Task'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
            <select
              value={formData.category === 'Other' || customCategory ? 'other' : (formData.categoryId || fallbackCategory.category_id)}
              onChange={(e) => {
                if (e.target.value === 'other') {
                  setFormData({ ...formData, category: 'Other', categoryId: undefined });
                  setCustomCategory('');
                } else {
                  const matchedCategory = categoryOptions.find((category) => category.category_id === e.target.value);

                  setFormData({
                    ...formData,
                    category: matchedCategory?.name || 'Other',
                      categoryId: matchedCategory?.category_id,
                    });
                    setCustomCategory('');
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {categoryOptions.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
                <option value="other">Other</option>
              </select>
              {(formData.category === 'Other' || customCategory) && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setFormData({ ...formData, category: e.target.value || 'Other', categoryId: undefined });
                  }}
                  placeholder="Specify what category"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-600 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 mt-2"
                />
              )}
            </div>

          {/* Urgency & Importance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Urgency</label>
              <select
                value={formData.urgency ?? '6'}
                onChange={(e) => {
                  setFormData({ ...formData, urgency: parseInt(e.target.value) });
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="3">Low</option>
                <option value="6">Medium</option>
                <option value="9">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Importance</label>
              <select
                value={formData.importance ?? '6'}
                onChange={(e) => {
                  setFormData({ ...formData, importance: parseInt(e.target.value) });
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="3">Low</option>
                <option value="6">Medium</option>
                <option value="9">High</option>
              </select>
            </div>
          </div>

          {/* Due Date & Est. Minutes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Due Date</label>
              <input
                type="date"
                value={
                  formData.dueDate instanceof Date
                    ? new Date(formData.dueDate.getTime() - formData.dueDate.getTimezoneOffset() * 60000)
                        .toISOString()
                        .split('T')[0]
                    : ''
                }
                onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value) })}
                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Est. Minutes</label>
              <input
                type="number"
                value={formData.estimatedTime ?? ''}
                onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="30"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              {initialTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;
