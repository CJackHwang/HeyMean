import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { DEFAULT_TRANSITION_LOCK_MS } from '../utils/constants';

/**
 * Interaction guard context interface
 */
interface InteractionGuardContextType {
  /** Whether interactions are currently locked */
  isLocked: boolean;
  /** Execute a function with interaction guard */
  withGuard: <T extends (...args: any[]) => any>(fn: T, lockMs?: number) => T;
  /** Manually lock interactions for specified duration */
  lock: (ms?: number) => void;
  /** Manually unlock interactions */
  unlock: () => void;
}

const InteractionGuardContext = createContext<InteractionGuardContextType | null>(null);

/**
 * Provider for interaction guard functionality
 */
export const InteractionGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLockTimeout = useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
  }, []);

  const lock = useCallback((ms: number = DEFAULT_TRANSITION_LOCK_MS) => {
    clearLockTimeout();
    setIsLocked(true);
    lockTimeoutRef.current = setTimeout(() => {
      setIsLocked(false);
      lockTimeoutRef.current = null;
    }, ms);
  }, [clearLockTimeout]);

  const unlock = useCallback(() => {
    clearLockTimeout();
    setIsLocked(false);
  }, [clearLockTimeout]);

  const withGuard = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    lockMs: number = DEFAULT_TRANSITION_LOCK_MS
  ): T => {
    return ((...args: Parameters<T>) => {
      if (isLocked) {
        return;
      }
      lock(lockMs);
      return fn(...args);
    }) as T;
  }, [isLocked, lock]);

  const contextValue: InteractionGuardContextType = {
    isLocked,
    withGuard,
    lock,
    unlock,
  };

  return React.createElement(
    InteractionGuardContext.Provider,
    { value: contextValue },
    children
  );
};

/**
 * Hook to access interaction guard functionality
 */
export const useInteractionGuard = (): InteractionGuardContextType => {
  const context = useContext(InteractionGuardContext);
  if (!context) {
    throw new Error('useInteractionGuard must be used within an InteractionGuardProvider');
  }
  return context;
};