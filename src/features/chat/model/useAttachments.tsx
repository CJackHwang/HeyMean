
import React, { useState, useRef } from 'react';
import { Attachment, ApiProvider } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';
import { useSettings } from '@app/providers/useSettings';
import { useToast } from '@app/providers/useToast';
import { MAX_ATTACHMENTS, MAX_FILE_SIZE_MB } from '@shared/lib/constants';
import { compressImage, readFileAsAttachment } from '@shared/lib/fileHelpers';
import { handleError } from '@shared/services/errorHandler';

export const useAttachments = () => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { selectedApiProvider } = useSettings();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        if (attachments.length + files.length > MAX_ATTACHMENTS) {
            showToast(t('file.max_attachments_error', MAX_ATTACHMENTS), 'error');
            return;
        }

        const newAttachments: Attachment[] = [...attachments];
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                 showToast(t('file.size_error', file.name, MAX_FILE_SIZE_MB), 'error');
                 continue;
            }
            if (selectedApiProvider === ApiProvider.OPENAI && file.type === 'application/pdf') {
                showToast(t('file.pdf_not_supported_openai'), 'error');
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
                const appError = handleError(error, 'file');
                showToast(appError.userMessage, 'error');
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