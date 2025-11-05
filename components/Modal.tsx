
import React, { useEffect, useState, useRef } from 'react';
import DebouncedButton from './common/DebouncedButton';
import { useInteractionLock } from '../hooks/useInteractionLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Allow async functions for onConfirm to resolve type errors.
  onConfirm: () => void | Promise<void>;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  // FIX: Allow async functions for onDestructive to resolve type errors.
  onDestructive?: () => void | Promise<void>;
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
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const modalPanelRef = useRef<HTMLDivElement>(null);
  const { isLocked } = useInteractionLock();

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
      if (event.key === 'Escape' && !isLocked) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, isLocked]);

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
        className={`fixed inset-0 transition-opacity duration-moderate ease-out-quad ${isAnimatingIn ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0'}`}
        aria-hidden="true"
        onClick={() => {
          if (!isLocked) {
            onClose();
          }
        }}
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
        <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {children}
        </div>
        <div className="mt-6 flex justify-end gap-3">
           {onDestructive && destructiveText && (
            <DebouncedButton
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${destructiveButtonClass || 'text-red-500 hover:bg-red-500/10'}`}
                onClick={onDestructive}
            >
                {destructiveText}
            </DebouncedButton>
           )}
          <DebouncedButton
            type="button"
            className="px-4 py-2 text-sm font-medium text-primary-text-light dark:text-primary-text-dark bg-heymean-l dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500"
            onClick={onClose}
          >
            {cancelText}
          </DebouncedButton>
          <DebouncedButton
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${confirmButtonClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </DebouncedButton>
        </div>
      </div>
    </div>
  );
};

export default Modal;
