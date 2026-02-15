import type { QueuedOperation, OperationStatus } from '../types/offlineOps';

const DB_NAME = 'VetCaseTrackerOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'operationQueue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function enqueueOperation(operation: Omit<QueuedOperation, 'id'>): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(QUEUE_STORE);

  const id = await new Promise<number>((resolve, reject) => {
    const request = store.add(operation);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return id;
}

export async function getPendingOperations(principal: string): Promise<QueuedOperation[]> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readonly');
  const store = tx.objectStore(QUEUE_STORE);
  const index = store.index('principal');

  const operations = await new Promise<QueuedOperation[]>((resolve, reject) => {
    const request = index.getAll(principal);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return operations.filter(op => op.status === 'pending' || op.status === 'failed');
}

export async function getAllPendingOperations(): Promise<QueuedOperation[]> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readonly');
  const store = tx.objectStore(QUEUE_STORE);

  const operations = await new Promise<QueuedOperation[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return operations.filter(op => op.status === 'pending' || op.status === 'failed');
}

export async function updateOperationStatus(
  id: number,
  status: OperationStatus,
  error?: string
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(QUEUE_STORE);

  const operation = await new Promise<QueuedOperation>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (operation) {
    operation.status = status;
    if (error) {
      operation.lastError = error;
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  db.close();
}

export async function removeOperation(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(QUEUE_STORE);

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  db.close();
}

export async function clearAllOperations(principal: string): Promise<void> {
  const operations = await getPendingOperations(principal);
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, 'readwrite');
  const store = tx.objectStore(QUEUE_STORE);

  for (const op of operations) {
    if (op.id) {
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(op.id!);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  db.close();
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const message = error.message || error.toString();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('offline') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')
  );
}
