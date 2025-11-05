import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { useInteractionGuard } from '../../hooks/useInteractionLock';
import { DEFAULT_DEBOUNCE_MS } from '../../utils/constants';

export interface DebouncedButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Click handler to be debounced */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Children to render */
  children: ReactNode;
  /** Whether to merge with global interaction lock */
  respectGlobalLock?: boolean;
}

/**
 * A button component that debounces clicks and respects the global interaction lock
 */
export const DebouncedButton = forwardRef<HTMLButtonElement, DebouncedButtonProps>(
  ({ onClick, debounceMs = DEFAULT_DEBOUNCE_MS, respectGlobalLock = true, disabled, children, ...props }, ref) => {
    const { isLocked, withGuard } = useInteractionGuard();
    
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      
      if (respectGlobalLock && isLocked) {
        event.preventDefault();
        return;
      }
      
      if (onClick) {
        const guardedClick = respectGlobalLock 
          ? withGuard(() => onClick(event), debounceMs)
          : (() => {
              let lastClick = 0;
              return () => {
                const now = Date.now();
                if (now - lastClick >= debounceMs) {
                  lastClick = now;
                  onClick(event);
                }
              };
            })();
        
        guardedClick();
      }
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || (respectGlobalLock && isLocked)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DebouncedButton.displayName = 'DebouncedButton';