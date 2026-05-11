const DB_NAME = 'MediaWatermarkRemover'
const DB_VERSION = 1
const STORE_NAME = 'tasks'
const LAST_CLEAN_KEY = 'lastCacheCleanTime'
const CLEAN_HOUR_UTC = 18 // 北京时间凌晨2点 = UTC 18点 (前一天)

interface TaskRecord {
  id: string
  data: any
  createdAt: number
  updatedAt: number
}

class LocalStorageService {
  private db: IDBDatabase | null = null
  private cleanTimer: number | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        this.scheduleDailyClean()
        resolve()
      }
    })
  }

  private scheduleDailyClean() {
    const now = new Date()
    const target = new Date()
    target.setUTCHours(CLEAN_HOUR_UTC, 0, 0, 0)
    
    if (target <= now) {
      target.setUTCDate(target.getUTCDate() + 1)
    }
    
    const msUntilClean = target.getTime() - now.getTime()
    
    const lastClean = localStorage.getItem(LAST_CLEAN_KEY)
    const shouldCleanNow = !lastClean || (now.getTime() - parseInt(lastClean, 10) > 23 * 60 * 60 * 1000)
    
    if (shouldCleanNow && this.db) {
      this.performClean()
    }
    
    this.cleanTimer = window.setTimeout(() => {
      this.performClean()
      this.scheduleDailyClean()
    }, msUntilClean)
  }

  async performClean(): Promise<void> {
    try {
      await this.clear()
      localStorage.setItem(LAST_CLEAN_KEY, Date.now().toString())
      
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
      
      console.log('云端缓存已清理')
    } catch (err) {
      console.error('清理缓存失败:', err)
    }
  }

  async save(key: string, data: any): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      const record: TaskRecord = {
        id: key,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      
      const request = store.put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async load(key: string): Promise<any | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)
      
      request.onsuccess = () => {
        resolve(request.result?.data || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async remove(key: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const localStorageService = new LocalStorageService()
