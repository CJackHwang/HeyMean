
import React, { useState, useEffect, useRef } from 'react';

interface SelectorOption {
  value: string;
  label: string;
}

interface SelectorProps {
  label: string;
  icon?: string;
  options: SelectorOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

const SelectorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    options: SelectorOption[];
    selectedValue: string;
    onSelect: (value: string) => void;
}> = ({ isOpen, onClose, title, options, selectedValue, onSelect }) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isAnimatingIn, setIsAnimatingIn] = useState(false);
    const modalPanelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
        } else {
            setIsAnimatingIn(false);
            const timer = setTimeout(() => setShouldRender(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (shouldRender && isOpen && modalPanelRef.current) {
            void modalPanelRef.current.offsetHeight;
            setIsAnimatingIn(true);
        }
    }, [shouldRender, isOpen]);

    if (!shouldRender) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center" 
            onClick={onClose}
        >
            <div className={`fixed inset-0 bg-black transition-opacity duration-moderate ease-out-quad ${isAnimatingIn ? 'bg-opacity-50' : 'bg-opacity-0'}`}></div>
            <div 
                ref={modalPanelRef}
                className={`relative w-full max-w-sm p-4 m-4 bg-background-light dark:bg-heymean-d rounded-2xl shadow-xl transform transition-all duration-moderate ease-out-quad ${isAnimatingIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-primary-text-light dark:text-primary-text-dark px-2 pb-2">{title}</h3>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    <ul className="space-y-1">
                        {options.map(option => (
                            <li key={option.value}>
                                <button
                                    onClick={() => { onSelect(option.value); onClose(); }}
                                    className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                        selectedValue === option.value
                                            ? 'bg-primary/10 dark:bg-white/10 text-primary dark:text-white font-semibold'
                                            : 'text-primary-text-light dark:text-primary-text-dark hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span>{option.label}</span>
                                    {selectedValue === option.value && <span className="material-symbols-outlined !text-base">check</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


const Selector: React.FC<SelectorProps> = ({ label, icon, options, selectedValue, onSelect }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === selectedValue) || { label: 'Select...' };

  return (
    <>
      <div onClick={() => setIsModalOpen(true)} className="flex items-center gap-4 px-4 min-h-14 justify-between rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
        <div className="flex items-center gap-4 min-w-0">
          {icon && (
            <div className="flex items-center justify-center rounded-lg bg-heymean-l dark:bg-heymean-d shrink-0 size-10">
              <span className="material-symbols-outlined">{icon}</span>
            </div>
          )}
          <p className="text-base font-normal leading-normal flex-1 truncate">{label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-40">{selectedOption.label}</span>
            <span className="material-symbols-outlined text-neutral-400">unfold_more</span>
        </div>
      </div>
      <SelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={label}
        options={options}
        selectedValue={selectedValue}
        onSelect={onSelect}
      />
    </>
  );
};

export default Selector;