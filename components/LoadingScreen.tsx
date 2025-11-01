import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="w-12 h-12 border-4 border-primary/20 dark:border-white/20 border-t-primary dark:border-t-white rounded-full animate-spin"></div>
    </div>
  );
};

export default LoadingScreen;