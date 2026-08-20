const IDB_NAME = 'html-tools';
const IDB_STORE = 'file-handles';

function withHandleStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(IDB_NAME, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(IDB_STORE)) {
        open.result.createObjectStore(IDB_STORE);
      }
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(IDB_STORE, mode);
      const req = fn(tx.objectStore(IDB_STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    };
  });
}

export function persistFileHandle(key: string, dir: any, fileName: string) {
  return withHandleStore('readwrite', (store) => store.put({ version: 2, dir: dir, fileName: fileName }, key)).catch(
    () => {},
  );
}

export function readFileHandle(key: string): Promise<any> {
  return withHandleStore('readonly', (store) => store.get(key)).catch(() => null);
}

export function forgetFileHandle(key: string) {
  return withHandleStore('readwrite', (store) => store.delete(key)).catch(() => {});
}
