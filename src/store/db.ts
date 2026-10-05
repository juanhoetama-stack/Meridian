// Persistence: IndexedDB with three stores (people, versions, meta), or memory when IndexedDB is unavailable.
import type { Person, Version } from "../engine/types";

export interface Store {
  kind: "indexeddb" | "memory";
  getPeople(): Promise<Person[]>;
  getVersions(): Promise<Version[]>;
  getMeta<T>(key: string): Promise<T | undefined>;
  /** One atomic write: people to put/delete, versions to put, meta to set. */
  write(w: { people?: Person[]; deletePeople?: string[]; versions?: Version[]; meta?: Record<string, unknown> }): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = "meridian";
const STORES = ["people", "versions", "meta"] as const;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
}

async function openIdb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains("people")) db.createObjectStore("people", { keyPath: "id" });
    if (!db.objectStoreNames.contains("versions")) db.createObjectStore("versions", { keyPath: "id" });
    if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
  };
  return req(open);
}

function idbStore(db: IDBDatabase): Store {
  return {
    kind: "indexeddb",
    getPeople: () => req(db.transaction("people").objectStore("people").getAll()),
    getVersions: () => req(db.transaction("versions").objectStore("versions").getAll()),
    async getMeta<T>(key: string) {
      const row = await req(db.transaction("meta").objectStore("meta").get(key));
      return row?.value as T | undefined;
    },
    async write(w) {
      const tx = db.transaction([...STORES], "readwrite");
      for (const p of w.people ?? []) tx.objectStore("people").put(p);
      for (const id of w.deletePeople ?? []) tx.objectStore("people").delete(id);
      for (const v of w.versions ?? []) tx.objectStore("versions").put(v);
      for (const [key, value] of Object.entries(w.meta ?? {})) tx.objectStore("meta").put({ key, value });
      await done(tx);
    },
    async clear() {
      const tx = db.transaction([...STORES], "readwrite");
      for (const s of STORES) tx.objectStore(s).clear();
      await done(tx);
    },
  };
}

export function memoryStore(): Store {
  let people = new Map<string, Person>();
  let versions = new Map<string, Version>();
  let meta = new Map<string, unknown>();
  const copy = <T>(x: T): T => structuredClone(x);
  return {
    kind: "memory",
    getPeople: async () => [...people.values()].map(copy),
    getVersions: async () => [...versions.values()].map(copy),
    getMeta: async <T>(key: string) => copy(meta.get(key)) as T | undefined,
    async write(w) {
      for (const p of w.people ?? []) people.set(p.id, copy(p));
      for (const id of w.deletePeople ?? []) people.delete(id);
      for (const v of w.versions ?? []) versions.set(v.id, copy(v));
      for (const [k, v] of Object.entries(w.meta ?? {})) meta.set(k, copy(v));
    },
    async clear() { people = new Map(); versions = new Map(); meta = new Map(); },
  };
}

export async function openStore(): Promise<Store> {
  try {
    const db = await openIdb();
    const s = idbStore(db);
    await s.getMeta("seeded"); // probe: some browsers open IndexedDB but fail on use (file://, private mode)
    return s;
  } catch {
    return memoryStore();
  }
}
