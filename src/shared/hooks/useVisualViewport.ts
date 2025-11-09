import { useEffect, useState } from 'react';

/**
 * Hook to handle Visual Viewport API for mobile keyboard adaptivity
 * This helps adjust the layout when the virtual keyboard appears on mobile devices
 */
export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateFromWindow = () => {
      const nextHeight = window.innerHeight;
      setViewportHeight(nextHeight);
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    // Visual Viewport API provides better information on mobile devices
    const visualViewport = window.visualViewport;

    if (!visualViewport) {
      window.addEventListener('resize', updateFromWindow);
      window.addEventListener('orientationchange', updateFromWindow);
      updateFromWindow();

      return () => {
        window.removeEventListener('resize', updateFromWindow);
        window.removeEventListener('orientationchange', updateFromWindow);
      };
    }

    const handleViewportResize = () => {
      const layoutViewportHeight = window.innerHeight;
      const currentHeight = visualViewport.height;
      const offsetTop = visualViewport.offsetTop || 0;

      setViewportHeight(currentHeight);

      // When the keyboard is shown, the visual viewport height shrinks
      const estimatedKeyboardHeight = Math.max(0, layoutViewportHeight - (currentHeight + offsetTop));
      setKeyboardHeight(estimatedKeyboardHeight);
      setIsKeyboardVisible(estimatedKeyboardHeight > 80);
    };

    visualViewport.addEventListener('resize', handleViewportResize);
    visualViewport.addEventListener('scroll', handleViewportResize);

    // Initial calculation
    handleViewportResize();

    return () => {
      visualViewport.removeEventListener('resize', handleViewportResize);
      visualViewport.removeEventListener('scroll', handleViewportResize);
    };
  }, []);

  return {
    viewportHeight,
    keyboardHeight,
    isKeyboardVisible,
  };
}
