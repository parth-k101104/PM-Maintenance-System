import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { SyncManager, SyncItem } from "../api/syncManager";

interface SyncContextType {
  isOffline: boolean;
  queue: SyncItem[];
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [queue, setQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Initialize SyncManager and link to context state
  useEffect(() => {
    SyncManager.init((newQueue) => {
      setQueue(newQueue);
    });
  }, []);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
      
      // Auto-sync when coming back online
      if (!offline && SyncManager.getQueue().length > 0 && !syncInProgress.current) {
        syncNow();
      }
    });

    return () => unsubscribe();
  }, []);

  const syncNow = useCallback(async () => {
    const currentQueue = SyncManager.getQueue();
    if (syncInProgress.current || currentQueue.length === 0) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);
    console.log(`[SyncContext] Starting sync of ${currentQueue.length} items...`);

    const remainingQueue: SyncItem[] = [];

    const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

    for (const item of currentQueue) {
      try {
        const response = await fetch(`${baseUrl}${item.path}`, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            ...item.headers,
          },
          body: item.body,
        });

        if (!response.ok) {
          console.warn(`[SyncContext] Failed to sync item ${item.label}:`, response.status);
          remainingQueue.push(item);
        } else {
          console.log(`[SyncContext] Successfully synced: ${item.label}`);
        }
      } catch (e) {
        console.error(`[SyncContext] Error syncing item ${item.label}:`, e);
        remainingQueue.push(item);
      }
    }

    await SyncManager.setQueue(remainingQueue);
    setIsSyncing(false);
    syncInProgress.current = false;
  }, []);

  return (
    <SyncContext.Provider value={{ isOffline, queue, syncNow, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
