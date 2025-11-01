// FIX: Define and export all application-wide types to resolve circular dependency and missing export errors.
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum ApiProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
}

export enum Language {
  EN = 'en',
  ZH_CN = 'zh-CN',
  JA = 'ja',
}

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

export interface Attachment {
  name: string;
  size: number;
  type: string;
  data: string; // base64 data URL
  preview?: string; // Object URL for image previews
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  attachments?: Attachment[];
  isLoading?: boolean;
  thinkingText?: string;
  isThinkingComplete?: boolean;
  thinkingStartTime?: number;
  thinkingDuration?: number;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
}

export interface Conversation {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    isPinned?: boolean;
}
