import React, { ComponentType, useCallback, useRef, useState, forwardRef } from 'react';
import { useInteractionLock } from '../../hooks/useInteractionLock';
import { DEFAULT_DEBOUNCE_MS } from '../../config/ui';

type ClickHandler = (event: React.MouseEvent) => void | Promise<void>;

interface WithOnClick {
  onClick?: ClickHandler;
  disabled?: boolean;
}

interface WithClickGuardOptions {
  interval?: number;
}

/**
 * Higher-order component that wraps a component with click guard protection.
 * Prevents rapid clicking and respects the global interaction lock.
 */
export function withClickGuard<P extends WithOnClick>(
  Component: ComponentType<P>,
  options: WithClickGuardOptions = {}
): ComponentType<P> {
  const { interval = DEFAULT_DEBOUNCE_MS } = options;

  const WrappedComponent = forwardRef<any, P>((props, ref) => {
    const { isLocked } = useInteractionLock();
    const [isProcessing, setIsProcessing] = useState(false);
    const lastClickRef = useRef<number>(0);

    const { onClick, disabled, ...restProps } = props;

    const guardedOnClick = useCallback(
      async (event: React.MouseEvent) => {
        if (!onClick) return;

        const now = Date.now();
        const timeSinceLastClick = now - lastClickRef.current;

        if (isProcessing || timeSinceLastClick < interval) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        lastClickRef.current = now;
        setIsProcessing(true);

        try {
          await onClick(event);
        } finally {
          setTimeout(() => {
            setIsProcessing(false);
          }, interval);
        }
      },
      [onClick, interval, isProcessing]
    );

    const isDisabled = disabled || isLocked || isProcessing;

    return (
      <Component
        {...(restProps as P)}
        ref={ref}
        onClick={guardedOnClick as P['onClick']}
        disabled={isDisabled as P['disabled']}
      />
    );
  });

  WrappedComponent.displayName = `withClickGuard(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent as ComponentType<P>;
}
