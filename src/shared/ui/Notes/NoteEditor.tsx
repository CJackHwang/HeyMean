import React from 'react';
import { Note } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';

interface NoteEditorProps {
  note: Note;
  setNote: (note: Note) => void;
  onSave: () => Promise<void>;
  onBack: () => void;
  saveStatus: 'idle' | 'saving' | 'saved';
}

export const NoteEditor: React.FC<NoteEditorProps> = React.memo(({ note, setNote, onSave, onBack, saveStatus }) => {
  const { t } = useTranslation();
  const saveButtonText =
    saveStatus === 'saving'
      ? t('notes.saving_button')
      : saveStatus === 'saved'
        ? t('notes.saved_button')
        : t('notes.save_button');

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
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className="px-4 h-10 flex items-center justify-center rounded-lg bg-primary text-white dark:bg-white dark:text-black font-semibold disabled:opacity-50 transition-colors"
          >
            {saveButtonText}
          </button>
        </div>
      </div>
      <textarea
        value={note.content}
        onChange={(e) => setNote({ ...note, content: e.target.value })}
        className="w-full flex-1 p-4 rounded-2xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark text-sm focus:outline-hidden resize-none"
        placeholder={t('notes.placeholder')}
      />
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';
