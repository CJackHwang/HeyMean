import { useMemo, useEffect, useRef } from 'react';
import { throttle } from '../utils/debounce';

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * React hook that returns a throttled version of the provided function.
 *
 * @param fn - The function to throttle
 * @param interval - The throttle interval in milliseconds
 * @param options - Optional throttle options
 */
export function useThrottleFn<T extends (...args: any[]) => any>(
  fn: T,
  interval: number,
  options: ThrottleOptions = {}
): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const throttled = useMemo(() => {
    const throttledFn = throttle((...args: Parameters<T>) => fnRef.current(...args), interval, options);
    return throttledFn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, options.leading, options.trailing]);

  useEffect(() => () => throttled.cancel(), [throttled]);

  return throttled as unknown as T;
}
