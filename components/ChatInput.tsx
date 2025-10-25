
import React, { useState, useRef } from 'react';
import { Attachment } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface ChatInputProps {
  onSend: (text: string, attachment: Attachment | null) => void;
  isThinking: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isThinking }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleSendClick = () => {
    if (text.trim() || attachment) {
      onSend(text, attachment);
      setText('');
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
       const preview = URL.createObjectURL(file);
       const reader = new FileReader();
       reader.readAsDataURL(file);
       reader.onloadend = () => {
            setAttachment({
                name: file.name,
                size: file.size,
                type: file.type,
                data: reader.result as string,
                preview: preview,
            });
       }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-end gap-2.5">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      <button onClick={triggerFileInput} className="flex items-center justify-center size-10 rounded-xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark shrink-0">
        <span className="material-symbols-outlined !text-xl">attach_file</span>
      </button>
      <div className="flex flex-col min-w-0 flex-1 relative">
        {attachment && (
            <div className="p-2 bg-heymean-l dark:bg-heymean-d rounded-t-xl">
                <div className="relative w-16 h-16">
                    <img src={attachment.preview} alt={attachment.name} className="w-full h-full object-cover rounded-lg"/>
                    <button onClick={() => setAttachment(null)} className="absolute -top-1 -right-1 bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                </div>
            </div>
        )}
        <textarea
          className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden text-primary-text-light dark:text-primary-text-dark focus:outline-0 focus:ring-2 focus:ring-primary dark:focus:ring-white border-none bg-heymean-l dark:bg-heymean-d placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 py-3 text-sm font-normal leading-normal h-12 ${attachment ? 'rounded-b-xl' : 'rounded-xl'}`}
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
      <button onClick={handleSendClick} disabled={isThinking} className="flex items-center justify-center size-12 rounded-xl bg-primary text-white shrink-0 disabled:bg-gray-400">
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
