import { Message, Note, Conversation, AttachmentStored, MessageStored, ConversationUpdate, NoteUpdate } from '@shared/types';
import { AppError, handleError } from './errorHandler';

const DB_NAME = 'HeyMeanDB';
const DB_VERSION = 5; // Incremented version for schema change (notes title split)

const MESSAGES_STORE = 'messages';
const NOTES_STORE = 'notes';
const SETTINGS_STORE = 'settings';
const CONVERSATIONS_STORE = 'conversations';

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

const ensureDate = (value: unknown, fallback: Date = new Date()): Date => {
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) return new Date(parsed);
    }
    return fallback;
};

const hydrateConversation = (record: Record<string, unknown>): Conversation => ({
    id: String(record.id ?? ''),
    title: typeof record.title === 'string' && record.title.trim().length > 0 ? record.title : 'New Conversation',
    createdAt: ensureDate(record.createdAt),
    updatedAt: ensureDate(record.updatedAt),
    isPinned: record.isPinned === true,
});

const hydrateNote = (record: Record<string, unknown>): Note => ({
    id: typeof record.id === 'number' ? record.id : Number(record.id ?? Date.now()),
    title: typeof record.title === 'string' && record.title.trim().length > 0 ? record.title : 'New Note',
    content: typeof record.content === 'string' ? record.content : '',
    createdAt: ensureDate(record.createdAt),
    updatedAt: ensureDate(record.updatedAt),
    isPinned: record.isPinned === true,
});

const prepareConversationForStore = (conversation: Conversation): Conversation => ({
    ...conversation,
    createdAt: ensureDate(conversation.createdAt),
    updatedAt: ensureDate(conversation.updatedAt),
    isPinned: conversation.isPinned ?? false,
});

const prepareNoteForStore = <T extends { createdAt: unknown; updatedAt: unknown; isPinned?: boolean }>(note: T): T & {
    createdAt: Date;
    updatedAt: Date;
    isPinned: boolean;
} => ({
    ...note,
    createdAt: ensureDate(note.createdAt),
    updatedAt: ensureDate(note.updatedAt),
    isPinned: note.isPinned ?? false,
});

export const initDB = (): Promise<IDBDatabase> => {
    if (db) {
        return Promise.resolve(db);
    }

    if (dbPromise) {
        return dbPromise;
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.reject(new AppError('DB_NOT_SUPPORTED', 'Your browser does not support IndexedDB. Please use a modern browser to access HeyMean.', undefined));
    }

    dbPromise = new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                const err = handleError((event.target as IDBRequest).error, 'db');
                dbPromise = null;
                reject(err);
            };

            request.onsuccess = (event) => {
                db = (event.target as IDBRequest).result;
                if (db) {
                    db.onversionchange = () => {
                        try {
                            db?.close();
                        } catch {}
                        db = null;
                    };
                }
                dbPromise = null;
                resolve(db!);
            };

            request.onblocked = () => {
                dbPromise = null;
                reject(new AppError('DB_BLOCKED', 'A previous version of the HeyMean database is still open in another tab. Please close other tabs or reload this one.', undefined));
            };

            request.onupgradeneeded = (event) => {
                const dbInstance = (event.target as IDBRequest).result;
                const transaction = (event.target as IDBOpenDBRequest).transaction;

                // Messages Store
                if (!dbInstance.objectStoreNames.contains(MESSAGES_STORE)) {
                    const messagesStore = dbInstance.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                    messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
                } else if (transaction) {
                    const messagesStore = transaction.objectStore(MESSAGES_STORE);
                    if (!messagesStore.indexNames.contains('conversationId')) {
                        messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
                    }
                }

                // Notes Store
                if (!dbInstance.objectStoreNames.contains(NOTES_STORE)) {
                    const notesStore = dbInstance.createObjectStore(NOTES_STORE, { keyPath: 'id', autoIncrement: true });
                    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    notesStore.createIndex('isPinned', 'isPinned', { unique: false });
                } else if (transaction) {
                    const notesStore = transaction.objectStore(NOTES_STORE);
                    if (!notesStore.indexNames.contains('updatedAt')) {
                        notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    }
                    if (!notesStore.indexNames.contains('isPinned')) {
                        notesStore.createIndex('isPinned', 'isPinned', { unique: false });
                    }
                }

                // Migration for v5: split title from content for existing notes
                if (transaction && (event as IDBVersionChangeEvent).oldVersion < 5) {
                    try {
                        const notesStore = transaction.objectStore(NOTES_STORE);
                        const getAllReq = (notesStore.getAll && notesStore.getAll()) as IDBRequest<unknown[]> | undefined;
                        if (getAllReq) {
                            getAllReq.onsuccess = () => {
                                const allNotes = (getAllReq.result || []) as unknown[];
                                allNotes.forEach((noteUnknown) => {
                                    const noteObj = noteUnknown as Record<string, unknown>;
                                    if (!('title' in noteObj)) {
                                        const contentVal = noteObj['content'];
                                        const raw = typeof contentVal === 'string' ? contentVal : '';
                                        const [first, ...rest] = raw.split('\n');
                                        const title = first && first.trim().length > 0 ? first.trim() : 'New Note';
                                        const content = rest.join('\n');
                                        const updated = { ...noteObj, title, content } as Note;
                                        notesStore.put(updated);
                                    }
                                });
                            };
                        }
                    } catch (e) {
                        console.warn('Notes migration to v5 failed:', e);
                    }
                }

                // Settings Store
                if (!dbInstance.objectStoreNames.contains(SETTINGS_STORE)) {
                    dbInstance.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
                }

                // Conversations Store
                if (!dbInstance.objectStoreNames.contains(CONVERSATIONS_STORE)) {
                    const conversationsStore = dbInstance.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
                    conversationsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            };
        } catch (error) {
            dbPromise = null;
            reject(handleError(error, 'db'));
        }
    });

    return dbPromise;
};

