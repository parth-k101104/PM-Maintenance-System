import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SyncItem {
  id: string;
  path: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  timestamp: number;
  label: string;
}

const SYNC_QUEUE_KEY = "@pm_maintenance_sync_queue";

export class SyncManager {
  private static queue: SyncItem[] = [];
  private static onQueueChange: ((queue: SyncItem[]) => void) | null = null;

  static async init(onQueueChange: (queue: SyncItem[]) => void) {
    this.onQueueChange = onQueueChange;
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.onQueueChange(this.queue);
      }
    } catch (e) {
      console.error("[SyncManager] Load failed:", e);
    }
  }

  static getQueue() {
    return this.queue;
  }

  static async addRequest(path: string, method: string, body: any, headers: Record<string, string>, label: string) {
    const newItem: SyncItem = {
      id: Math.random().toString(36).substring(2, 11),
      path,
      method,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
      headers,
      timestamp: Date.now(),
      label
    };
    
    this.queue = [...this.queue, newItem];
    await this.persist();
  }

  static async setQueue(newQueue: SyncItem[]) {
    this.queue = newQueue;
    await this.persist();
  }

  private static async persist() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
      if (this.onQueueChange) {
        this.onQueueChange(this.queue);
      }
    } catch (e) {
      console.error("[SyncManager] Persist failed:", e);
    }
  }
}
