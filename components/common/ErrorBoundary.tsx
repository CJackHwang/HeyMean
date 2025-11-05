import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component to catch and handle render errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
          <div className="max-w-md w-full bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              The app encountered an unexpected error. This has been logged and we'll work to fix it.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-heymean-l dark:bg-heymean-d rounded-lg hover:opacity-80 transition-opacity"
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-neutral-500">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}