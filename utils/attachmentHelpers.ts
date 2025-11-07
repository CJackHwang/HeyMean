import { Message, Attachment } from '../types';

export const createAttachmentPreview = async (attachment: Attachment): Promise<Attachment> => {
  if (!attachment.data || !attachment.type.startsWith('image/')) {
    return attachment;
  }

  try {
    const response = await fetch(attachment.data);
    const blob = await response.blob();
    const previewUrl = URL.createObjectURL(blob);
    return { ...attachment, preview: previewUrl };
  } catch (error) {
    console.error('Error creating blob from data URL:', error);
    return attachment;
  }
};

export const createMessagePreviews = async (
  message: Message,
  urlsToRevoke: Set<string>
): Promise<Message> => {
  if (!message.attachments || message.attachments.length === 0) {
    return message;
  }

  const attachmentsWithPreview = await Promise.all(
    message.attachments.map(async (attachment) => {
      const processedAttachment = await createAttachmentPreview(attachment);
      if (processedAttachment.preview) {
        urlsToRevoke.add(processedAttachment.preview);
      }
      return processedAttachment;
    })
  );

  return { ...message, attachments: attachmentsWithPreview };
};

export const createMessagesPreviews = async (
  messages: Message[],
  urlsToRevoke: Set<string>
): Promise<Message[]> => {
  return Promise.all(messages.map(msg => createMessagePreviews(msg, urlsToRevoke)));
};

export const trackAttachmentPreviews = (attachments: Attachment[], urlsToRevoke: Set<string>): void => {
  attachments.forEach(attachment => {
    if (attachment.preview) {
      urlsToRevoke.add(attachment.preview);
    }
  });
};

export const revokeUrls = (urls: string[]): void => {
  urls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Silently ignore errors
    }
  });
};
