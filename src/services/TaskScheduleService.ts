import { db } from '@/firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Task, TaskSchedule } from '@/types';

interface FirestoreTaskSchedule {
  task_id: string;
  start_at: Timestamp;
  end_at: Timestamp;
  scheduled_by: string;
  created_at: Timestamp;
}

export class TaskScheduleService {
  static async getUserSchedules(userId: string): Promise<TaskSchedule[]> {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'task_schedule'), where('scheduled_by', '==', userId))
      );

      return snapshot.docs
        .map((scheduleDoc) => {
          const data = scheduleDoc.data() as Partial<FirestoreTaskSchedule>;

          if (!data.task_id || !data.start_at || !data.end_at || !data.scheduled_by || !data.created_at) {
            return null;
          }

          return {
            schedule_id: scheduleDoc.id,
            task_id: data.task_id,
            start_at: data.start_at.toDate(),
            end_at: data.end_at.toDate(),
            scheduled_by: data.scheduled_by,
            created_at: data.created_at.toDate(),
          };
        })
        .filter((schedule): schedule is TaskSchedule => schedule !== null);
    } catch (error) {
      console.error('Error fetching task schedules:', error);
      return [];
    }
  }

  static toScheduleMap(schedules: TaskSchedule[]): Map<string, Date> {
    return new Map(schedules.map((schedule) => [schedule.task_id, schedule.start_at]));
  }

  static async syncUserSchedules(userId: string, tasks: Task[], schedule: Map<string, Date>): Promise<void> {
    try {
      const schedulesRef = collection(db, 'task_schedule');
      const existingSnapshot = await getDocs(query(schedulesRef, where('scheduled_by', '==', userId)));
      const existingByTaskId = new Map(existingSnapshot.docs.map((scheduleDoc) => [scheduleDoc.data().task_id, scheduleDoc]));
      const activeTaskIds = new Set<string>();
      const batch = writeBatch(db);

      for (const [taskId, startAt] of schedule.entries()) {
        const task = tasks.find((candidate) => candidate.id === taskId);

        if (!task || task.status === 'completed') {
          continue;
        }

        activeTaskIds.add(taskId);

        const endAt = new Date(startAt.getTime() + Math.max(task.estimatedTime || 0, 30) * 60 * 1000);
        const existingSchedule = existingByTaskId.get(taskId);

        if (existingSchedule) {
          batch.update(existingSchedule.ref, {
            task_id: taskId,
            start_at: Timestamp.fromDate(startAt),
            end_at: Timestamp.fromDate(endAt),
            scheduled_by: userId,
          });
        } else {
          const scheduleRef = doc(collection(db, 'task_schedule'));
          batch.set(scheduleRef, {
            task_id: taskId,
            start_at: Timestamp.fromDate(startAt),
            end_at: Timestamp.fromDate(endAt),
            scheduled_by: userId,
            created_at: serverTimestamp(),
          });
        }
      }

      for (const [taskId, scheduleDoc] of existingByTaskId.entries()) {
        if (!activeTaskIds.has(taskId)) {
          batch.delete(scheduleDoc.ref);
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error syncing task schedules:', error);
    }
  }

  /**
   * Delete all schedules for a specific task
   */
  static async deleteTaskSchedules(taskId: string): Promise<void> {
    try {
      const schedulesRef = collection(db, 'task_schedule');
      const q = query(schedulesRef, where('task_id', '==', taskId));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error(`Failed to delete schedules for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Record actual start time when user clicks the Start button
   */
  static async recordActualStartTime(userId: string, taskId: string): Promise<void> {
    try {
      const schedulesRef = collection(db, 'task_schedule');
      const q = query(
        schedulesRef,
        where('task_id', '==', taskId),
        where('scheduled_by', '==', userId)
      );
      const snapshot = await getDocs(q);

      const now = new Date();
      const batch = writeBatch(db);

      if (snapshot.docs.length > 0) {
        // Update existing schedule document
        snapshot.docs.forEach((scheduleDoc) => {
          batch.update(scheduleDoc.ref, {
            start_at: Timestamp.fromDate(now),
          });
        });
      } else {
        // Create new schedule document with current start time
        const scheduleRef = doc(collection(db, 'task_schedule'));
        batch.set(scheduleRef, {
          task_id: taskId,
          start_at: Timestamp.fromDate(now),
          end_at: Timestamp.fromDate(new Date(now.getTime() + 30 * 60 * 1000)), // Default 30 min duration
          scheduled_by: userId,
          created_at: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error(`Failed to record start time for task ${taskId}:`, error);
      throw error;
    }
  }
}
