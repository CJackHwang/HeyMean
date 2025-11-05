import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInteractionGuard } from './useInteractionLock';

/**
 * Hook that provides navigation with interaction guard to prevent rapid navigation
 */
export const useGuardedNavigate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { withGuard, isLocked } = useInteractionGuard();

  const guardedNavigate = useCallback(
    (to: string | number, options?: any) => {
      if (isLocked) {
        return;
      }

      const navigateFn = () => {
        if (typeof to === 'number') {
          navigate(to);
        } else {
          navigate(to, options);
        }
      };

      // Use a longer lock for navigation to prevent transition issues
      const guardedNavigateFn = withGuard(navigateFn, 500);
      guardedNavigateFn();
    },
    [navigate, withGuard, isLocked]
  );

  return {
    navigate: guardedNavigate,
    isNavigating: isLocked,
    currentLocation: location,
  };
};