

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

export interface Attachment {
  name: string;
  size: number;
  type: string;
  data: string; // base64 encoded data
  preview?: string; // URL.createObjectURL for preview, not stored in DB
}

export interface Message {
  id: string;
  conversationId: string; // Added to associate message with a conversation
  sender: MessageSender;
  text: string;
  timestamp: string;
  attachments?: Attachment[];
  isLoading?: boolean; // UI state, not stored in DB
  thinkingText?: string; // Real-time thinking process from AI, stored in DB
  isThinkingComplete?: boolean; // UI state, not stored in DB
  thinkingStartTime?: number; // UI state, not stored in DB
  thinkingDuration?: number; // UI state, not stored in DB
}

export interface Conversation {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum Theme {
    LIGHT = 'light',
    DARK = 'dark'
}

export enum ApiProvider {
    GEMINI = 'gemini',
    OPENAI = 'openai'
}

export interface Note {
    id: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum Language {
    EN = 'en',
    ZH_CN = 'zh-CN',
    JA = 'ja'
}
