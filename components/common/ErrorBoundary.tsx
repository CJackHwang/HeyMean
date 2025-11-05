import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark p-4">
          <div className="flex flex-col items-center gap-4 max-w-md">
            <span className="material-symbols-outlined text-6xl text-red-500">error</span>
            <h1 className="text-2xl font-bold text-center">Something went wrong</h1>
            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
              An unexpected error occurred. Please try one of the following options:
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={this.resetError}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  window.location.hash = '#/';
                  window.location.reload();
                }}
                className="px-4 py-2 bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Go Home
              </button>
            </div>
            {this.state.error && (
              <details className="mt-4 w-full">
                <summary className="cursor-pointer text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-heymean-l dark:bg-heymean-d rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
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

export default ErrorBoundary;
