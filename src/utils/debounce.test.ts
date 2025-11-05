/**
 * Unit tests for debounce and throttle utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debounce, throttle } from '../../utils/debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should execute with leading option', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100, { leading: true });

    debouncedFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should execute with trailing option', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100, { trailing: true });

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not execute when trailing is false', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100, { trailing: false });

    debouncedFn();
    vi.advanceTimersByTime(100);
    expect(mockFn).not.toHaveBeenCalled();
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute function immediately with leading option', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100, { leading: true });

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not execute more than once in time window', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should execute with trailing option', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100, { leading: false, trailing: true });

    throttledFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle both leading and trailing', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100, { leading: true, trailing: true });

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    throttledFn();
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});