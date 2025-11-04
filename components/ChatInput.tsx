import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useId } from 'react';
import { Attachment, Message } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useAttachments } from '../hooks/useAttachments';
import { useToast } from '../hooks/useToast';
import { getFileIcon } from '../utils/fileHelpers';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isThinking: boolean;
  onStop?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onConfirmEdit?: (text: string, attachments: Attachment[]) => void;
}

const getInitialTouchPrimary = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const maxTouchPoints = 'maxTouchPoints' in navigator ? navigator.maxTouchPoints : 0;
  const coarseMatch = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;

  return maxTouchPoints > 0 || coarseMatch;
};

export const AttachmentChip: React.FC<{attachment: Attachment, onRemove?: () => void, readOnly?: boolean}> = ({ attachment, onRemove, readOnly = false }) => {
    return (
        <div className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 rounded-full pl-2 pr-1 py-1 text-sm text-primary-text-light dark:text-primary-text-dark">
            {attachment.preview ? (
                 <img src={attachment.preview} alt={attachment.name} className="w-5 h-5 object-cover rounded-full"/>
            ) : (
                <span className="material-symbols-outlined text-base!">{getFileIcon(attachment.type)}</span>
            )}
            <span className="truncate max-w-28">{attachment.name}</span>
            {!readOnly && onRemove && (
                <button onClick={onRemove} aria-label={attachment.name ? `${attachment.name}` : undefined} title={attachment.name} className="flex items-center justify-center size-5 bg-neutral-500 text-white rounded-full shrink-0 hover:bg-neutral-600">
                    <span className="material-symbols-outlined text-sm!">close</span>
                </button>
            )}
        </div>
    )
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isThinking, onStop, editingMessage, onCancelEdit, onConfirmEdit }) => {
  const [text, setText] = useState('');
  const [isTouchPrimary, setIsTouchPrimary] = useState(getInitialTouchPrimary);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputHelperId = useId();
  const { t } = useTranslation();
  const {
      attachments,
      setAttachments,
      fileInputRef,
      handleFileChange,
      removeAttachment,
      triggerFileInput,
      resetAttachments
  } = useAttachments();
  const { showToast } = useToast();

  const isEditMode = Boolean(editingMessage);
  const lastPrefilledMessageId = useRef<string | null>(null);

  const adjustTextareaSize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    adjustTextareaSize();
  }, [text, adjustTextareaSize]);

  useEffect(() => {
    if (editingMessage) {
      if (lastPrefilledMessageId.current !== editingMessage.id) {
        lastPrefilledMessageId.current = editingMessage.id;
        setText(editingMessage.text);
        const nextAttachments = (editingMessage.attachments ?? []).map(att => ({ ...att }));
        setAttachments(nextAttachments);
      }
    } else if (lastPrefilledMessageId.current) {
      lastPrefilledMessageId.current = null;
      setText('');
      resetAttachments();
    }
  }, [editingMessage, setAttachments, resetAttachments]);

  useEffect(() => {
    const updateTouchPreference = () => {
      setIsTouchPrimary(getInitialTouchPrimary());
    };

    updateTouchPreference();

    let coarseQuery: MediaQueryList | null = null;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      coarseQuery = window.matchMedia('(pointer: coarse)');
      coarseQuery.addEventListener('change', updateTouchPreference);
    }

    return () => {
      coarseQuery?.removeEventListener('change', updateTouchPreference);
    };
  }, []);

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    adjustTextareaSize();
  };

  const handleSendClick = () => {
    const hasText = text.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    if (!hasText && !hasAttachments) {
      showToast(t('toast.input_required'), 'error');
      return;
    }

    if (isEditMode) {
      if (onConfirmEdit) {
        onConfirmEdit(text, attachments);
      } else {
        onSend(text, attachments);
      }
    } else {
      onSend(text, attachments);
      setText('');
      resetAttachments();
    }
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    const wantsModifierSend = event.metaKey || event.ctrlKey;

    if (wantsModifierSend) {
      event.preventDefault();
      handleSendClick();
      return;
    }

    if (isTouchPrimary) {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    handleSendClick();
  };

  const handleCancelClick = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const canSend = !isThinking && (text.trim().length > 0 || attachments.length > 0);
  const isStopState = isThinking;
  const isDisabled = !isStopState && !canSend;
  const helperText = isTouchPrimary
    ? t('chat.input_helper_touch')
    : t('chat.input_helper_desktop');

  return (
    <div className="flex flex-col gap-2.5">
      {isEditMode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-base!">edit</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('chat.editing_message')}</p>
            {attachments.length > 0 && (
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{t('chat.editing_notice')}</p>
            )}
          </div>
          <button
            onClick={handleCancelClick}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
          >
            {t('chat.cancel_edit')}
          </button>
        </div>
      )}
      <div className="flex items-end gap-2.5">
        <input type="file" accept="image/*,application/pdf,text/plain,text/markdown,.md,.txt" ref={fileInputRef} disabled={isEditMode} onChange={(e) => {
          if (isEditMode) {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }
          const files = e.target.files;
          if (files) {
            const patched = Array.from(files).map(f => {
              if (f.type) return f;
              const name = f.name.toLowerCase();
              const ext = name.split('.').pop() || '';
              let mime = '';
              if (ext === 'md' || ext === 'markdown') mime = 'text/markdown';
              else if (ext === 'txt' || ext === 'text') mime = 'text/plain';
              else if (ext === 'pdf') mime = 'application/pdf';
              return f;
            });
          }
          handleFileChange(e);
        }} className="hidden" multiple />
        <button onClick={triggerFileInput} aria-label={t('chat.attach_file_button')} className="flex items-center justify-center size-10 rounded-xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isEditMode}>
          <span className="material-symbols-outlined text-xl!">attach_file</span>
        </button>
        <div className="flex flex-col min-w-0 flex-1 relative bg-heymean-l dark:bg-heymean-d rounded-xl">
          {attachments.length > 0 && (
              <div className="p-2 border-b border-gray-300 dark:border-white/20">
                  <div className="flex flex-wrap gap-2">
                      {attachments.map((att, index) => (
                          <AttachmentChip key={index} attachment={att} onRemove={isEditMode ? undefined : () => removeAttachment(index)} readOnly={isEditMode} />
                      ))}
                  </div>
              </div>
          )}
          <textarea
            ref={textareaRef}
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden text-primary-text-light dark:text-primary-text-dark focus:outline-0 border-none bg-transparent placeholder:text-neutral-500 dark:placeholder:text-neutral-400 px-4 py-3 text-sm font-normal leading-normal h-12"
            placeholder={t('chat.input_placeholder')}
            aria-label={t('chat.input_aria_label')}
            aria-describedby={inputHelperId}
            value={text}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            rows={1}
            disabled={isThinking}
            inputMode="text"
            enterKeyHint={isTouchPrimary ? 'enter' : 'send'}
          />
          <p id={inputHelperId} className="px-4 pb-3 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
            {helperText}
          </p>
        </div>
        <button
          onClick={isStopState ? onStop : handleSendClick}
          disabled={isDisabled}
          aria-label={isStopState ? t('chat.stop_button') : (isEditMode ? t('chat.confirm_edit') : t('chat.send_button'))}
          className={[
            'flex items-center justify-center size-12 rounded-xl text-white shrink-0',
            isStopState ? 'bg-red-600 hover:bg-red-700' : '',
            canSend && !isStopState ? 'bg-primary hover:bg-primary/90' : '',
            isDisabled ? 'bg-neutral-400 dark:bg-neutral-600 cursor-not-allowed' : ''
          ].join(' ').trim()}
        >
          {isStopState ? (
            <span className="material-symbols-outlined text-2xl!">stop</span>
          ) : isEditMode ? (
            <span className="material-symbols-outlined text-2xl!">check</span>
          ) : (
            <span className="material-symbols-outlined text-2xl!">send</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
