import { db } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { Task } from '@/types';

export interface FirestoreTask {
  task_id?: string;
  user_id: string;
  category_id?: string;
  title: string;
  description: string;
  status: Task['status'];
  due_at: Timestamp;
  priority_manual: Task['priority'];
  estimated_time?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp; // Soft delete - timestamp when task was deleted
}

export class TaskService {
  /**
   * Create a new task
   */
  static async createTask(
    userId: string,
    taskData: Omit<FirestoreTask, 'task_id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    try {
      const tasksRef = collection(db, 'tasks');
      const docRef = await addDoc(tasksRef, {
        ...taskData,
        user_id: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for a user
   */
  static async getUserTasks(userId: string): Promise<(FirestoreTask & { id: string })[]> {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('user_id', '==', userId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FirestoreTask & { id: string }));
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      return [];
    }
  }

  /**
   * Get tasks by status for a user
   */
  static async getUserTasksByStatus(userId: string, status: Task['status']): Promise<(FirestoreTask & { id: string })[]> {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('user_id', '==', userId),
        where('status', '==', status)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FirestoreTask & { id: string }));
    } catch (error) {
      console.error(`Error fetching ${status} tasks:`, error);
      return [];
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTaskById(taskId: string): Promise<(FirestoreTask & { id: string }) | null> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const snapshot = await getDoc(taskRef);

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
        } as FirestoreTask & { id: string };
      }
      return null;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }

  /**
   * Update a task
   */
  static async updateTask(taskId: string, updates: Partial<Omit<FirestoreTask, 'task_id' | 'user_id' | 'created_at'>>): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(taskId: string, status: Task['status']): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  /**
   * Soft delete a task (mark as deleted but preserve data for history/AI)
   */
  static async softDeleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error soft deleting task:', error);
      throw error;
    }
  }

  /**
   * Delete a task (hard delete - removes from database)
   */
  static async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Count tasks using a specific category
   */
  static async countTasksByCategory(categoryId: string): Promise<number> {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('category_id', '==', categoryId));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Error counting tasks for category ${categoryId}:`, error);
      return 0;
    }
  }

  /**
   * Convert Firestore task to app Task format
   */
  static firestoreToTask(doc: FirestoreTask & { id: string }): Task {
    return {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      dueDate: doc.due_at?.toDate?.() || new Date(),
      status: doc.status,
      priority: doc.priority_manual || 'medium',
      categoryId: doc.category_id,
      category: doc.category_id || 'Other',
      tags: [],
      estimatedTime: doc.estimated_time ?? 0,
      actualTime: 0,
      aiRecommendation: '',
      subtasks: [],
      createdAt: doc.created_at?.toDate?.() || new Date(),
      updatedAt: doc.updated_at?.toDate?.() || new Date(),
      deletedAt: doc.deleted_at?.toDate?.(),
    };
  }

  /**
   * Convert app Task to Firestore format
   */
  static taskToFirestore(userId: string, task: Task): Omit<FirestoreTask, 'task_id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      category_id: task.categoryId || task.category,
      title: task.title,
      description: task.description,
      status: task.status,
      due_at: Timestamp.fromDate(new Date(task.dueDate)),
      priority_manual: task.priority,
    };
  }
}
