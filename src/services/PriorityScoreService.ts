import { db } from '@/firebase';
import { doc, serverTimestamp, addDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { Task, PriorityScore } from '@/types';

export class PriorityScoreService {
  /**
   * Calculate priority score based on task attributes
   * Score ranges from 0-100
   * 
   * Calculation factors:
   * - Urgency (0-10): Weight 40%
   * - Importance (0-10): Weight 35%
   * - Time until due (0-10): Weight 25%
   */
  static calculateScore(task: Task): number {
    const urgency = task.urgency ?? 5;
    const importance = task.importance ?? 5;
    
    // Calculate time until due date
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Convert hours to urgency score (0-10)
    // If due in 24 hours or less: score 10
    // If overdue: score 10
    // If due in 1 week: score 7
    // If due in 1 month: score 3
    // If no due date: score 2
    let dueUrgency = 2;
    
    if (hoursUntilDue < 0) {
      dueUrgency = 10; // Overdue
    } else if (hoursUntilDue <= 24) {
      dueUrgency = 10; // Due today/tomorrow
    } else if (hoursUntilDue <= 72) {
      dueUrgency = 8; // Due within 3 days
    } else if (hoursUntilDue <= 168) {
      dueUrgency = 7; // Due within 1 week
    } else if (hoursUntilDue <= 720) {
      dueUrgency = 4; // Due within 1 month
    } else {
      dueUrgency = 2; // Far future or no deadline
    }
    
    // Weighted calculation
    const weightedScore = 
      (urgency * 0.40) + 
      (importance * 0.35) + 
      (dueUrgency * 0.25);
    
    // Scale to 0-100
    const score = Math.round((weightedScore / 10) * 100);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get priority distribution breakdown as JSON
   */
  static getPriorityDistribution(task: Task): string {
    const urgency = task.urgency ?? 5;
    const importance = task.importance ?? 5;
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let dueUrgency = 2;
    if (hoursUntilDue < 0) {
      dueUrgency = 10;
    } else if (hoursUntilDue <= 24) {
      dueUrgency = 10;
    } else if (hoursUntilDue <= 72) {
      dueUrgency = 8;
    } else if (hoursUntilDue <= 168) {
      dueUrgency = 7;
    } else if (hoursUntilDue <= 720) {
      dueUrgency = 4;
    } else {
      dueUrgency = 2;
    }
    
    const distribution = {
      urgency_component: Math.round((urgency * 0.40) / 10 * 100),
      importance_component: Math.round((importance * 0.35) / 10 * 100),
      due_date_component: Math.round((dueUrgency * 0.25) / 10 * 100),
      urgency_value: urgency,
      importance_value: importance,
      due_urgency_value: dueUrgency,
    };
    
    return JSON.stringify(distribution);
  }

  /**
   * Create a new priority score record
   */
  static async createPriorityScore(task: Task): Promise<string> {
    try {
      const score = this.calculateScore(task);
      const distribution = this.getPriorityDistribution(task);
      
      const scoresCollection = collection(db, 'priority_score');
      const docRef = await addDoc(scoresCollection, {
        task_id: task.id,
        score: score,
        priority_distribution: distribution,
        computed_at: serverTimestamp(),
      });
      
      console.log(`✅ Priority score created for task ${task.id}: ${score}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating priority score:', error);
      throw error;
    }
  }

  /**
   * Update priority score for a task
   */
  static async updatePriorityScore(task: Task): Promise<void> {
    try {
      const score = this.calculateScore(task);
      const distribution = this.getPriorityDistribution(task);
      
      // First, try to find existing score for this task
      const scoresCollection = collection(db, 'priority_score');
      const q = query(scoresCollection, where('task_id', '==', task.id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update existing score
        const scoreDocId = querySnapshot.docs[0].id;
        const scoreDocRef = doc(db, 'priority_score', scoreDocId);
        
        await updateDoc(scoreDocRef, {
          score: score,
          priority_distribution: distribution,
          computed_at: serverTimestamp(),
        });
        
        console.log(`✅ Priority score updated for task ${task.id}: ${score}`);
      } else {
        // Create new score if doesn't exist
        await this.createPriorityScore(task);
      }
    } catch (error) {
      console.error('Error updating priority score:', error);
      // Don't throw - priority score update should not break task operations
    }
  }

  /**
   * Get priority score for a task
   */
  static async getPriorityScore(taskId: string): Promise<PriorityScore | null> {
    try {
      const scoresCollection = collection(db, 'priority_score');
      const q = query(scoresCollection, where('task_id', '==', taskId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const docData = querySnapshot.docs[0].data();
      return {
        score_id: querySnapshot.docs[0].id,
        task_id: docData.task_id,
        score: docData.score,
        priority_distribution: docData.priority_distribution,
        computed_at: docData.computed_at?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error fetching priority score:', error);
      return null;
    }
  }

  /**
   * Get all priority scores for a user (by getting all scores and filtering by tasks)
   */
  static async getAllPriorityScores(): Promise<PriorityScore[]> {
    try {
      const scoresCollection = collection(db, 'priority_score');
      const querySnapshot = await getDocs(scoresCollection);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          score_id: doc.id,
          task_id: data.task_id,
          score: data.score,
          priority_distribution: data.priority_distribution,
          computed_at: data.computed_at?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error('Error fetching all priority scores:', error);
      return [];
    }
  }

  /**
   * Delete priority score
   */
  static async deletePriorityScore(taskId: string): Promise<void> {
    try {
      const scoresCollection = collection(db, 'priority_score');
      const q = query(scoresCollection, where('task_id', '==', taskId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const scoreDocId = querySnapshot.docs[0].id;
        const scoreDocRef = doc(db, 'priority_score', scoreDocId);
        await deleteDoc(scoreDocRef);
        console.log(`✅ Priority score deleted for task ${taskId}`);
      }
    } catch (error) {
      console.error('Error deleting priority score:', error);
      throw error;
    }
  }

  /**
   * Get top priority tasks by score
   */
  static async getTopPriorities(limit: number = 5): Promise<PriorityScore[]> {
    try {
      const allScores = await this.getAllPriorityScores();
      
      // Sort by score descending and return top N
      return allScores.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      console.error('Error getting top priorities:', error);
      return [];
    }
  }
}
