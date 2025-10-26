import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Attachment, ApiProvider } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { useSettings } from '../hooks/useSettings';


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


const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { selectedApiProvider } = useSettings();
    const [prompt, setPrompt] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (prompt.trim() || attachments.length > 0) {
            navigate('/chat', { state: { initialPrompt: prompt, initialAttachments: attachments, newChat: true } });
        }
    };

    const handleContinue = () => {
        navigate('/chat', { state: { newChat: false } });
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
        if(fileInputRef.current) fileInputRef.current.value = '';
    };
    
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };
    
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="relative flex h-screen min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
            <div className="flex flex-col flex-1 justify-center items-center p-4">
                <div className="w-full max-w-[480px] flex flex-col items-center gap-8">
                    <h1 className="text-5xl font-bold text-center whitespace-pre-line">{t('home.title')}</h1>
                    <div className="flex flex-col gap-4 w-full">
                        <div className="relative w-full">
                            <div className={`form-input flex w-full flex-col min-w-0 flex-1 bg-heymean-l dark:bg-heymean-d rounded-xl`}>
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
                                    className="w-full resize-none overflow-hidden text-primary-text-light dark:text-primary-text-dark focus:outline-0 border-none bg-transparent min-h-36 placeholder:text-gray-500 dark:placeholder:text-gray-400 p-4 pb-14 text-base font-normal leading-normal"
                                    placeholder={t('home.input_placeholder')}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                ></textarea>
                            </div>

                            <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                <input type="file" accept="image/*,application/pdf,text/plain,text/markdown,.md,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple/>
                                <button onClick={triggerFileInput} className="flex size-8 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-primary-text-light dark:text-primary-text-dark">
                                    <span className="material-symbols-outlined text-base">attach_file</span>
                                </button>
                            </div>
                            <button onClick={handleSend} className="absolute bottom-4 right-4 text-primary-text-light dark:text-primary-text-dark">
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                        <div className="flex px-4 py-3 w-full">
                            <button onClick={handleContinue} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark text-base font-bold leading-normal tracking-[0.015em]">
                                <span className="truncate">{t('home.button_continue')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;