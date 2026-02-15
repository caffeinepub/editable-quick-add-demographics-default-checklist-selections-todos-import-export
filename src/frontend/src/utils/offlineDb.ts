import type { SurgeryCase } from '../backend';

const DB_NAME = 'VetCaseTrackerOfflineDB';
const DB_VERSION = 1;
const CASES_STORE = 'cases';
const CASE_LIST_STORE = 'caseList';
const QUEUE_STORE = 'operationQueue';

interface CaseListCache {
  principal: string;
  cases: SurgeryCase[];
  timestamp: number;
}

interface CaseCache {
  principal: string;
  caseId: string;
  caseData: SurgeryCase;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for individual case details
      if (!db.objectStoreNames.contains(CASES_STORE)) {
        const casesStore = db.createObjectStore(CASES_STORE, { keyPath: 'caseId' });
        casesStore.createIndex('principal', 'principal', { unique: false });
      }

      // Store for case list
      if (!db.objectStoreNames.contains(CASE_LIST_STORE)) {
        db.createObjectStore(CASE_LIST_STORE, { keyPath: 'principal' });
      }

      // Store for operation queue
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('principal', 'principal', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// Case List Operations
export async function saveCaseListCache(principal: string, cases: SurgeryCase[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CASE_LIST_STORE, 'readwrite');
  const store = tx.objectStore(CASE_LIST_STORE);

  const cache: CaseListCache = {
    principal,
    cases,
    timestamp: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const request = store.put(cache);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

export async function getCaseListCache(principal: string): Promise<SurgeryCase[] | null> {
  const db = await openDB();
  const tx = db.transaction(CASE_LIST_STORE, 'readonly');
  const store = tx.objectStore(CASE_LIST_STORE);

  const cache = await new Promise<CaseListCache | undefined>((resolve, reject) => {
    const request = store.get(principal);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return cache ? cache.cases : null;
}

// Individual Case Operations
export async function saveCaseCache(principal: string, caseData: SurgeryCase): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CASES_STORE, 'readwrite');
  const store = tx.objectStore(CASES_STORE);

  const cache: CaseCache = {
    principal,
    caseId: caseData.id.toString(),
    caseData,
    timestamp: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const request = store.put(cache);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

export async function getCaseCache(principal: string, caseId: string): Promise<SurgeryCase | null> {
  const db = await openDB();
  const tx = db.transaction(CASES_STORE, 'readonly');
  const store = tx.objectStore(CASES_STORE);

  const cache = await new Promise<CaseCache | undefined>((resolve, reject) => {
    const request = store.get(caseId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();

  if (cache && cache.principal === principal) {
    return cache.caseData;
  }
  return null;
}

// Check if cache exists
export async function hasCaseListCache(principal: string): Promise<boolean> {
  const cache = await getCaseListCache(principal);
  return cache !== null && cache.length > 0;
}

// Clear cache for a principal
export async function clearCacheForPrincipal(principal: string): Promise<void> {
  const db = await openDB();

  // Clear case list
  const listTx = db.transaction(CASE_LIST_STORE, 'readwrite');
  const listStore = listTx.objectStore(CASE_LIST_STORE);
  await new Promise<void>((resolve, reject) => {
    const request = listStore.delete(principal);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Clear individual cases
  const casesTx = db.transaction(CASES_STORE, 'readwrite');
  const casesStore = casesTx.objectStore(CASES_STORE);
  const index = casesStore.index('principal');

  const cases = await new Promise<CaseCache[]>((resolve, reject) => {
    const request = index.getAll(principal);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  for (const cache of cases) {
    await new Promise<void>((resolve, reject) => {
      const request = casesStore.delete(cache.caseId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  db.close();
}

// Clear all cache
export async function clearAllCache(): Promise<void> {
  const db = await openDB();

  const listTx = db.transaction(CASE_LIST_STORE, 'readwrite');
  await new Promise<void>((resolve, reject) => {
    const request = listTx.objectStore(CASE_LIST_STORE).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  const casesTx = db.transaction(CASES_STORE, 'readwrite');
  await new Promise<void>((resolve, reject) => {
    const request = casesTx.objectStore(CASES_STORE).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}
