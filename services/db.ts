import { Message, Note, Conversation } from '../types';

const DB_NAME = 'HeyMeanDB';
const DB_VERSION = 2; // Incremented version for schema change

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
            console.error("Database error: ", (event.target as IDBRequest).error);
            reject("Database error");
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBRequest).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBRequest).result;
            
            // Messages Store
            if (!dbInstance.objectStoreNames.contains(MESSAGES_STORE)) {
                const messagesStore = dbInstance.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
            } else {
                 const transaction = (event.target as IDBOpenDBRequest).transaction;
                 const messagesStore = transaction.objectStore(MESSAGES_STORE);
                 if (!messagesStore.indexNames.contains('conversationId')) {
                    messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
                 }
            }

            // Notes Store
            if (!dbInstance.objectStoreNames.contains(NOTES_STORE)) {
                const notesStore = dbInstance.createObjectStore(NOTES_STORE, { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
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
        request.onerror = () => reject(request.error);
    });
};

export const setSetting = async (key: string, value: any): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
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
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.id.localeCompare(b.id)));
        request.onerror = () => reject(request.error);
    });
};

export const addMessage = async (message: Message): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = transaction.objectStore(MESSAGES_STORE);
        
        const messageToStore = { ...message };
        
        delete messageToStore.isLoading; 
        delete messageToStore.isThinkingComplete;
        delete messageToStore.thinkingStartTime;
        
        if (messageToStore.attachments) {
            messageToStore.attachments = messageToStore.attachments.map(att => {
                const { preview, ...rest } = att;
                return rest;
            });
        }
        
        const request = store.put(messageToStore);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Conversation Functions
export const addConversation = async (conversation: Conversation): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
        const store = transaction.objectStore(CONVERSATIONS_STORE);
        const request = store.add(conversation);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getConversations = async (): Promise<Conversation[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CONVERSATIONS_STORE, 'readonly');
        const store = transaction.objectStore(CONVERSATIONS_STORE);
        const index = store.index('updatedAt');
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result.reverse());
        request.onerror = () => reject(request.error);
    });
};

export const getLatestConversation = async (): Promise<Conversation | undefined> => {
    const conversations = await getConversations();
    return conversations[0];
};

export const updateConversationTimestamp = async (id: string): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const getRequest = store.get(id);
    return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
            const conversation = getRequest.result;
            if (conversation) {
                conversation.updatedAt = new Date();
                const putRequest = store.put(conversation);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error("Conversation not found"));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
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
        deleteConvRequest.onerror = () => reject(deleteConvRequest.error);

        // 2. Delete all associated messages using a cursor
        const cursorRequest = messageIndex.openCursor(IDBKeyRange.only(id));
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};


// Data Clearing Functions
export const clearAllData = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MESSAGES_STORE, NOTES_STORE, SETTINGS_STORE, CONVERSATIONS_STORE], 'readwrite');
        transaction.onerror = (event) => reject((event.target as IDBRequest).error);
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
        const index = store.index('updatedAt');
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result.reverse());
        request.onerror = () => reject(request.error);
    });
};

export const addNote = async (content: string): Promise<Note> => {
    const db = await initDB();
    const newNote: Omit<Note, 'id'> = {
        content,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE, 'readwrite');
        const store = transaction.objectStore(NOTES_STORE);
        const request = store.add(newNote);
        request.onsuccess = () => {
            resolve({ ...newNote, id: request.result as number });
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateNote = async (note: Note): Promise<Note> => {
    const db = await initDB();
    const updatedNote = { ...note, updatedAt: new Date() };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE, 'readwrite');
        const store = transaction.objectStore(NOTES_STORE);
        const request = store.put(updatedNote);
        request.onsuccess = () => resolve(updatedNote);
        request.onerror = () => reject(request.error);
    });
};

export const deleteNote = async (id: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE, 'readwrite');
        const store = transaction.objectStore(NOTES_STORE);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};