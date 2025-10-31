
import React, { useState, useRef } from 'react';
import { Attachment, ApiProvider } from '../types';
import { useTranslation } from './useTranslation';
import { useSettings } from './useSettings';

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
          type: file.type || 'text/plain',
          data: event.target?.result as string,
        });
      };
      reader.onerror = (error) => reject(error);
    });
};

export const useAttachments = () => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();
    const { selectedApiProvider } = useSettings();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        if (attachments.length + files.length > MAX_ATTACHMENTS) {
            alert(`You can upload a maximum of ${MAX_ATTACHMENTS} files.`);
            return;
        }

        const newAttachments: Attachment[] = [...attachments];
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

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const resetAttachments = () => {
        setAttachments([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return {
        attachments,
        setAttachments,
        fileInputRef,
        handleFileChange,
        removeAttachment,
        triggerFileInput,
        resetAttachments,
    };
};