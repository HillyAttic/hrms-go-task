/**
 * Real-time Listener Manager
 * Manages Firestore onSnapshot listeners to prevent memory leaks and excessive reads
 * 
 * Features:
 * - Automatic cleanup on component unmount
 * - Throttling to limit update frequency
 * - Listener deduplication
 * - Conditional listeners (only subscribe when needed)
 */

import { Unsubscribe } from 'firebase/firestore';

interface ListenerConfig {
  id: string;
  unsubscribe: Unsubscribe;
  createdAt: number;
  lastUpdate: number;
  updateCount: number;
}

class ListenerManager {
  private listeners = new Map<string, ListenerConfig>();
  private throttleMap = new Map<string, NodeJS.Timeout>();

  /**
   * Register a listener
   */
  register(id: string, unsubscribe: Unsubscribe): void {
    // If listener already exists, unsubscribe the old one
    if (this.listeners.has(id)) {
      console.warn(`[ListenerManager] Replacing existing listener: ${id}`);
      this.unregister(id);
    }

    this.listeners.set(id, {
      id,
      unsubscribe,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      updateCount: 0,
    });

    console.log(`[ListenerManager] Registered listener: ${id}`);
  }

  /**
   * Unregister and cleanup a listener
   */
  unregister(id: string): boolean {
    const listener = this.listeners.get(id);
    if (!listener) {
      return false;
    }

    try {
      listener.unsubscribe();
      this.listeners.delete(id);
      
      // Clear any pending throttle
      const throttle = this.throttleMap.get(id);
      if (throttle) {
        clearTimeout(throttle);
        this.throttleMap.delete(id);
      }

      console.log(`[ListenerManager] Unregistered listener: ${id}`);
      return true;
    } catch (error) {
      console.error(`[ListenerManager] Error unregistering listener ${id}:`, error);
      return false;
    }
  }

  /**
   * Unregister all listeners
   */
  unregisterAll(): void {
    console.log(`[ListenerManager] Unregistering all ${this.listeners.size} listeners`);
    
    this.listeners.forEach((listener, id) => {
      try {
        listener.unsubscribe();
      } catch (error) {
        console.error(`[ListenerManager] Error unregistering listener ${id}:`, error);
      }
    });

    this.listeners.clear();
    
    // Clear all throttles
    this.throttleMap.forEach(throttle => clearTimeout(throttle));
    this.throttleMap.clear();
  }

  /**
   * Check if a listener is registered
   */
  has(id: string): boolean {
    return this.listeners.has(id);
  }

  /**
   * Get listener statistics
   */
  getStats(): {
    total: number;
    listeners: Array<{
      id: string;
      age: number;
      updateCount: number;
      lastUpdate: number;
    }>;
  } {
    const now = Date.now();
    const listeners = Array.from(this.listeners.values()).map(listener => ({
      id: listener.id,
      age: now - listener.createdAt,
      updateCount: listener.updateCount,
      lastUpdate: now - listener.lastUpdate,
    }));

    return {
      total: this.listeners.size,
      listeners,
    };
  }

  /**
   * Record an update for a listener
   */
  recordUpdate(id: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.lastUpdate = Date.now();
      listener.updateCount++;

      // Development logging for throttle verification
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Throttle] ${id}: Update #${listener.updateCount}, Age: ${Date.now() - listener.createdAt}ms`);
      }
    }
  }

  /**
   * Create a throttled callback wrapper
   * Limits how often the callback can be invoked
   */
  createThrottledCallback<T>(
    id: string,
    callback: (data: T) => void,
    throttleMs: number = 1000
  ): (data: T) => void {
    let lastData: T | null = null;

    return (data: T) => {
      lastData = data;
      this.recordUpdate(id);

      // Clear existing throttle
      const existingThrottle = this.throttleMap.get(id);
      if (existingThrottle) {
        clearTimeout(existingThrottle);
      }

      // Set new throttle
      const throttle = setTimeout(() => {
        if (lastData !== null) {
          callback(lastData);
          lastData = null;
        }
        this.throttleMap.delete(id);
      }, throttleMs);

      this.throttleMap.set(id, throttle);
    };
  }

  /**
   * Create a debounced callback wrapper
   * Delays callback invocation until after throttleMs have elapsed since last call
   */
  createDebouncedCallback<T>(
    id: string,
    callback: (data: T) => void,
    debounceMs: number = 500
  ): (data: T) => void {
    return (data: T) => {
      this.recordUpdate(id);

      // Clear existing timeout
      const existingTimeout = this.throttleMap.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        callback(data);
        this.throttleMap.delete(id);
      }, debounceMs);

      this.throttleMap.set(id, timeout);
    };
  }
}

// Export singleton instance
export const listenerManager = new ListenerManager();

/**
 * React hook for managing listeners in components
 */
export function useListenerCleanup(listenerId: string) {
  if (typeof window === 'undefined') return;

  // Cleanup on unmount
  return () => {
    listenerManager.unregister(listenerId);
  };
}

/**
 * Conditional listener wrapper
 * Only subscribes when condition is true
 */
export function conditionalListener(
  id: string,
  condition: boolean,
  subscribe: () => Unsubscribe
): void {
  if (condition) {
    if (!listenerManager.has(id)) {
      const unsubscribe = subscribe();
      listenerManager.register(id, unsubscribe);
    }
  } else {
    listenerManager.unregister(id);
  }
}

/**
 * Auto-cleanup listener for React components
 * Automatically unregisters on component unmount
 */
export function createManagedListener(
  id: string,
  subscribe: () => Unsubscribe
): () => void {
  const unsubscribe = subscribe();
  listenerManager.register(id, unsubscribe);

  // Return cleanup function
  return () => {
    listenerManager.unregister(id);
  };
}
