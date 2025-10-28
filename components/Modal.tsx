import React, { useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  onDestructive?: () => void;
  destructiveText?: string;
  destructiveButtonClass?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
  onDestructive,
  destructiveText,
  destructiveButtonClass,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      // When closing, wait for animation to finish before un-rendering
      const timer = setTimeout(() => setShouldRender(false), 200); // Must match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-200 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div
        className={`relative w-full max-w-md p-6 m-4 bg-background-light dark:bg-heymean-d rounded-2xl shadow-xl transform transition-all duration-200 ease-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-primary-text-light dark:text-primary-text-dark" id="modal-title">
          {title}
        </h3>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {children}
        </div>
        <div className="mt-6 flex justify-end gap-3">
           {onDestructive && destructiveText && (
            <button
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${destructiveButtonClass || 'text-red-500 hover:bg-red-500/10'}`}
                onClick={onDestructive}
            >
                {destructiveText}
            </button>
           )}
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-primary-text-light dark:text-primary-text-dark bg-heymean-l dark:bg-heymean-d/50 hover:bg-gray-200 dark:hover:bg-heymean-d rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${confirmButtonClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
