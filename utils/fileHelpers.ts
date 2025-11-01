
import { Attachment } from '../types';

const inferMimeTypeFromName = (filename: string): string | undefined => {
  const name = filename.toLowerCase();
  const ext = name.split('.').pop() || '';
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  if (ext === 'txt' || ext === 'text') return 'text/plain';
  if (ext === 'pdf') return 'application/pdf';
  if (['png','jpg','jpeg','gif','webp','bmp'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  return undefined;
};

export const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType === 'text/markdown') return 'article';
    if (mimeType.startsWith('text/')) return 'description';
    return 'attach_file';
};

export const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const dataURLtoBlob = (dataurl: string): Blob => {
    const commaIndex = dataurl.indexOf(',');
    if (commaIndex === -1) throw new Error('Invalid data URL: missing comma');
    const header = dataurl.substring(0, commaIndex);
    const base64 = dataurl.substring(commaIndex + 1);
    const mimeMatch = header.match(/data:(.*?)(;base64)?$/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error('Invalid data URL: missing MIME');
    const mime = mimeMatch[1];
    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], { type: mime });
}

export const compressImage = (file: File, maxWidthOrHeight = 1024, quality = 0.8): Promise<Attachment> => {
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

export const readFileAsAttachment = (file: File): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type || inferMimeTypeFromName(file.name) || 'text/plain',
          data: event.target?.result as string,
        });
      };
      reader.onerror = (error) => reject(error);
    });
};


export const getTextFromDataUrl = async (dataUrl: string): Promise<string> => {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`Failed to fetch data URL: ${response.statusText}`);
        return response.text();
    } catch (error) {
        console.error("Error fetching text from data URL:", error);
        try {
            const base64 = dataUrl.split(',')[1];
            return atob(base64);
        } catch (decodeError) {
             console.error("Error decoding base64 from data URL:", decodeError);
             return "";
        }
    }
};

export const getInlineDataFromDataUrl = (dataUrl: string, fallbackMime?: string): { base64Data: string; mimeType: string } => {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) throw new Error('Invalid data URL: missing comma');
    const header = dataUrl.substring(0, commaIndex);
    const base64Data = dataUrl.substring(commaIndex + 1);
    const mimeMatch = header.match(/^data:([^;]+)(;base64)?$/);
    const mimeType = mimeMatch && mimeMatch[1] ? mimeMatch[1] : (fallbackMime || 'application/octet-stream');
    if (!base64Data) throw new Error('Invalid data URL: empty payload');
    return { base64Data, mimeType };
};
