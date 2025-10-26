import React, { useState, useRef } from 'react';
import { Attachment, ApiProvider } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useSettings } from '../hooks/useSettings';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  isThinking: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_ATTACHMENTS = 4;

const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], { type: mime });
}

const compressImage = (file: File, maxWidthOrHeight = 1024, quality = 0.8): Promise<Attachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));

        let { width, height } = img;
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height *= maxWidthOrHeight / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width *= maxWidthOrHeight / height;
            height = maxWidthOrHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL(file.type, quality);
        const compressedBlob = dataURLtoBlob(compressedDataUrl);

        resolve({
          name: file.name,
          size: compressedBlob.size,
          type: compressedBlob.type,
          data: compressedDataUrl,
          preview: URL.createObjectURL(compressedBlob),
        });
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const readFileAsAttachment = (file: File): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain', // Fix: Default to text/plain for better compatibility
          data: event.target?.result as string,
        });
      };
      reader.onerror = (error) => reject(error);
    });
};

const AttachmentChip: React.FC<{attachment: Attachment, onRemove: () => void}> = ({ attachment, onRemove }) => {
    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'picture_as_pdf';
        if (mimeType === 'text/markdown') return 'article';
        if (mimeType.startsWith('text/')) return 'description';
        return 'attach_file';
    };

    return (
        <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-full pl-2 pr-1 py-1 text-sm text-primary-text-light dark:text-primary-text-dark">
            {attachment.preview ? (
                 <img src={attachment.preview} alt={attachment.name} className="w-5 h-5 object-cover rounded-full"/>
            ) : (
                <span className="material-symbols-outlined !text-base">{getFileIcon(attachment.type)}</span>
            )}
            <span className="truncate max-w-28">{attachment.name}</span>
            <button onClick={onRemove} className="flex items-center justify-center size-5 bg-gray-500 text-white rounded-full shrink-0 hover:bg-gray-600">
                <span className="material-symbols-outlined !text-sm">close</span>
            </button>
        </div>
    )
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isThinking }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { selectedApiProvider } = useSettings();

  const handleSendClick = () => {
    if (text.trim() || attachments.length > 0) {
      onSend(text, attachments);
      setText('');
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
        alert(`You can upload a maximum of ${MAX_ATTACHMENTS} files.`);
        return;
    }

    const newAttachments: Attachment[] = [...attachments];
    // Fix: Iterate directly over the FileList. `Array.from(files)` was causing `file` to be of type `unknown`.
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
             alert(t('file.size_error', file.name, MAX_FILE_SIZE_MB));
             continue;
        }
        if (selectedApiProvider === ApiProvider.OPENAI && file.type === 'application/pdf') {
            alert(t('file.pdf_not_supported_openai'));
            continue;
        }

        try {
            let newAttachment: Attachment;
            if (file.type.startsWith('image/')) {
                newAttachment = await compressImage(file);
            } else {
                newAttachment = await readFileAsAttachment(file);
            }
            newAttachments.push(newAttachment);
        } catch (error) {
            console.error("Error processing file:", error);
            alert(`Error processing ${(error as File).name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    setAttachments(newAttachments.slice(0, MAX_ATTACHMENTS));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };


  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-end gap-2.5">
      <input type="file" accept="image/*,application/pdf,text/plain,text/markdown,.md,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
      <button onClick={triggerFileInput} className="flex items-center justify-center size-10 rounded-xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark shrink-0">
        <span className="material-symbols-outlined !text-xl">attach_file</span>
      </button>
      <div className="flex flex-col min-w-0 flex-1 relative bg-heymean-l dark:bg-heymean-d rounded-xl">
        {attachments.length > 0 && (
            <div className="p-2 border-b border-gray-300 dark:border-gray-700/50">
                <div className="flex flex-wrap gap-2">
                    {attachments.map((att, index) => (
                        <AttachmentChip key={index} attachment={att} onRemove={() => removeAttachment(index)} />
                    ))}
                </div>
            </div>
        )}
        <textarea
          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden text-primary-text-light dark:text-primary-text-dark focus:outline-0 border-none bg-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 py-3 text-sm font-normal leading-normal h-12"
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
      <button onClick={handleSendClick} disabled={isThinking || (!text.trim() && attachments.length === 0)} className="flex items-center justify-center size-12 rounded-xl bg-primary text-white shrink-0 disabled:bg-gray-400">
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