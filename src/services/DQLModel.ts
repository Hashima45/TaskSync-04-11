/**
 * DQLSchedulerModel — TensorFlow.js port of the Deep Q-Learning scheduler
 * from AI.ipynb (Python/Keras).
 *
 * Architecture mirrors the notebook:
 *   State:   [hour_norm, priority_norm, duration_norm]  (3 features)
 *   Actions: 14 possible hours (8 AM – 9 PM)
 *   Network: Dense(64,relu) → Dense(64,relu) → Dense(32,relu) → Dense(14,linear)
 *   Loss:    MSE    Optimizer: Adam(lr=0.001)
 *   Reward:  +10 completed, -5 missed   (same as notebook)
 *   γ:       0.95   (same as notebook)
 */
import * as tf from '@tensorflow/tfjs';

export interface DQLPrediction {
  bestHour: number;   // 8–21 — hour the model recommends for this task
  maxQValue: number;  // raw Q-value; higher = model is more confident task succeeds
  confidence: number; // 0–100 mapped from Q-value range (–5 to +10 → 0–100)
}

export interface DQLTrainingRecord {
  hour: number;        // 8–21
  priorityNum: number; // 1–10 (numeric priority)
  durationHrs: number; // estimated task duration in hours
  completed: boolean;  // was the task actually completed?
}

export class DQLSchedulerModel {
  private model: tf.Sequential;
  private targetModel: tf.Sequential;
  private readonly actionSize = 14; // hours 8–21
  private readonly gamma = 0.95;
  private _trained = false;

  constructor() {
    this.model = this.buildNetwork();
    this.targetModel = this.buildNetwork();
    this.syncTarget();
  }

