import React, { useState, useEffect, useRef } from 'react';

// FIX: Export Action interface and allow onClick to be async
export interface Action {
  label: string;
  icon: string;
  onClick: () => void | Promise<void>;
  isDestructive?: boolean;
}

interface ListItemMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Action[];
  position: { x: number; y: number };
}

const ListItemMenu: React.FC<ListItemMenuProps> = ({ isOpen, onClose, actions, position }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scale(0.95)',
    // Position it off-screen initially to prevent any flicker at (0,0)
    top: '-9999px',
    left: '-9999px',
  });

  // Effect to manage mounting/unmounting with animation delay
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
    if (isOpen) {
      // Defer measurement and positioning until the next browser paint cycle.
      const timer = setTimeout(() => {
        if (!menuRef.current) return;

        const menuRect = menuRef.current.getBoundingClientRect();
        const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
        const margin = 8; // 8px margin from the viewport edges

        let top = position.y;
        let left = position.x;

        // Adjust horizontally if it overflows right
        if (left + menuRect.width > windowWidth - margin) {
          left = windowWidth - menuRect.width - margin;
        }
        
        // Adjust vertically if it overflows bottom
        if (top + menuRect.height > windowHeight - margin) {
          top = windowHeight - menuRect.height - margin;
        }
        
        // Ensure it doesn't go off-screen on the top/left
        if (left < margin) {
            left = margin;
        }
        if (top < margin) {
            top = margin;
        }

        // Apply the calculated position and start the fade-in animation.
        setMenuStyle({
          top: `${top}px`,
          left: `${left}px`,
          opacity: 1,
          transform: 'scale(1)',
        });
      }, 10); // A small delay is enough for the render cycle.
      
      return () => clearTimeout(timer);

    } else {
        // When closing, start the fade-out animation.
        // It's important to keep the current `top` and `left` from the previous state
        // so it animates out from its position, instead of jumping off-screen.
        setMenuStyle(prev => ({
            ...prev,
            opacity: 0,
            transform: 'scale(0.95)',
        }));
    }
  }, [isOpen, position]);

  // ESC 关闭与焦点陷阱
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const focusable = menuRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} role="dialog" aria-modal="true">
      <div
        ref={menuRef}
        className="absolute bg-background-light dark:bg-neutral-700 rounded-lg shadow-xl p-1.5 min-w-[150px] border border-gray-200 dark:border-neutral-700 transition-[opacity,transform] duration-moderate ease-out-quad"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <ul role="menu" aria-label="Context menu">
          {actions.map((action, index) => (
            <li key={index}>
              <button
                role="menuitem"
                onClick={async () => {
                  // 防抖与加载态处理
                  const btn = document.activeElement as HTMLButtonElement | null;
                  if (btn) btn.disabled = true;
                  try {
                    await action.onClick();
                  } finally {
                    if (btn) btn.disabled = false;
                    onClose();
                  }
                }}
                className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm ${
                  action.isDestructive
                    ? 'text-red-500 hover:bg-red-500/10'
                    : 'text-primary-text-light dark:text-primary-text-dark hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-base!">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ListItemMenu;
