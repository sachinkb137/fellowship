import { openDB } from 'idb';

const DB_NAME = 'mgnrega-db';
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('summaries')) {
        db.createObjectStore('summaries');
      }
    }
  });
}

export async function saveSummary(key: string, value: any) {
  const db = await getDB();
  await db.put('summaries', value, key);
}

export async function loadSummary(key: string) {
  const db = await getDB();
  return db.get('summaries', key);
}
