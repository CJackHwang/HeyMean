
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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

const MIN_TEXTAREA_HEIGHT = 48;
const MAX_TEXTAREA_HEIGHT = 240;

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isThinking, onStop, editingMessage, onCancelEdit, onConfirmEdit }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT),
      MAX_TEXTAREA_HEIGHT
    );
    textarea.style.height = `${nextHeight}px`;
  }, []);

  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

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

  const handleCancelClick = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const canSend = !isThinking && (text.trim().length > 0 || attachments.length > 0);
  const isStopState = isThinking;
  const isDisabled = !isStopState && !canSend;
  const actionButtonClassName = [
    'flex items-center justify-center size-12 rounded-full shrink-0 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-70',
    isStopState
      ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 focus-visible:outline-red-400 shadow-inner'
      : '',
    !isStopState && canSend
      ? 'bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary shadow-sm'
      : '',
    !isStopState && !canSend
      ? 'bg-neutral-400 dark:bg-neutral-600 text-neutral-100'
      : ''
  ].filter(Boolean).join(' ');

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
        <button onClick={triggerFileInput} aria-label={t('chat.attach_file_button')} className="flex items-center justify-center size-12 rounded-full bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-200 shadow-sm" disabled={isEditMode}>
          <span className="material-symbols-outlined text-xl!">attach_file</span>
        </button>
        <div className="flex flex-col min-w-0 flex-1 relative bg-heymean-l dark:bg-heymean-d rounded-xl min-h-12">
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
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-y-auto text-primary-text-light dark:text-primary-text-dark focus:outline-0 border-none bg-transparent placeholder:text-neutral-500 dark:placeholder:text-neutral-400 px-4 py-3 text-sm font-normal leading-normal"
            placeholder={t('chat.input_placeholder')}
            aria-label={t('chat.input_aria_label')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            disabled={isThinking}
          />
        </div>
        <button
          onClick={isStopState ? onStop : handleSendClick}
          disabled={isDisabled}
          aria-label={isStopState ? t('chat.stop_button') : (isEditMode ? t('chat.confirm_edit') : t('chat.send_button'))}
          className={actionButtonClassName}
        >
          {isStopState ? (
            <span className="material-symbols-outlined text-2xl!">stop_circle</span>
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
