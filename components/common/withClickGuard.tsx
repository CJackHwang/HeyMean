import React from 'react';
import { useInteractionGuard } from '../../hooks/useInteractionLock';
import { DEFAULT_DEBOUNCE_MS } from '../../utils/constants';

/**
 * Higher-order component that adds click guard functionality to any component with an onClick prop
 * 
 * @param Component The component to wrap
 * @param options Configuration options
 * @returns A wrapped component with click guard
 */
export function withClickGuard<T extends { onClick?: (event: any) => any; disabled?: boolean }>(
  Component: React.ComponentType<T>,
  options: {
    debounceMs?: number;
    respectGlobalLock?: boolean;
  } = {}
) {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, respectGlobalLock = true } = options;
  
  return React.forwardRef<any, T>((props, ref) => {
    const { isLocked, withGuard } = useInteractionGuard();
    const { onClick, disabled, ...restProps } = props;
    
    const handleClick = (event: any) => {
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
      <Component
        {...(restProps as T)}
        ref={ref}
        onClick={handleClick}
        disabled={disabled || (respectGlobalLock && isLocked)}
      />
    );
  });
}