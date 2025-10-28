import React, { useState, useEffect, useRef } from 'react';

interface Action {
  label: string;
  icon: string;
  onClick: () => void;
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scale(0.95)',
    // Position it off-screen initially to prevent any flicker at (0,0)
    top: '-9999px',
    left: '-9999px',
  });

  useEffect(() => {
    if (isOpen) {
      // Defer measurement and positioning until the next browser paint cycle.
      // This ensures menuRef.current exists and has calculated dimensions.
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
        // When closing, reset to the initial off-screen and invisible state.
        setMenuStyle({
            opacity: 0,
            transform: 'scale(0.95)',
            top: '-9999px',
            left: '-9999px',
        });
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div
        ref={menuRef}
        className="absolute bg-background-light dark:bg-heymean-d rounded-lg shadow-xl p-1.5 min-w-[150px] border border-gray-200 dark:border-gray-700 transition-[opacity,transform] duration-200 ease-out"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <ul>
          {actions.map((action, index) => (
            <li key={index}>
              <button
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm ${
                  action.isDestructive
                    ? 'text-red-500 hover:bg-red-500/10'
                    : 'text-primary-text-light dark:text-primary-text-dark hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined !text-base">{action.icon}</span>
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