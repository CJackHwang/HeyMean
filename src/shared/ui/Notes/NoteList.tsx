import React, { useCallback, useMemo } from 'react';
import { Note } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';
import { useLongPress } from '@shared/hooks/useLongPress';
import { NoteListItem } from './NoteListItem';

interface NoteListProps {
  notes: Note[];
  onSelect: (note: Note) => void;
  onNoteLongPress: (note: Note, position: { x: number; y: number }) => void;
}

export const NoteList: React.FC<NoteListProps> = React.memo(({ notes, onSelect, onNoteLongPress }) => {
  const { t } = useTranslation();

  const handleLongPressCallback = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
      context: Note
    ) => {
      onNoteLongPress(context, { x: e.clientX, y: e.clientY });
    },
    [onNoteLongPress]
  );

  const handleClickCallback = useCallback(
    (_event: React.PointerEvent<HTMLDivElement>, context: Note) => {
      onSelect(context);
    },
    [onSelect]
  );

  const getLongPressHandlers = useLongPress<HTMLDivElement, Note>(handleLongPressCallback, handleClickCallback);

  const content = useMemo(() => {
    if (notes.length === 0) {
      return <p className="text-center text-neutral-500 dark:text-neutral-400 mt-8">{t('notes.empty_state')}</p>;
    }

    return notes.map((note) => (
      <NoteListItem key={note.id} note={note} onSelect={() => onSelect(note)} getLongPressHandlers={getLongPressHandlers} />
    ));
  }, [notes, t, onSelect, getLongPressHandlers]);

  return <div className="space-y-2">{content}</div>;
});

NoteList.displayName = 'NoteList';
