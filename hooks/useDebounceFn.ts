import { useMemo, useEffect, useRef } from 'react';
import { debounce } from '../utils/debounce';

interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * React hook that returns a debounced version of the provided function.
 *
 * @param fn - The function to debounce
 * @param delay - The debounce delay in milliseconds
 * @param options - Optional debounce options
 */
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: DebounceOptions = {}
): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const debounced = useMemo(() => {
    const debouncedFn = debounce((...args: Parameters<T>) => fnRef.current(...args), delay, options);
    return debouncedFn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, options.leading, options.trailing]);

  useEffect(() => () => debounced.cancel(), [debounced]);

  return debounced as unknown as T;
}
