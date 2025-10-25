import { Message, Note } from '../types';

const DB_NAME = 'HeyMeanDB';
const DB_VERSION = 1;

const MESSAGES_STORE = 'messages';
const NOTES_STORE = 'notes';
const SETTINGS_STORE = 'settings';

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
            if (!dbInstance.objectStoreNames.contains(MESSAGES_STORE)) {
                dbInstance.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains(NOTES_STORE)) {
                const notesStore = dbInstance.createObjectStore(NOTES_STORE, { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
            if (!dbInstance.objectStoreNames.contains(SETTINGS_STORE)) {
                dbInstance.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
            }
        };
    });
};

export const getSetting = async <T>(key: string): Promise<T | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SETTINGS_STORE, 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : undefined);
        };
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

export const getMessages = async (): Promise<Message[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readonly');
        const store = transaction.objectStore(MESSAGES_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a, b) => a.id.localeCompare(b.id)));
        request.onerror = () => reject(request.error);
    });
};

export const addMessage = async (message: Message): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = transaction.objectStore(MESSAGES_STORE);
        // Create a copy to avoid mutating the original object
        const messageToStore = { ...message };
        // Delete properties that shouldn't be stored in the DB
        delete messageToStore.isLoading; 
        delete messageToStore.isThinkingComplete;
        delete messageToStore.thinkingStartTime;
        delete messageToStore.thinkingDuration;
        if (messageToStore.attachment) {
            delete messageToStore.attachment.preview;
        }
        const request = store.put(messageToStore);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearMessages = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
        const store = transaction.objectStore(MESSAGES_STORE);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

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