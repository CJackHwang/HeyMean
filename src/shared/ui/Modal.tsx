
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  children?: React.ReactNode;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  confirmDestructive?: boolean;
  onDestructive?: () => void | Promise<void>;
  destructiveText?: string;
  destructiveButtonClass?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputPlaceholder?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass,
  confirmDestructive = false,
  onDestructive,
  destructiveText,
  destructiveButtonClass,
  inputValue,
  onInputChange,
  inputPlaceholder,
}) => {
  const defaultConfirmClass = confirmDestructive
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-primary hover:bg-primary/90 text-white dark:bg-white dark:text-black';
  const finalConfirmClass = confirmButtonClass || defaultConfirmClass;
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  // Effect to manage mounting/unmounting and exit animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      setIsAnimatingIn(false); // Start exit animation
      // When closing, wait for animation to finish before un-rendering
      const timer = setTimeout(() => setShouldRender(false), 200); // Must match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Effect to manage the entry animation after the component is mounted
  useEffect(() => {
    if (shouldRender && isOpen && modalPanelRef.current) {
      // Force a browser reflow.
      // This ensures the initial state (opacity-0, scale-95) is rendered
      // before the final state (opacity-100, scale-100) is applied for the transition.
      void modalPanelRef.current.offsetHeight;

      // Now trigger the animation by updating the state
      setIsAnimatingIn(true);
    }
  }, [shouldRender, isOpen]);


  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 transition-opacity duration-moderate ease-out-quad ${isAnimatingIn ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0'}`}
        aria-hidden="true"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div
        ref={modalPanelRef}
        className={`relative w-full max-w-md p-6 m-4 bg-background-light dark:bg-heymean-d rounded-2xl shadow-xl transform transition-all duration-moderate ease-out-quad ${isAnimatingIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-primary-text-light dark:text-primary-text-dark" id="modal-title">
          {title}
        </h3>
        <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 space-y-4">
          {message && <p>{message}</p>}
          {children}
          {onInputChange && (
            <input
              type="text"
              value={inputValue ?? ''}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {onDestructive && destructiveText && (
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${destructiveButtonClass || 'text-red-500 hover:bg-red-500/10'}`}
              onClick={onDestructive}
            >
              {destructiveText}
            </button>
          )}
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-primary-text-light dark:text-primary-text-dark bg-heymean-l dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${finalConfirmClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
