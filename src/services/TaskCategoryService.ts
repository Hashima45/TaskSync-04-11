import { db } from '@/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { TaskCategory } from '@/types';

export class TaskCategoryService {
  private static readonly defaultColors: Record<string, string> = {
    work: '#4F46E5',
    personal: '#10B981',
    health: '#F59E0B',
    academics: '#8B5CF6',
    other: '#64748B',
  };

  private static buildCategoryId(categoryName: string): string {
    return categoryName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'other';
  }

  private static getDefaultColor(categoryId: string): string {
    return this.defaultColors[categoryId] || '#64748B';
  }

  static async getCategories(): Promise<TaskCategory[]> {
    try {
      const snapshot = await getDocs(collection(db, 'task_category'));

      return snapshot.docs
        .map((categoryDoc) => {
          const data = categoryDoc.data();
          const name = typeof data.name === 'string' ? data.name.trim() : '';

          if (!name) {
            return null;
          }

          return {
            category_id: categoryDoc.id,
            name,
            color: data.color || '#64748B',
          };
        })
        .filter((category): category is TaskCategory => category !== null)
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      console.error('Error fetching task categories:', error);
      return [];
    }
  }

  static async ensureCategoryExists(categoryName: string): Promise<TaskCategory | null> {
    const name = categoryName.trim();

    if (!name) {
      return null;
    }

    const category_id = this.buildCategoryId(name);
    const categoryRef = doc(db, 'task_category', category_id);

    try {
      const snapshot = await getDoc(categoryRef);

      if (snapshot.exists()) {
        const data = snapshot.data();

        return {
          category_id,
          name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : name,
          color: data.color || this.getDefaultColor(category_id),
        };
      }

      const category: TaskCategory = {
        category_id,
        name,
        color: this.getDefaultColor(category_id),
      };

      await setDoc(categoryRef, {
        name: category.name,
        color: category.color,
      });
      return category;
    } catch (error) {
      console.error('Error ensuring task category exists:', error);
      return null;
    }
  }

  /**
   * Safely delete a category only if no tasks use it
   */
  static async deleteCategoryIfUnused(categoryId: string): Promise<boolean> {
    try {
      // Import TaskService dynamically to avoid circular dependency
      const { TaskService } = await import('./TaskService');
      
      // Check if any tasks still use this category
      const taskCount = await TaskService.countTasksByCategory(categoryId);
      
      if (taskCount === 0) {
        // No tasks use this category, safe to delete
        const categoryRef = doc(db, 'task_category', categoryId);
        await deleteDoc(categoryRef);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error deleting category ${categoryId}:`, error);
      return false;
    }
  }
}