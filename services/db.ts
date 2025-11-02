// FIX: Updated to newer database logic, which was previously in the wrong file (`types.ts`).
// This version includes schema upgrades and function signatures that match their usage in the app.
import { Message, Note, Conversation, AttachmentStored, MessageStored } from '../types';
import { handleError } from './errorHandler';

const DB_NAME = 'HeyMeanDB';
const DB_VERSION = 5; // Incremented version for schema change (notes title split)

const MESSAGES_STORE = 'messages';
const NOTES_STORE = 'notes';
const SETTINGS_STORE = 'settings';
const CONVERSATIONS_STORE = 'conversations';

let db: IDBDatabase;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            reject(handleError((event.target as IDBRequest).error, 'db'));
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBRequest).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBRequest).result;
            const transaction = (event.target as IDBOpenDBRequest).transaction;
            const oldVersion = (event.target as IDBOpenDBRequest).result.version;
            
            // Messages Store
            if (!dbInstance.objectStoreNames.contains(MESSAGES_STORE)) {
                const messagesStore = dbInstance.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
            } else {
                 const messagesStore = transaction.objectStore(MESSAGES_STORE);
                 if (!messagesStore.indexNames.contains('conversationId')) {
                    messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
                 }
            }

            // Notes Store
            if (!dbInstance.objectStoreNames.contains(NOTES_STORE)) {
                const notesStore = dbInstance.createObjectStore(NOTES_STORE, { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                notesStore.createIndex('isPinned', 'isPinned', { unique: false }); // Add index on creation
            } else {
                const notesStore = transaction.objectStore(NOTES_STORE);
                // Ensure updatedAt index exists for older DBs
                if (!notesStore.indexNames.contains('updatedAt')) {
                    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
                if (!notesStore.indexNames.contains('isPinned')) {
                    notesStore.createIndex('isPinned', 'isPinned', { unique: false }); // Add index to existing store
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
                        // No need to block upgrade completion on migration; best-effort
                    }
                } catch (e) {
                    // Best-effort migration; ignore errors to avoid blocking app
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
    });
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
        const conversationWithDefault = { ...conversation, isPinned: false };
        const request = store.add(conversationWithDefault);
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
            const conversations = request.result.reverse() as Conversation[];
            // Sort by pinned status first, then by date.
            // Since the list is already sorted by date, we just need to bring pinned items to the top.
            conversations.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0; // Keep original date-based order for items with same pinned status
            });
            resolve(conversations);
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const getLatestConversation = async (): Promise<Conversation | undefined> => {
    const conversations = await getConversations();
    // After sorting, the latest unpinned conversation might not be at index 0 if there are pins.
    // So we need to find the one with the most recent updatedAt timestamp.
    if (conversations.length === 0) return undefined;
    return conversations.reduce((latest, current) => {
        return latest.updatedAt > current.updatedAt ? latest : current;
    });
};

export const updateConversation = async (id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const getRequest = store.get(id);

    return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
            const conversation = getRequest.result;
            if (conversation) {
                const updatedConversation = { ...conversation, ...updates };
                const putRequest = store.put(updatedConversation);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(handleError(putRequest.error, 'db'));
            } else {
                reject(new Error("Conversation not found"));
            }
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
        transaction.oncomplete = () => resolve();

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
            const all = (request.result || []) as Note[];
            // Sort by updatedAt desc
            const sortedByDate = all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            // Then bring pinned to top, keep date order within groups
            sortedByDate.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });
            resolve(sortedByDate);
        };
        request.onerror = () => reject(handleError(request.error, 'db'));
    });
};

export const addNote = async (title: string = 'New Note', content: string = ''): Promise<Note> => {
    const db = await initDB();
    const newNote: Omit<Note, 'id'> = {
        title,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPinned: false
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

export const updateNote = async (id: number, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    const getRequest = store.get(id);

    return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
            const note = getRequest.result;
            if (note) {
                // Always update timestamp on any change
                const updatedNote = { ...note, ...updates, updatedAt: new Date() };
                const putRequest = store.put(updatedNote);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(handleError(putRequest.error, 'db'));
            } else {
                reject(new Error("Note not found"));
            }
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
