import React from 'react';
import { AppReadyProgress, AppReadyError } from '../providers/AppReadyProvider';

interface SplashScreenProps {
  progress: AppReadyProgress;
  error: AppReadyError | null;
  onRetry: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ progress, error, onRetry }) => {
  const currentAsset = progress.items.find(item => item.status === 'loading') || progress.items.find(item => item.status === 'pending');
  const progressPercent = Math.floor((progress.completed / (progress.total || 1)) * 100);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-10 px-6 py-12 bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark transition-colors">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
          <span className="material-symbols-outlined text-2xl">hourglass_top</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">HeyMean</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Preparing your learning assistant…</p>
      </div>

      <div className="w-full max-w-md space-y-5">
        <div className="w-full rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 h-2 overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ul className="space-y-2 text-sm">
          {progress.items.map(item => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-900/60 px-4 py-2">
              <span className="font-medium">{item.label}</span>
              <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {item.status === 'pending' && 'Waiting'}
                {item.status === 'loading' && 'Loading'}
                {item.status === 'success' && 'Ready'}
                {item.status === 'error' && 'Error'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {currentAsset && !error && (
        <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{currentAsset.label}</p>
      )}

      {error && (
        <div className="w-full max-w-md rounded-xl border border-red-400/40 bg-red-500/5 px-4 py-4 text-center text-sm text-red-600 dark:text-red-300 dark:border-red-400/30 dark:bg-red-500/10 space-y-3">
          <p className="font-semibold">{error.message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-md bg-red-500 text-white dark:bg-red-400 dark:text-neutral-900 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:ring-offset-2 dark:hover:bg-red-300"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
