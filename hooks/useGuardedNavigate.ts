import { useMemo } from 'react';
import { NavigateFunction, NavigateOptions, To, useNavigate } from 'react-router-dom';
import { useInteractionLock } from './useInteractionLock';
import { DEFAULT_TRANSITION_LOCK_MS } from '../config/ui';

const TRANSITION_LOCK_BUFFER = 600;

type GuardedNavigate = (to: To | number, options?: NavigateOptions) => void;

export const useGuardedNavigate = (): GuardedNavigate => {
  const navigate = useNavigate();
  const { withGuard, lock } = useInteractionLock();

  const guardedNavigate = useMemo(() => {
    const handler: GuardedNavigate = (to, options) => {
      const duration = Math.max(DEFAULT_TRANSITION_LOCK_MS, TRANSITION_LOCK_BUFFER);
      lock(duration);
      (navigate as NavigateFunction)(to as To, options as NavigateOptions | undefined);
    };

    return withGuard(handler, { skipLock: true });
  }, [navigate, withGuard, lock]);

  return guardedNavigate;
};