  private buildNetwork(): tf.Sequential {
    const m = tf.sequential();
    m.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [3] }));
    m.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    m.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    m.add(tf.layers.dense({ units: this.actionSize, activation: 'linear' }));
    m.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
    return m;
  }

  private syncTarget(): void {
    this.targetModel.setWeights(this.model.getWeights());
  }

  /**
   * Normalize state to [0,1] — matches notebook's get_state().
   *   hour:        (h - 8) / 13      (8-21 → 0-1)
   *   priorityNum: (p - 1) / 9       (1-10 → 0-1)
   *   durationHrs: min(d, 8) / 8     (0-8h → 0-1)
   */
  private normalize(hour: number, priorityNum: number, durationHrs: number): [number, number, number] {
    return [
      (Math.max(8, Math.min(21, hour)) - 8) / 13,
      (Math.max(1, Math.min(10, priorityNum)) - 1) / 9,
      Math.min(Math.max(durationHrs, 0), 8) / 8,
    ];
  }

  /**
   * Train the Deep Q-Network on historical task records.
   * Mirrors the notebook's train_model() with experience replay + Bellman updates.
   */
  async train(records: DQLTrainingRecord[]): Promise<void> {
    if (records.length < 5) return;

    // Build experience replay buffer from historical records
    const experiences = records.map(r => ({
      state:     this.normalize(r.hour, r.priorityNum, r.durationHrs),
      action:    Math.min(Math.max(Math.round(r.hour) - 8, 0), 13),
      reward:    r.completed ? 10 : -5,
      nextState: this.normalize(Math.min(r.hour + 1, 21), r.priorityNum, r.durationHrs),
      done:      r.completed,
    }));

    // Scale epochs like the notebook (default 50), capped for browser performance
    const epochs = Math.min(50, Math.max(15, records.length));
    const batchSize = Math.min(32, experiences.length);

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Random mini-batch (mirrors notebook's random.sample)
      const batch = [...experiences]
        .sort(() => Math.random() - 0.5)
        .slice(0, batchSize);

      const statesTensor     = tf.tensor2d(batch.map(e => e.state));
      const nextStatesTensor = tf.tensor2d(batch.map(e => e.nextState));

      const currentQs = this.model.predict(statesTensor) as tf.Tensor2D;
      const targetQs  = this.targetModel.predict(nextStatesTensor) as tf.Tensor2D;

      const [currentArr, targetArr] = await Promise.all([
        currentQs.array() as Promise<number[][]>,
        targetQs.array()  as Promise<number[][]>,
      ]);

      // Bellman update:  Q(s,a) = r + γ · max Q(s',a')
      const updated = currentArr.map((qVals, i) => {
        const q = [...qVals];
        const exp = batch[i];
        q[exp.action] = exp.done
          ? exp.reward
          : exp.reward + this.gamma * Math.max(...targetArr[i]);
        return q;
      });

      const targetsTensor = tf.tensor2d(updated);
      await this.model.fit(statesTensor, targetsTensor, { epochs: 1, verbose: 0 });

      // Dispose tensors to prevent memory leaks
      statesTensor.dispose();
      nextStatesTensor.dispose();
      currentQs.dispose();
      targetQs.dispose();
      targetsTensor.dispose();

      // Sync target network every 10 epochs (matches notebook's update_target_freq logic)
      if ((epoch + 1) % 10 === 0) this.syncTarget();

      // Yield to the browser every 5 epochs to avoid UI freeze
      if ((epoch + 1) % 5 === 0) await tf.nextFrame();
    }

    this._trained = true;
  }

  /**
   * Predict the best scheduling hour and a confidence score for a task.
   * Mirrors notebook's predict_best_hour() using argmax of Q-values.
   *
   * maxQValue is used as the task's priority signal for sorting:
   *   higher Q = model believes this task will succeed, schedule it earlier.
   */
  async predict(priorityNum: number, durationHrs: number, workStart = 8): Promise<DQLPrediction> {
    const state       = this.normalize(workStart, priorityNum, durationHrs);
    const stateTensor = tf.tensor2d([state]);
    const qTensor     = this.model.predict(stateTensor) as tf.Tensor2D;
    const qValues     = ((await qTensor.array()) as number[][])[0];
    stateTensor.dispose();
    qTensor.dispose();

    const maxQ      = Math.max(...qValues);
    const bestAction = qValues.indexOf(maxQ);

    // Map Q range (≈ –5 to +10) → 0–100 confidence
    const confidence = Math.min(100, Math.max(10, Math.round(((maxQ + 5) / 15) * 100)));

    return { bestHour: 8 + bestAction, maxQValue: maxQ, confidence };
  }

  /**
   * Incremental update on a single completed/missed task.
   * Called immediately when a task's status changes so the model learns in real-time
   * without waiting for the next full schedule generation.
   *
   * One Bellman update per call — lightweight enough to run in the background.
   */
  async trainOnSingleRecord(record: DQLTrainingRecord): Promise<void> {
    const state     = this.normalize(record.hour, record.priorityNum, record.durationHrs);
    const action    = Math.min(Math.max(Math.round(record.hour) - 8, 0), 13);
    const reward    = record.completed ? 10 : -5;
    const nextState = this.normalize(Math.min(record.hour + 1, 21), record.priorityNum, record.durationHrs);

    const stateT     = tf.tensor2d([state]);
    const nextStateT = tf.tensor2d([nextState]);

    const currentQs = this.model.predict(stateT) as tf.Tensor2D;
    const targetQs  = this.targetModel.predict(nextStateT) as tf.Tensor2D;

    const [currentArr, targetArr] = await Promise.all([
      currentQs.array() as Promise<number[][]>,
      targetQs.array()  as Promise<number[][]>,
    ]);

    const q = [...currentArr[0]];
    q[action] = record.completed
      ? reward
      : reward + this.gamma * Math.max(...targetArr[0]);

    const targetT = tf.tensor2d([q]);
    await this.model.fit(stateT, targetT, { epochs: 1, verbose: 0 });

    stateT.dispose(); nextStateT.dispose();
    currentQs.dispose(); targetQs.dispose(); targetT.dispose();

    this._trained = true;
  }

  /**
   * Persist the trained model weights to localStorage so the DQL accumulates
   * learning across browser sessions without retraining from scratch each time.
   * Key is namespaced per user so multiple accounts don't share weights.
   */
  async save(userId: string): Promise<void> {
    try {
      await this.model.save(`localstorage://dql-scheduler-${userId}`);
    } catch (e) {
      console.warn('[DQLModel] Could not save weights:', e);
    }
  }

  /**
   * Load previously saved weights from localStorage and return a ready-to-use model.
   * If no saved weights exist (first run or cleared storage), returns a fresh instance.
   *
   * Usage:
   *   const model = await DQLSchedulerModel.load(userId);
   *   await model.train(records);
   *   await model.save(userId);
   */
  static async load(userId: string): Promise<DQLSchedulerModel> {
    const instance = new DQLSchedulerModel();
    try {
      const loaded = await tf.loadLayersModel(`localstorage://dql-scheduler-${userId}`);
      // Recompile — optimizer state is not persisted, only weights
      loaded.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
      instance.model.dispose();
      instance.model = loaded as tf.Sequential;
      instance.syncTarget(); // sync target network to the loaded weights
    } catch {
      // No saved model yet — start fresh (first run)
    }
    return instance;
  }

  get trained(): boolean { return this._trained; }

  dispose(): void {
    this.model.dispose();
    this.targetModel.dispose();
  }
}
