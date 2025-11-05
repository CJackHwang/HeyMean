/**
 * Debounce and throttle utility functions
 */

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * 
 * @param func The function to debounce
 * @param wait The delay in milliseconds
 * @param options Configuration options
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): (...args: Parameters<T>) => void {
  const { leading = false, trailing = true } = options;
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  
  return function debounced(...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = time - lastInvokeTime >= wait;
    
    lastCallTime = time;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (leading && isInvoking) {
      lastInvokeTime = time;
      func.apply(this, args);
      return;
    }
    
    if (trailing) {
      timeoutId = setTimeout(() => {
        lastInvokeTime = Date.now();
        if (lastCallTime === lastCallTime) { // Check if there were new calls
          func.apply(this, args);
        }
        timeoutId = null;
      }, wait - (time - lastInvokeTime));
    }
  };
}

/**
 * Throttle function - ensures function is called at most once in a specified time period.
 * 
 * @param func The function to throttle
 * @param wait The time window in milliseconds
 * @param options Configuration options
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  
  return function throttled(...args: Parameters<T>) {
    const time = Date.now();
    const shouldInvokeLeading = leading && time - lastInvokeTime >= wait;
    
    lastCallTime = time;
    
    if (shouldInvokeLeading) {
      lastInvokeTime = time;
      func.apply(this, args);
      return;
    }
    
    if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        lastInvokeTime = Date.now();
        func.apply(this, args);
        timeoutId = null;
      }, wait - (time - lastInvokeTime));
    }
  };
}