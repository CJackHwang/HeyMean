
import React, { useState } from 'react';
import { Attachment } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useAttachments } from '../hooks/useAttachments';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isThinking: boolean;
}

export const AttachmentChip: React.FC<{attachment: Attachment, onRemove: () => void}> = ({ attachment, onRemove }) => {
    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'picture_as_pdf';
        if (mimeType === 'text/markdown') return 'article';
        if (mimeType.startsWith('text/')) return 'description';
        return 'attach_file';
    };

    return (
        <div className="flex items-center gap-2 bg-neutral-200 dark:bg-neutral-700 rounded-full pl-2 pr-1 py-1 text-sm text-primary-text-light dark:text-primary-text-dark">
            {attachment.preview ? (
                 <img src={attachment.preview} alt={attachment.name} className="w-5 h-5 object-cover rounded-full"/>
            ) : (
                <span className="material-symbols-outlined !text-base">{getFileIcon(attachment.type)}</span>
            )}
            <span className="truncate max-w-28">{attachment.name}</span>
            <button onClick={onRemove} className="flex items-center justify-center size-5 bg-neutral-500 text-white rounded-full shrink-0 hover:bg-neutral-600">
                <span className="material-symbols-outlined !text-sm">close</span>
            </button>
        </div>
    )
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isThinking }) => {
  const [text, setText] = useState('');
  const { t } = useTranslation();
  const { 
      attachments, 
      fileInputRef, 
      handleFileChange, 
      removeAttachment, 
      triggerFileInput, 
      resetAttachments 
  } = useAttachments();

  const handleSendClick = () => {
    if (text.trim() || attachments.length > 0) {
      onSend(text, attachments);
      setText('');
      resetAttachments();
    }
  };

  return (
    <div className="flex items-end gap-2.5">
      <input type="file" accept="image/*,application/pdf,text/plain,text/markdown,.md,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
      <button onClick={triggerFileInput} className="flex items-center justify-center size-10 rounded-xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark shrink-0">
        <span className="material-symbols-outlined !text-xl">attach_file</span>
      </button>
      <div className="flex flex-col min-w-0 flex-1 relative bg-heymean-l dark:bg-heymean-d rounded-xl">
        {attachments.length > 0 && (
            <div className="p-2 border-b border-gray-300 dark:border-white/20">
                <div className="flex flex-wrap gap-2">
                    {attachments.map((att, index) => (
                        <AttachmentChip key={index} attachment={att} onRemove={() => removeAttachment(index)} />
                    ))}
                </div>
            </div>
        )}
        <textarea
          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden text-primary-text-light dark:text-primary-text-dark focus:outline-0 border-none bg-transparent placeholder:text-neutral-500 dark:placeholder:text-neutral-400 px-4 py-3 text-sm font-normal leading-normal h-12"
          placeholder={t('chat.input_placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendClick();
              }
          }}
          rows={1}
          disabled={isThinking}
        />
      </div>
      <button onClick={handleSendClick} disabled={isThinking || (!text.trim() && attachments.length === 0)} className="flex items-center justify-center size-12 rounded-xl bg-primary text-white shrink-0 disabled:bg-neutral-400 dark:disabled:bg-neutral-600">
        {isThinking ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
            <span className="material-symbols-outlined !text-2xl">send</span>
        )}
      </button>
    </div>
  );
};

export default ChatInput;