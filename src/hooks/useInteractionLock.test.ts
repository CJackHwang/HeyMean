/**
 * Unit tests for interaction lock functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { InteractionGuardProvider, useInteractionGuard } from '../../hooks/useInteractionLock';

describe('useInteractionLock', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(InteractionGuardProvider, null, children);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with unlocked state', () => {
    const { result } = renderHook(() => useInteractionGuard(), { wrapper });

    expect(result.current.isLocked).toBe(false);
  });

  it('should lock and unlock after specified duration', () => {
    const { result } = renderHook(() => useInteractionLock(), { wrapper });

    act(() => {
      result.current.lock(100);
    });

    expect(result.current.isLocked).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.isLocked).toBe(false);
  });

  it('should withGuard should execute function and lock', () => {
    const { result } = renderHook(() => useInteractionLock(), { wrapper });
    const mockFn = vi.fn();

    act(() => {
      const guardedFn = result.current.withGuard(mockFn, 100);
      guardedFn();
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result.current.isLocked).toBe(true);
  });

  it('should withGuard should not execute when locked', () => {
    const { result } = renderHook(() => useInteractionLock(), { wrapper });
    const mockFn = vi.fn();

    act(() => {
      result.current.lock(100);
    });

    act(() => {
      const guardedFn = result.current.withGuard(mockFn, 100);
      guardedFn();
    });

    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should unlock manually', () => {
    const { result } = renderHook(() => useInteractionLock(), { wrapper });

    act(() => {
      result.current.lock(100);
    });

    expect(result.current.isLocked).toBe(true);

    act(() => {
      result.current.unlock();
    });

    expect(result.current.isLocked).toBe(false);
  });

  it('should handle multiple lock calls', () => {
    const { result } = renderHook(() => useInteractionLock(), { wrapper });

    act(() => {
      result.current.lock(100);
      vi.advanceTimersByTime(50);
      result.current.lock(200);
    });

    expect(result.current.isLocked).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.isLocked).toBe(true);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.isLocked).toBe(false);
  });
});