export class StorageManager {
    constructor() {
        this.storageKey = 'storywrapper';
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second

        // Initialize IndexedDB
        this.initializeDB();
    }

    async initializeDB() {
        try {
            // Check for IndexedDB support
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported, falling back to localStorage');
                this.useLocalStorage = true;
                return;
            }

            // Open database
            const request = indexedDB.open(this.storageKey, 1);

            request.onerror = () => {
                console.warn('IndexedDB failed to open, falling back to localStorage');
                this.useLocalStorage = true;
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('content')) {
                    db.createObjectStore('content');
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            };

            // Wait for database to open
            this.db = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

        } catch (error) {
            console.error('Error initializing storage:', error);
            this.useLocalStorage = true;
        }
    }

    async set(key, value) {
        let retries = 0;

        while (retries < this.maxRetries) {
            try {
                if (this.useLocalStorage) {
                    return this.setLocalStorage(key, value);
                }

                await this.setIndexedDB(key, value);
                return;

            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    throw new Error(`Failed to set ${key} after ${this.maxRetries} attempts`);
                }
                await this.delay(this.retryDelay * retries);
            }
        }
    }

    async get(key) {
        let retries = 0;

        while (retries < this.maxRetries) {
            try {
                if (this.useLocalStorage) {
                    return this.getLocalStorage(key);
                }

                return await this.getIndexedDB(key);

            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    throw new Error(`Failed to get ${key} after ${this.maxRetries} attempts`);
                }
                await this.delay(this.retryDelay * retries);
            }
        }
    }

    async delete(key) {
        let retries = 0;

        while (retries < this.maxRetries) {
            try {
                if (this.useLocalStorage) {
                    return this.deleteLocalStorage(key);
                }

                await this.deleteIndexedDB(key);
                return;

            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    throw new Error(`Failed to delete ${key} after ${this.maxRetries} attempts`);
                }
                await this.delay(this.retryDelay * retries);
            }
        }
    }

    async clear() {
        let retries = 0;

        while (retries < this.maxRetries) {
            try {
                if (this.useLocalStorage) {
                    return this.clearLocalStorage();
                }

                await this.clearIndexedDB();
                return;

            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    throw new Error(`Failed to clear storage after ${this.maxRetries} attempts`);
                }
                await this.delay(this.retryDelay * retries);
            }
        }
    }

    // IndexedDB methods
    async setIndexedDB(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['content'], 'readwrite');
            const store = transaction.objectStore('content');
            const request = store.put(value, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['content'], 'readonly');
            const store = transaction.objectStore('content');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['content'], 'readwrite');
            const store = transaction.objectStore('content');
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearIndexedDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['content'], 'readwrite');
            const store = transaction.objectStore('content');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // localStorage methods
    setLocalStorage(key, value) {
        try {
            const fullKey = `${this.storageKey}_${key}`;
            localStorage.setItem(fullKey, JSON.stringify(value));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('localStorage quota exceeded');
            }
            throw error;
        }
    }

    getLocalStorage(key) {
        const fullKey = `${this.storageKey}_${key}`;
        const value = localStorage.getItem(fullKey);
        return value ? JSON.parse(value) : null;
    }

    deleteLocalStorage(key) {
        const fullKey = `${this.storageKey}_${key}`;
        localStorage.removeItem(fullKey);
    }

    clearLocalStorage() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.storageKey)) {
                localStorage.removeItem(key);
            }
        });
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Export data
    async exportData() {
        const data = {};

        if (this.useLocalStorage) {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.storageKey)) {
                    const shortKey = key.replace(`${this.storageKey}_`, '');
                    data[shortKey] = this.getLocalStorage(shortKey);
                }
            });
        } else {
            const transaction = this.db.transaction(['content'], 'readonly');
            const store = transaction.objectStore('content');
            const request = store.getAll();

            await new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    data.content = request.result;
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
        }

        return data;
    }

    // Import data
    async importData(data) {
        await this.clear();

        for (const [key, value] of Object.entries(data)) {
            await this.set(key, value);
        }
    }
}
