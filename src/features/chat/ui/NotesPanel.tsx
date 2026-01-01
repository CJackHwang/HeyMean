import React from 'react';
import { NotesView } from '@shared/ui/NotesView';

interface NotesPanelProps {
    notesWidth: number;
    isNotesCollapsed: boolean;
    onHandlePointerDown: (event: React.PointerEvent) => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({
    notesWidth,
    isNotesCollapsed,
    onHandlePointerDown,
}) => {
    return (
        <div
            id="notes-panel"
            className="hidden lg:flex flex-col relative overflow-visible border-l border-gray-200 dark:border-neutral-700 bg-background-light dark:bg-background-dark"
            style={{ width: isNotesCollapsed ? 0 : `${notesWidth}px`, minWidth: isNotesCollapsed ? 0 : 260 }}
            aria-hidden={isNotesCollapsed}
        >
            <div
                className={(isNotesCollapsed
                    ? 'absolute -left-4 top-0 bottom-0 w-5 z-40'
                    : 'absolute -left-1.5 top-0 bottom-0 w-3 z-10') +
                    ' cursor-col-resize hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center pointer-events-auto'}
                onPointerDown={onHandlePointerDown}
                aria-label="Resize or toggle notes panel"
                role="separator"
                aria-orientation="vertical"
                aria-controls="notes-panel"
                aria-expanded={!isNotesCollapsed}
                style={{ touchAction: 'none' }}
            >
                <span className="material-symbols-outlined text-[20px] leading-none text-neutral-500 dark:text-neutral-400 opacity-80">
                    {isNotesCollapsed ? 'arrow_menu_close' : 'arrow_menu_open'}
                </span>
            </div>
            <NotesView isDesktop={true} />
        </div>
    );
};

export default NotesPanel;
