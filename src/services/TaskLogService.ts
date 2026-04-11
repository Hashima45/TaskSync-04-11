import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { TaskLog } from '../types';

export class TaskLogService {
  private static readonly COLLECTION = 'task_log';

  /**
   * Record an event for a task in the task_log collection
   */
  static async recordEvent(
    taskId: string,
    eventType: TaskLog['event_type']
  ): Promise<string> {
    try {
      const logRef = collection(db, this.COLLECTION);
      const docRef = await addDoc(logRef, {
        task_id: taskId,
        event_type: eventType,
        event_at: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Failed to record ${eventType} event for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get all events for a specific task
   */
  static async getTaskEvents(taskId: string): Promise<TaskLog[]> {
    try {
      const logRef = collection(db, this.COLLECTION);
      const q = query(logRef, where('task_id', '==', taskId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          log_id: doc.id,
          task_id: data.task_id,
          event_type: data.event_type,
          event_at: data.event_at?.toDate?.() || new Date(),
        } as TaskLog;
      });
    } catch (error) {
      console.error(`Failed to fetch events for task ${taskId}:`, error);
      return [];
    }
  }

  /**
   * Get events for multiple tasks (useful for analytics)
   */
  static async getEventsForTasks(taskIds: string[]): Promise<Map<string, TaskLog[]>> {
    try {
      const eventMap = new Map<string, TaskLog[]>();

      // Initialize map with empty arrays for each task
      taskIds.forEach((id) => eventMap.set(id, []));

      // Fetch all events for these tasks
      const logRef = collection(db, this.COLLECTION);
      const q = query(logRef, where('task_id', 'in', taskIds));
      const snapshot = await getDocs(q);

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const log: TaskLog = {
          log_id: doc.id,
          task_id: data.task_id,
          event_type: data.event_type,
          event_at: data.event_at?.toDate?.() || new Date(),
        };

        const existing = eventMap.get(data.task_id) || [];
        eventMap.set(data.task_id, [...existing, log]);
      });

      return eventMap;
    } catch (error) {
      console.error('Failed to fetch events for tasks:', error);
      return new Map();
    }
  }

  /**
   * Delete all logs for a specific task
   */
  static async deleteTaskLogs(taskId: string): Promise<void> {
    try {
      const logRef = collection(db, this.COLLECTION);
      const q = query(logRef, where('task_id', '==', taskId));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error(`Failed to delete logs for task ${taskId}:`, error);
      throw error;
    }
  }
}
