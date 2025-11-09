import React, { ReactNode } from 'react';

// With all resources now self-hosted, startup gating is unnecessary.
// Keep a no-op provider to avoid refactors in imports; it simply renders children.

export const useAppReady = () => ({ isReady: true });

export const AppReadyProvider: React.FC<{ children: ReactNode } & Record<string, unknown>> = ({ children }) => {
  return <>{children}</>;
};
