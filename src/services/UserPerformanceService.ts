import { db } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Task } from '@/types';

export interface UserPerformance {
  avg_completion_minutes: number;
  on_time_rate: number;
  last_calculated_at: Date;
}

export class UserPerformanceService {
  /**
   * Get user performance metrics
   */
  static async getUserPerformance(userId: string): Promise<UserPerformance | null> {
    try {
      const performanceRef = doc(db, 'user_performance', userId);
      const snapshot = await getDoc(performanceRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          avg_completion_minutes: data.avg_completion_minutes || 0,
          on_time_rate: data.on_time_rate || 0,
          last_calculated_at: data.last_calculated_at?.toDate() || new Date(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user performance:', error);
      return null;
    }
  }

  /**
   * Create initial user performance record
   */
  static async createUserPerformance(userId: string): Promise<void> {
    try {
      const performanceRef = doc(db, 'user_performance', userId);
      await setDoc(performanceRef, {
        avg_completion_minutes: 0,
        on_time_rate: 0,
        last_calculated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating user performance:', error);
    }
  }

  /**
   * Calculate and update user performance metrics based on completed tasks
   */
  static async updateUserPerformance(userId: string, tasks: Task[]): Promise<void> {
    try {
      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      if (completedTasks.length === 0) {
        return;
      }

      // Calculate average completion time
      const totalCompletionTime = completedTasks.reduce((sum, task) => {
        return sum + (task.actualTime || task.estimatedTime || 0);
      }, 0);
      const avgCompletionMinutes = Math.round(totalCompletionTime / completedTasks.length);

      // Calculate on-time rate
      const onTimeTasks = completedTasks.filter(task => {
        // If no due date, assume completed on time
        if (!task.dueDate) return true;
        
        const dueDate = new Date(task.dueDate);
        const completedDate = task.updatedAt || new Date();
        return new Date(completedDate) <= dueDate;
      });
      const onTimeRate = completedTasks.length > 0 
        ? parseFloat((onTimeTasks.length / completedTasks.length).toFixed(2))
        : 0;

      // Update performance document
      const performanceRef = doc(db, 'user_performance', userId);
      await updateDoc(performanceRef, {
        avg_completion_minutes: avgCompletionMinutes,
        on_time_rate: onTimeRate,
        last_calculated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user performance:', error);
    }
  }

  /**
   * Get performance statistics as percentages
   */
  static async getPerformanceStats(userId: string): Promise<{
    avgCompletionMinutes: number;
    onTimePercentage: number;
    lastUpdated: Date;
  } | null> {
    const performance = await this.getUserPerformance(userId);
    
    if (!performance) return null;

    return {
      avgCompletionMinutes: performance.avg_completion_minutes,
      onTimePercentage: Math.round(performance.on_time_rate * 100),
      lastUpdated: performance.last_calculated_at,
    };
  }
}
