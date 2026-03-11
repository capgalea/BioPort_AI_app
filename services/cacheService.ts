
import { CompanyData, SearchHistoryItem, ChatSession, DrugDeepDive, NewsItem } from '../types.ts';

const DB_NAME = 'BioPortDB';
const DB_VERSION = 5; // Bump version for news store
const STORE_COMPANIES = 'companies';
const STORE_DRUGS = 'drugs';
const STORE_SECTORS = 'sectors';
const STORE_SEARCH_HISTORY = 'search_history';
const STORE_CHAT_SESSIONS = 'chat_sessions';
const STORE_NEWS = 'news_cache';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days
const NEWS_TTL = 1 * 60 * 60 * 1000; // 1 Hour for news revalidation

interface CacheItem<T> {
  cacheKey: string;
  data: T;
  timestamp: number;
  region?: string;
}

class CacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_COMPANIES)) {
          db.createObjectStore(STORE_COMPANIES, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(STORE_DRUGS)) {
          db.createObjectStore(STORE_DRUGS, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(STORE_SECTORS)) {
          db.createObjectStore(STORE_SECTORS, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(STORE_SEARCH_HISTORY)) {
          db.createObjectStore(STORE_SEARCH_HISTORY, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CHAT_SESSIONS)) {
          db.createObjectStore(STORE_CHAT_SESSIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_NEWS)) {
          db.createObjectStore(STORE_NEWS, { keyPath: 'cacheKey' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  private generateKey(type: 'c' | 's' | 'd' | 'n', identifier: string, region: string = "Global"): string {
    return `${type}_${region}_${identifier.toLowerCase().trim()}`;
  }

  async getCompanyCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_COMPANIES, 'readonly');
      const store = transaction.objectStore(STORE_COMPANIES);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPaginatedCompanies(limit: number, offset: number = 0): Promise<CompanyData[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_COMPANIES, 'readonly');
      const store = transaction.objectStore(STORE_COMPANIES);
      const results: CompanyData[] = [];
      const request = store.openCursor();
      let advanced = offset === 0;

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!advanced) {
            advanced = true;
            cursor.advance(offset);
            return;
          }
          const item = cursor.value as CacheItem<CompanyData>;
          results.push({
            ...item.data,
            lastUpdated: new Date(item.timestamp).toISOString()
          });
          if (results.length < limit) {
            cursor.continue();
          } else {
            resolve(results);
          }
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllCompanies(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_COMPANIES, STORE_SECTORS, STORE_DRUGS, STORE_NEWS], 'readwrite');
      transaction.objectStore(STORE_COMPANIES).clear();
      transaction.objectStore(STORE_SECTORS).clear();
      transaction.objectStore(STORE_DRUGS).clear();
      transaction.objectStore(STORE_NEWS).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getBatchCompanies(names: string[], region: string): Promise<CompanyData[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_COMPANIES, 'readonly');
      const store = transaction.objectStore(STORE_COMPANIES);
      const results: CompanyData[] = [];
      
      names.forEach(name => {
        const key = this.generateKey('c', name, region);
        const request = store.get(key);
        request.onsuccess = () => {
          const item = request.result as CacheItem<CompanyData>;
          if (item && Date.now() - item.timestamp < TTL_MS) {
            results.push({
              ...item.data,
              lastUpdated: new Date(item.timestamp).toISOString()
            });
          }
        };
      });

      transaction.oncomplete = () => resolve(results);
    });
  }

  async saveBatchCompanies(companies: CompanyData[], region: string): Promise<void> {
    const db = await this.getDB();
    const CHUNK_SIZE = 500;
    for (let i = 0; i < companies.length; i += CHUNK_SIZE) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_COMPANIES, 'readwrite');
        const store = transaction.objectStore(STORE_COMPANIES);
        const chunk = companies.slice(i, i + CHUNK_SIZE);
        chunk.forEach(company => {
          const key = this.generateKey('c', company.name, region);
          store.put({ cacheKey: key, data: company, timestamp: Date.now(), region });
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
  }

  async getBatchDrugs(names: string[]): Promise<DrugDeepDive[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_DRUGS, 'readonly');
      const store = transaction.objectStore(STORE_DRUGS);
      const results: DrugDeepDive[] = [];
      
      names.forEach(name => {
        const key = this.generateKey('d', name);
        const request = store.get(key);
        request.onsuccess = () => {
          const item = request.result as CacheItem<DrugDeepDive>;
          if (item && Date.now() - item.timestamp < TTL_MS) {
            results.push(item.data);
          }
        };
      });

      transaction.oncomplete = () => resolve(results);
    });
  }

  async saveBatchDrugs(drugs: DrugDeepDive[]): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_DRUGS, 'readwrite');
      const store = transaction.objectStore(STORE_DRUGS);
      drugs.forEach(drug => {
        const key = this.generateKey('d', drug.name);
        store.put({ cacheKey: key, data: drug, timestamp: Date.now() });
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteCompanyById(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_COMPANIES, 'readwrite');
      const store = transaction.objectStore(STORE_COMPANIES);
      const request = store.openCursor();
      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.data.id === id) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSearchHistory(item: SearchHistoryItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SEARCH_HISTORY, 'readwrite');
      const store = transaction.objectStore(STORE_SEARCH_HISTORY);
      store.put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSearchHistory(): Promise<SearchHistoryItem[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_SEARCH_HISTORY, 'readonly');
      const store = transaction.objectStore(STORE_SEARCH_HISTORY);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as SearchHistoryItem[]) || [];
        resolve(results.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => resolve([]);
    });
  }

  async deleteSearchHistoryItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SEARCH_HISTORY, 'readwrite');
      const store = transaction.objectStore(STORE_SEARCH_HISTORY);
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CHAT_SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORE_CHAT_SESSIONS);
      store.put(session);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChatSessions(): Promise<ChatSession[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_CHAT_SESSIONS, 'readonly');
      const store = transaction.objectStore(STORE_CHAT_SESSIONS);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as ChatSession[]) || [];
        resolve(results.sort((a, b) => b.lastUpdated - a.lastUpdated));
      };
      request.onerror = () => resolve([]);
    });
  }

  async deleteChatSession(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CHAT_SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORE_CHAT_SESSIONS);
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // --- News Cache (Optimized for Industry Intelligence speed) ---

  async getCachedNews(topic: string = "Global"): Promise<{ items: NewsItem[], timestamp: number } | null> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const key = this.generateKey('n', topic);
      const transaction = db.transaction(STORE_NEWS, 'readonly');
      const store = transaction.objectStore(STORE_NEWS);
      const request = store.get(key);
      request.onsuccess = () => {
        const item = request.result as CacheItem<NewsItem[]>;
        if (item) {
          resolve({ items: item.data, timestamp: item.timestamp });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  async saveNewsCache(items: NewsItem[], topic: string = "Global"): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const key = this.generateKey('n', topic);
      const transaction = db.transaction(STORE_NEWS, 'readwrite');
      const store = transaction.objectStore(STORE_NEWS);
      store.put({ cacheKey: key, data: items, timestamp: Date.now() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  isNewsFresh(timestamp: number): boolean {
    return Date.now() - timestamp < NEWS_TTL;
  }
}

export const cacheService = new CacheService();
