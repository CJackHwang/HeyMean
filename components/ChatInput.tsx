
import React, { useState } from 'react';
import { Attachment } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useAttachments } from '../hooks/useAttachments';
import { getFileIcon } from '../utils/fileHelpers';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isThinking: boolean;
  onStop?: () => void;
}

export const AttachmentChip: React.FC<{attachment: Attachment, onRemove: () => void}> = ({ attachment, onRemove }) => {
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

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isThinking, onStop }) => {
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

  const canSend = !isThinking && (text.trim() || attachments.length > 0);
  const isStopState = isThinking;
  const isDisabled = !isStopState && !canSend;

  return (
    <div className="flex items-end gap-2.5">
      <input type="file" accept="image/*,application/pdf,text/plain,text/markdown,.md,.txt" ref={fileInputRef} onChange={(e) => {
        // 对部分浏览器 file.type 识别不准做兜底：基于扩展名补充类型
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
            // 无法直接改 File 对象，只在读取时兜底：通过 handleFileChange 使用 name/size/preview
            // 这里直接调用原 handle，因其会读取 file 本身的 type；为不支持的情况在 utils 中也有进一步兜底
            return f;
          });
        }
        handleFileChange(e);
      }} className="hidden" multiple />
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
      <button
        onClick={isStopState ? onStop : handleSendClick}
        disabled={isDisabled}
        className={[
          'flex items-center justify-center size-12 rounded-xl text-white shrink-0',
          isStopState ? 'bg-red-600 hover:bg-red-700' : '',
          canSend && !isStopState ? 'bg-primary hover:bg-primary/90' : '',
          isDisabled ? 'bg-neutral-400 dark:bg-neutral-600 cursor-not-allowed' : ''
        ].join(' ').trim()}
      >
        {isStopState ? (
          <span className="material-symbols-outlined !text-2xl">stop</span>
        ) : (
          <span className="material-symbols-outlined !text-2xl">send</span>
        )}
      </button>
    </div>
  );
};

export default ChatInput;