// Settings Functions
export const getSetting = async <T>(key: string): Promise<T | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SETTINGS_STORE, 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const setSetting = async (key: string, value: unknown): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

// Message Functions (now conversation-scoped)
export const getMessages = async (conversationId: string): Promise<Message[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readonly');
        const store = transaction.objectStore(MESSAGES_STORE);
        const index = store.index('conversationId');
        const request = index.getAll(conversationId);
        request.onsuccess = () => {
            const raw = (request.result || []) as MessageStored[];
            const sorted = raw.sort((a, b) => a.id.localeCompare(b.id));
            const withDate: Message[] = sorted.map((m) => {
                const parsed = Date.parse(m.timestamp);
                const ts = isNaN(parsed) ? new Date(Number(m.id)) : new Date(parsed);
                return { ...m, timestamp: ts } as Message;
            });
            resolve(withDate);
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

// Get messages with pagination - loads latest messages first
export const getMessagesPaginated = async (
    conversationId: string,
    limit: number,
    beforeMessageId?: string
): Promise<{ messages: Message[]; hasMore: boolean }> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readonly');
        const store = transaction.objectStore(MESSAGES_STORE);
        const index = store.index('conversationId');
        const request = index.getAll(conversationId);
        request.onsuccess = () => {
            const raw = (request.result || []) as MessageStored[];
            const sorted = raw.sort((a, b) => a.id.localeCompare(b.id));
            
            let startIndex = 0;
            if (beforeMessageId) {
                const beforeIndex = sorted.findIndex(m => m.id === beforeMessageId);
                if (beforeIndex > 0) {
                    startIndex = Math.max(0, beforeIndex - limit);
                } else {
                    // beforeMessageId not found, return empty
                    resolve({ messages: [], hasMore: false });
                    return;
                }
            } else {
                // Load from the end (latest messages)
                startIndex = Math.max(0, sorted.length - limit);
            }
            
            const endIndex = beforeMessageId 
                ? sorted.findIndex(m => m.id === beforeMessageId)
                : sorted.length;
            
            const slice = sorted.slice(startIndex, endIndex);
            const withDate: Message[] = slice.map((m) => {
                const parsed = Date.parse(m.timestamp);
                const ts = isNaN(parsed) ? new Date(Number(m.id)) : new Date(parsed);
                return { ...m, timestamp: ts } as Message;
            });
            
            const hasMore = startIndex > 0;
            resolve({ messages: withDate, hasMore });
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const addMessage = async (message: Message): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = transaction.objectStore(MESSAGES_STORE);
        
        const messageToStore: MessageStored = {
            id: message.id,
            conversationId: message.conversationId,
            sender: message.sender,
            text: message.text,
            timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : String(message.timestamp),
            attachments: message.attachments ? message.attachments.map(({ preview, ...rest }) => rest) : undefined,
        };
        
        // messageToStore is already sanitized to storage shape
        
        const request = store.put(messageToStore);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const batchAddMessages = async (messages: Message[]): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = transaction.objectStore(MESSAGES_STORE);

        messages.forEach(message => {
            const messageToStore: MessageStored = {
                id: message.id,
                conversationId: message.conversationId,
                sender: message.sender,
                text: message.text,
                timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : String(message.timestamp),
                attachments: message.attachments ? message.attachments.map(({ preview, ...rest }) => rest) : undefined,
            };
            store.put(messageToStore);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(handleError(transaction.error, 'db'));
    });
};

export const deleteMessage = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = transaction.objectStore(MESSAGES_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const batchDeleteMessages = async (ids: string[]): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = transaction.objectStore(MESSAGES_STORE);
        ids.forEach(id => store.delete(id));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(handleError(transaction.error, 'db'));
    });
};


