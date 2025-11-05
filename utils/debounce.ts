/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified delay has elapsed since the last time it was invoked.
 * 
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds
 * @param options - Configuration options
 * @param options.leading - If true, invoke on the leading edge of the timeout
 * @param options.trailing - If true, invoke on the trailing edge of the timeout (default: true)
 * @returns The debounced function with a cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  const { leading = false, trailing = true } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let invokedOnLeading = false;

  const debouncedFn = function(this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    // Leading edge invocation
    if (leading && !timeoutId) {
      fn.apply(lastThis, lastArgs);
      invokedOnLeading = true;
    } else {
      invokedOnLeading = false;
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout for trailing edge
    timeoutId = setTimeout(() => {
      if (trailing && !invokedOnLeading && lastArgs) {
        fn.apply(lastThis, lastArgs);
      }
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
      invokedOnLeading = false;
    }, delay);
  } as T & { cancel: () => void };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
      invokedOnLeading = false;
    }
  };

  return debouncedFn;
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per the specified interval.
 * 
 * @param fn - The function to throttle
 * @param interval - The interval in milliseconds
 * @param options - Configuration options
 * @param options.leading - If true, invoke on the leading edge (default: true)
 * @param options.trailing - If true, invoke on the trailing edge
 * @returns The throttled function with a cancel method
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  const { leading = true, trailing = false } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let lastInvokeTime = 0;

  const throttledFn = function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastInvoke = now - lastInvokeTime;

    lastArgs = args;
    lastThis = this;

    // Leading edge invocation
    if (leading && timeSinceLastInvoke >= interval) {
      lastInvokeTime = now;
      fn.apply(lastThis, lastArgs);
      return;
    }

    // Schedule trailing edge invocation
    if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        lastInvokeTime = Date.now();
        timeoutId = null;
        if (lastArgs) {
          fn.apply(lastThis, lastArgs);
        }
        lastArgs = null;
        lastThis = null;
      }, interval - timeSinceLastInvoke);
    }
  } as T & { cancel: () => void };

  throttledFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return throttledFn;
}
