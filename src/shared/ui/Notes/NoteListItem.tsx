import React from 'react';
import { Note } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';
import { formatDateTime } from '@shared/lib/dateHelpers';

interface NoteListItemProps {
  note: Note;
  onSelect: () => void;
  getLongPressHandlers: (note: Note) => {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  };
}

export const NoteListItem: React.FC<NoteListItemProps> = React.memo(
  ({ note, onSelect, getLongPressHandlers }) => {
    const { t } = useTranslation();

    return (
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        className="relative p-3 cursor-pointer rounded-xl border border-gray-200 dark:border-neutral-700 transition-colors hover:bg-heymean-l dark:hover:bg-heymean-d data-[pressing=true]:bg-black/10 dark:data-[pressing=true]:bg-white/10 active:bg-black/10 dark:active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
        {...getLongPressHandlers(note)}
      >
        {note.isPinned && (
          <span
            className="material-symbols-outlined text-base! text-neutral-500 dark:text-neutral-400 absolute top-2 right-2"
            style={{ fontSize: '1rem' }}
          >
            push_pin
          </span>
        )}
        <p className="font-semibold text-sm truncate text-primary-text-light dark:text-primary-text-dark pointer-events-none pr-5">
          {note.title || t('notes.untitled')}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-1 pointer-events-none">
          {(note.content || '').split('\n').slice(0, 2).join(' ') || t('notes.no_content')}
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 pointer-events-none">
          {formatDateTime(note.updatedAt)}
        </p>
      </div>
    );
  }
);

NoteListItem.displayName = 'NoteListItem';
