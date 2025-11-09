import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useVisualViewport } from '@shared/hooks/useVisualViewport';

interface ViewportContextType {
  viewportHeight: number;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

const ViewportContext = createContext<ViewportContextType | undefined>(undefined);

interface ViewportProviderProps {
  children: ReactNode;
}

export const ViewportProvider: React.FC<ViewportProviderProps> = ({ children }) => {
  const { viewportHeight, keyboardHeight, isKeyboardVisible } = useVisualViewport();

  // Update CSS custom properties when viewport changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;

      // Update custom properties for viewport and keyboard heights
      root.style.setProperty('--hm-viewport-height', `${Math.round(viewportHeight)}px`);
      root.style.setProperty('--hm-keyboard-height', `${Math.max(0, Math.round(keyboardHeight))}px`);

      if (isKeyboardVisible) {
        root.setAttribute('data-hm-keyboard', 'open');
      } else {
        root.removeAttribute('data-hm-keyboard');
      }
    }
  }, [viewportHeight, keyboardHeight, isKeyboardVisible]);

  const value: ViewportContextType = {
    viewportHeight,
    keyboardHeight,
    isKeyboardVisible,
  };

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
};

export const useViewport = (): ViewportContextType => {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewport must be used within a ViewportProvider');
  }
  return context;
};
