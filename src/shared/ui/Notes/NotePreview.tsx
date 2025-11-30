import React from 'react';
import { Note } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';
import MarkdownSurface from '../MarkdownSurface';

interface NotePreviewProps {
  note: Note;
  onEdit: () => void;
  onBack: () => void;
}

export const NotePreview: React.FC<NotePreviewProps> = React.memo(({ note, onEdit, onBack }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 p-2 rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d text-primary-text-light dark:text-primary-text-dark"
        >
          <span className="material-symbols-outlined">arrow_back_ios</span>
          {t('notes.all_notes')}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-4 h-10 flex items-center justify-center rounded-lg bg-primary text-white dark:bg-white dark:text-black font-semibold transition-colors"
          >
            {t('notes.edit_button')}
          </button>
        </div>
      </div>
      <MarkdownSurface className="w-full flex-1 text-sm focus:outline-hidden" scrollable>
        <MarkdownSurface.Content content={note.content} />
      </MarkdownSurface>
    </div>
  );
});

NotePreview.displayName = 'NotePreview';
