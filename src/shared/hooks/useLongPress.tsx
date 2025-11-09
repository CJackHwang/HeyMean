// FIX: Import React to make the 'React' namespace available for types like React.PointerEvent.
import React, { useRef, useCallback } from 'react';

type PointerOrMouseEvent<T> = React.PointerEvent<T> | React.MouseEvent<T>;

interface LongPressOptions {
  delay?: number;
}

/**
 * A custom hook to handle long press and click events on an element.
 * It also handles context menu (right-click) as a long press.
 *
 * @template T - The type of the HTML element.
 * @template C - The type of the context data to be passed to callbacks.
 * @param onLongPress - Callback function for a long press event.
 * @param onClick - Optional callback function for a click event.
 * @param options - Optional configuration for the delay.
 * @returns A function that takes context and returns event handlers to be spread on a component.
 */
export const useLongPress = <T extends HTMLElement, C = unknown>(
  onLongPress: (e: PointerOrMouseEvent<T>, context: C) => void,
  onClick?: (e: React.PointerEvent<T>, context: C) => void,
  { delay = 500 }: LongPressOptions = {}
) => {
  const timeout = useRef<number | null>(null);
  const isLongPressTriggered = useRef(false);

  const getHandlers = useCallback((context: C) => {
    const handlePointerDown = (e: React.PointerEvent<T>) => {
      // Only trigger for main button (left-click)
      if (e.button !== 0) return;
      isLongPressTriggered.current = false;
      
      // Set data-pressing attribute for visual feedback
      e.currentTarget.setAttribute('data-pressing', 'true');
      
      timeout.current = window.setTimeout(() => {
        onLongPress(e, context);
        isLongPressTriggered.current = true;
      }, delay);
    };

    const handlePointerUp = (e: React.PointerEvent<T>) => {
      // Remove data-pressing attribute
      e.currentTarget.removeAttribute('data-pressing');
      
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
      if (onClick && !isLongPressTriggered.current) {
        onClick(e, context);
      }
    };

    const handlePointerLeave = (e: React.PointerEvent<T>) => {
      // Remove data-pressing attribute when pointer leaves
      e.currentTarget.removeAttribute('data-pressing');
      
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
    };

    const handlePointerCancel = (e: React.PointerEvent<T>) => {
      // Remove data-pressing attribute on pointer cancel
      e.currentTarget.removeAttribute('data-pressing');
      
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
    };

    const handleContextMenu = (e: React.MouseEvent<T>) => {
      e.preventDefault();
      
      // Remove data-pressing attribute
      const target = e.currentTarget as HTMLElement;
      target.removeAttribute('data-pressing');
      
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
      onLongPress(e, context);
      // FIX: Set the flag here. This is crucial for touch devices where a long press
      // fires a contextmenu event. Without this, the subsequent pointerup event
      // would incorrectly trigger the onClick handler.
      isLongPressTriggered.current = true;
    };

    // FIX: Returned event handlers were using shorthand properties that pointed to undefined variables.
    // The properties should be assigned the actual handler functions defined above.
    return {
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
      onPointerCancel: handlePointerCancel,
      onContextMenu: handleContextMenu,
    };
  }, [onLongPress, onClick, delay]);

  return getHandlers;
};
