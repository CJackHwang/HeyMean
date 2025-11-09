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
  data: string;
  preview?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  attachments?: Attachment[];
  isLoading?: boolean;
  thinkingText?: string;
  isThinkingComplete?: boolean;
  thinkingStartTime?: number;
  thinkingDuration?: number;
}

export type AttachmentStored = Omit<Attachment, 'preview'>;

export type MessageStored = Omit<
  Message,
  'timestamp' | 'attachments' | 'isLoading' | 'isThinkingComplete' | 'thinkingStartTime' | 'thinkingDuration'
> & {
  timestamp: string;
  attachments?: AttachmentStored[];
};

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

export type ConversationUpdate = Partial<Omit<Conversation, 'id' | 'createdAt'>>;
export type NoteUpdate = Partial<Omit<Note, 'id' | 'createdAt'>>;

export interface StreamOptions {
  provider: ApiProvider;
  systemInstruction: string;
  geminiApiKey: string;
  geminiModel: string;
  openAiApiKey: string;
  openAiModel: string;
  openAiBaseUrl: string;
}
