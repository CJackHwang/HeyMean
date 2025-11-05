import { useCallback, useRef } from 'react';
import { throttle } from '../utils/debounce';

/**
 * Hook that returns a throttled version of the callback function
 * 
 * @param callback The function to throttle
 * @param delay The delay in milliseconds
 * @param deps Dependency array for memoization
 * @param options Throttle options
 * @returns A throttled callback function
 */
export function useThrottleFn<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = [],
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  const throttledCallback = useRef(
    throttle((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay, options)
  ).current;
  
  return useCallback(throttledCallback as T, deps);
}