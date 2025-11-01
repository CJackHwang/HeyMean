
import { Attachment } from '../types';

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
          type: file.type || 'text/plain',
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
