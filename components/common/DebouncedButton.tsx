import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useInteractionLock } from '../../hooks/useInteractionLock';
import { DEFAULT_DEBOUNCE_MS } from '../../config/ui';

interface DebouncedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  interval?: number;
  children?: React.ReactNode;
}

/**
 * DebouncedButton component that prevents rapid clicking.
 * Merges the internal debounce state with the global interaction lock.
 */
const DebouncedButton = React.forwardRef<HTMLButtonElement, DebouncedButtonProps>(
  ({ onClick, interval = DEFAULT_DEBOUNCE_MS, disabled, children, ...props }, ref) => {
    const { isLocked } = useInteractionLock();
    const [isProcessing, setIsProcessing] = useState(false);
    const lastClickRef = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickRef.current;

        if (isProcessing || timeSinceLastClick < interval) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        lastClickRef.current = now;

        if (!onClick) {
          return;
        }

        setIsProcessing(true);
        try {
          await onClick(event);
        } finally {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            setIsProcessing(false);
            timeoutRef.current = null;
          }, interval);
        }
      },
      [onClick, interval, isProcessing]
    );

    const isDisabled = disabled || isLocked || isProcessing;

    return (
      <button
        ref={ref}
        {...props}
        disabled={isDisabled}
        onClick={handleClick}
        aria-disabled={isDisabled}
      >
        {children}
      </button>
    );
  }
);

DebouncedButton.displayName = 'DebouncedButton';

export default DebouncedButton;
