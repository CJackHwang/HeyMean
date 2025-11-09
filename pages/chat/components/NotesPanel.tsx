import React from 'react';
import { NotesView } from '../../../components/NotesView';

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
            className="hidden md:flex flex-col relative border-l border-gray-200 dark:border-neutral-700 bg-background-light dark:bg-background-dark"
            style={{ width: isNotesCollapsed ? 0 : `${notesWidth}px`, minWidth: isNotesCollapsed ? 0 : 260 }}
            aria-hidden={isNotesCollapsed}
        >
            <div
                className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                onPointerDown={onHandlePointerDown}
                aria-label="Resize or toggle notes panel"
                role="separator"
                aria-orientation="vertical"
                aria-controls="notes-panel"
                aria-expanded={!isNotesCollapsed}
                style={{ touchAction: 'none' }}
            >
                <span className="material-symbols-outlined text-[18px] leading-none text-neutral-500 dark:text-neutral-400 opacity-80">
                    {isNotesCollapsed ? 'arrow_menu_open' : 'arrow_menu_close'}
                </span>
            </div>
            <NotesView isDesktop={true} />
        </div>
    );
};

export default NotesPanel;
