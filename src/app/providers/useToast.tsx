
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// --- Type Definition ---
export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// --- Context and Hook ---
interface ToastContextType {
  showToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// --- Toast Component ---
const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void; duration: number }> = ({ toast, onRemove, duration }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const enterTimeout = setTimeout(() => setIsVisible(true), 10);
        // Start exit animation before removing from state
        const exitTimeout = setTimeout(() => setIsVisible(false), duration - 300);

        return () => {
            clearTimeout(enterTimeout);
            clearTimeout(exitTimeout);
        };
    }, [toast.id, duration]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            default: return 'info';
        }
    };
    
    const getColors = () => {
        switch (toast.type) {
            case 'success': return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
            case 'error': return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
            default: return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
        }
    };
    
    const baseClasses = "flex items-center w-full max-w-xs p-4 space-x-4 rtl:space-x-reverse rounded-xl shadow-lg border transition-all duration-300 ease-out-quad";
    const animationClasses = isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full";

    return (
        <div 
            className={`${baseClasses} ${getColors()} ${animationClasses}`} 
            onTransitionEnd={() => !isVisible && onRemove(toast.id)}
            role="alert"
        >
            <div className="shrink-0">
                <span className="material-symbols-outlined">{getIcon()}</span>
            </div>
            <div className="text-sm font-normal flex-1">{toast.message}</div>
            <button
                type="button"
                className="ms-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => setIsVisible(false)} // Trigger exit animation on click
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <span className="material-symbols-outlined text-base!">close</span>
            </button>
        </div>
    );
};

// --- ToastContainer and Provider ---
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(ToastMessage & { duration: number })[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info', duration: number = 5000) => {
    const id = Date.now();
    // Add new toast and limit to a max of 5 on screen
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-100 space-y-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-end gap-3">
            {toasts.map(toast => (
              <Toast key={toast.id} toast={toast} onRemove={removeToast} duration={toast.duration} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};
