import { useCallback, useRef } from 'react';
import { debounce } from '../utils/debounce';

/**
 * Hook that returns a debounced version of the callback function
 * 
 * @param callback The function to debounce
 * @param delay The delay in milliseconds
 * @param deps Dependency array for memoization
 * @param options Debounce options
 * @returns A debounced callback function
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
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
  
  const debouncedCallback = useRef(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay, options)
  ).current;
  
  return useCallback(debouncedCallback as T, deps);
}