import React, { createContext, useContext, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { DEFAULT_DEBOUNCE_MS, DEFAULT_TRANSITION_LOCK_MS } from '../config/ui';

type UnlockFn = () => void;

type GuardedFn<T extends (...args: any[]) => any> = (...args: Parameters<T>) => ReturnType<T>;

interface WithGuardOptions {
  lockFor?: number;
  skipLock?: boolean;
}

interface InteractionGuardContextValue {
  isLocked: boolean;
  lock: (duration?: number) => UnlockFn;
  withGuard: <T extends (...args: any[]) => any>(fn: T, options?: WithGuardOptions) => GuardedFn<T>;
}

const InteractionGuardContext = createContext<InteractionGuardContextValue | undefined>(undefined);

export const InteractionGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const activeLocksRef = useRef<Set<symbol>>(new Set());
  const timeoutsRef = useRef<Map<symbol, ReturnType<typeof setTimeout>>>(new Map());
  const isLockedRef = useRef(isLocked);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const releaseLock = useCallback((lockId: symbol) => {
    const locks = activeLocksRef.current;
    if (!locks.has(lockId)) return;
    locks.delete(lockId);
    const timeoutId = timeoutsRef.current.get(lockId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(lockId);
    }
    if (locks.size === 0) {
      setIsLocked(false);
    }
  }, []);

  const lock = useCallback((duration: number = DEFAULT_TRANSITION_LOCK_MS) => {
    const lockId = Symbol('interaction-lock');
    const locks = activeLocksRef.current;
    const wasEmpty = locks.size === 0;
    locks.add(lockId);
    if (wasEmpty) {
      setIsLocked(true);
    }

    if (Number.isFinite(duration) && duration > 0) {
      const timeoutId = setTimeout(() => {
        releaseLock(lockId);
      }, duration);
      timeoutsRef.current.set(lockId, timeoutId);
    }

    const unlock: UnlockFn = () => releaseLock(lockId);
    return unlock;
  }, [releaseLock]);

  useEffect(() => () => {
    timeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutsRef.current.clear();
    activeLocksRef.current.clear();
  }, []);

  const withGuard = useCallback(<T extends (...args: any[]) => any>(fn: T, options: WithGuardOptions = {}) => {
    return ((...args: Parameters<T>) => {
      if (isLockedRef.current) {
        return undefined as ReturnType<T>;
      }

      const shouldLock = !options.skipLock;
      const duration = options.lockFor ?? DEFAULT_DEBOUNCE_MS;
      let unlock: UnlockFn | null = null;

      if (shouldLock) {
        unlock = lock(duration);
      }

      try {
        const result = fn(...args);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          (result as Promise<unknown>).finally(() => {
            if (unlock) {
              unlock();
            }
          });
        } else if (shouldLock && (!Number.isFinite(duration) || duration <= 0)) {
          unlock?.();
        }
        return result;
      } catch (error) {
        unlock?.();
        throw error;
      }
    }) as GuardedFn<T>;
  }, [lock]);

  const value = useMemo<InteractionGuardContextValue>(() => ({
    isLocked,
    lock,
    withGuard,
  }), [isLocked, lock, withGuard]);

  return (
    <InteractionGuardContext.Provider value={value}>
      {children}
    </InteractionGuardContext.Provider>
  );
};

export const useInteractionLock = (): InteractionGuardContextValue => {
  const context = useContext(InteractionGuardContext);
  if (!context) {
    throw new Error('useInteractionLock must be used within an InteractionGuardProvider');
  }
  return context;
};