// Conversation Functions
export const addConversation = async (conversation: Conversation): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
        const store = transaction.objectStore(CONVERSATIONS_STORE);
        const request = store.add(prepareConversationForStore(conversation));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const getConversations = async (): Promise<Conversation[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CONVERSATIONS_STORE, 'readonly');
        const store = transaction.objectStore(CONVERSATIONS_STORE);
        const index = store.index('updatedAt');
        const request = index.getAll();
        request.onsuccess = () => {
            const raw = (request.result || []) as Record<string, unknown>[];
            const hydrated = raw.map(hydrateConversation);
            hydrated.sort((a, b) => {
                if ((a.isPinned === true) !== (b.isPinned === true)) {
                    return a.isPinned ? -1 : 1;
                }
                return b.updatedAt.getTime() - a.updatedAt.getTime();
            });
            resolve(hydrated);
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const getLatestConversation = async (): Promise<Conversation | undefined> => {
    const conversations = await getConversations();
    if (conversations.length === 0) return undefined;
    return conversations.reduce((latest, current) => {
        return current.updatedAt.getTime() > latest.updatedAt.getTime() ? current : latest;
    });
};

export const updateConversation = async (id: string, updates: ConversationUpdate): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const getRequest = store.get(id);

    return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
            const conversationRecord = getRequest.result as Record<string, unknown> | undefined;
            if (!conversationRecord) {
                reject(new Error("Conversation not found"));
                return;
            }

            const conversation = hydrateConversation(conversationRecord);
            const merged: Conversation = {
                ...conversation,
                ...updates,
                updatedAt: ensureDate((updates?.updatedAt as Date | undefined) ?? conversation.updatedAt),
                isPinned: updates?.isPinned ?? conversation.isPinned,
            };

            const putRequest = store.put(prepareConversationForStore(merged));
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(handleError(putRequest.error, 'db'));
        };
        getRequest.onerror = () => reject(handleError(getRequest.error, 'db'));
    });
};

export const deleteConversation = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite');
        const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE);
        const messagesStore = transaction.objectStore(MESSAGES_STORE);
        const messageIndex = messagesStore.index('conversationId');

        // 1. Delete conversation
        const deleteConvRequest = conversationsStore.delete(id);
        deleteConvRequest.onerror = () => reject(handleError(deleteConvRequest.error, 'db'));

        // 2. Delete all associated messages using a cursor
        const cursorRequest = messageIndex.openCursor(IDBKeyRange.only(id));
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        cursorRequest.onerror = () => reject(handleError(cursorRequest.error, 'db'));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(handleError(transaction.error, 'db'));
    });
};


// Data Clearing Functions
export const clearAllData = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MESSAGES_STORE, NOTES_STORE, SETTINGS_STORE, CONVERSATIONS_STORE], 'readwrite');
        transaction.onerror = (event) => reject(handleError((event.target as IDBRequest).error, 'db'));
        transaction.oncomplete = () => {
            try { window.dispatchEvent(new Event('hm:data-cleared')); } catch {}
            resolve();
        };

        transaction.objectStore(MESSAGES_STORE).clear();
        transaction.objectStore(NOTES_STORE).clear();
        transaction.objectStore(SETTINGS_STORE).clear();
        transaction.objectStore(CONVERSATIONS_STORE).clear();
    });
};

// Note Functions
export const getNotes = async (): Promise<Note[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE, 'readonly');
        const store = transaction.objectStore(NOTES_STORE);
        let request: IDBRequest<Note[]>;
        try {
            const index = store.index('updatedAt');
            request = index.getAll();
        } catch (e) {
            // Fallback for legacy DBs without the index
            request = store.getAll() as IDBRequest<Note[]>;
        }
        request.onsuccess = () => {
            const rawUnknown = (request.result || []) as unknown[];
            const hydrated = rawUnknown.map((rec) => hydrateNote(rec as Record<string, unknown>));
            hydrated.sort((a, b) => {
                if ((a.isPinned === true) !== (b.isPinned === true)) {
                    return a.isPinned ? -1 : 1;
                }
                return b.updatedAt.getTime() - a.updatedAt.getTime();
            });
            resolve(hydrated);
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const getNoteById = async (id: number): Promise<Note | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE, 'readonly');
        const store = transaction.objectStore(NOTES_STORE);
        const request = store.get(id);
        request.onsuccess = () => {
            const record = request.result as Record<string, unknown> | undefined;
            resolve(record ? hydrateNote(record) : undefined);
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const addNote = async (title: string = 'New Note', content: string = '', isPinned: boolean = false): Promise<Note> => {
    const db = await initDB();
    const newNote: Omit<Note, 'id'> = {
        title,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPinned
    };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE, 'readwrite');
        const store = transaction.objectStore(NOTES_STORE);
        const request = store.add(newNote);
        request.onsuccess = () => {
            resolve({ ...newNote, id: request.result as number });
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const updateNote = async (id: number, updates: NoteUpdate): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    const getRequest = store.get(id);

    return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
            const noteRecord = getRequest.result as Record<string, unknown> | undefined;
            if (!noteRecord) {
                reject(new Error("Note not found"));
                return;
            }

            const note = hydrateNote(noteRecord);
            const merged: Note = {
                ...note,
                ...updates,
                updatedAt: new Date(),
            };

            const putRequest = store.put(prepareNoteForStore(merged));
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(handleError(putRequest.error, 'db'));
        };
        getRequest.onerror = () => reject(handleError(getRequest.error, 'db'));
    });
};

export const deleteNote = async (id: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE, 'readwrite');
        const store = transaction.objectStore(NOTES_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};
