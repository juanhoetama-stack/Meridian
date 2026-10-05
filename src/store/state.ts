// App state and actions. The engine computes; this module persists and notifies the UI.
import { useEffect, useState } from "preact/hooks";
import type { Params, Person, Version } from "../engine/types";
import type { ImportPlan } from "../engine/identity";
import { applyImport, type ImportHistoryRow } from "../engine/apply";
import { build } from "../engine/build";
import { DEFAULT_PARAMS, DEFAULT_PROMPT } from "../engine/parse";
import { data } from "../data";
import { mrdId, seedPeople } from "../data/seed";
import { AS_OF } from "../config";
import { openStore, type Store } from "./db";

export interface ConnectorState { connected: boolean; lastSaved?: string }
export interface Toast { id: number; text: string; action?: { label: string; run: () => void } }

export interface AppState {
  ready: boolean;
  storage: "indexeddb" | "memory";
  people: Person[];
  versions: Version[];
  currentVersion: string | null;
  seq: number;
  connectors: Record<string, ConnectorState>;
  importHistory: ImportHistoryRow[];
  drawer: string | null;
  toast: Toast | null;
}

let state: AppState = {
  ready: false, storage: "memory", people: [], versions: [], currentVersion: null, seq: 0,
  connectors: {}, importHistory: [], drawer: null, toast: null,
};
let store: Store;
const listeners = new Set<() => void>();

export const getState = () => state;

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useApp(): AppState {
  const [, setTick] = useState(0);
  const rendered = state;
  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1));
    // State may have changed between render and subscription (e.g. init finishing first).
    if (state !== rendered) setTick((t) => t + 1);
    return unsub;
  }, []);
  return state;
}

export const byId = (id: string) => state.people.find((p) => p.id === id);
export const currentVersion = (): Version | null => state.versions.find((v) => v.id === state.currentVersion) ?? null;
export const nextId = () => mrdId(state.seq + 1);

/** A version is stale when records were added or deleted since it was built. */
export function isStale(v: Version | null): { added: number; removed: number } | null {
  if (!v) return null;
  const now = new Set(state.people.map((p) => p.id));
  const then = new Set(v.ids);
  const added = [...now].filter((id) => !then.has(id)).length;
  const removed = [...then].filter((id) => !now.has(id)).length;
  return added || removed ? { added, removed } : null;
}

// ---------- Actions ----------

export async function init() {
  store = await openStore();
  const seeded = await store.getMeta<boolean>("seeded");
  if (!seeded) { await restoreSample(); }
  else {
    const [people, versions, seq, connectors, importHistory, current] = await Promise.all([
      store.getPeople(), store.getVersions(), store.getMeta<number>("seq"), store.getMeta<AppState["connectors"]>("connectors"),
      store.getMeta<ImportHistoryRow[]>("importHistory"), store.getMeta<string>("currentVersion"),
    ]);
    set({
      people: sortPeople(people), versions: versions.sort((a, b) => a.n - b.n), seq: seq ?? people.length,
      connectors: connectors ?? {}, importHistory: importHistory ?? [], currentVersion: current ?? null,
    });
  }
  set({ ready: true, storage: store.kind });
}

const sortPeople = (ps: Person[]) => [...ps].sort((a, b) => a.id.localeCompare(b.id));

/** Clears everything, reseeds MRD-000001…040, and builds v1 with the default instruction (SRS SH-4, D-3). */
export async function restoreSample() {
  const now = new Date().toISOString();
  const people = seedPeople(data, now);
  const v1 = build({ people, params: DEFAULT_PARAMS, prompt: DEFAULT_PROMPT, n: 1, built: now, today: AS_OF }, data);
  await store.clear();
  await store.write({
    people, versions: [v1],
    meta: { seq: people.length, connectors: {}, importHistory: [], currentVersion: v1.id, seeded: true },
  });
  set({ people, versions: [v1], seq: people.length, connectors: {}, importHistory: [], currentVersion: v1.id, drawer: null });
}

export async function connect(id: string) {
  const connectors = { ...state.connectors, [id]: { ...state.connectors[id], connected: true } };
  await store.write({ meta: { connectors } });
  set({ connectors });
}

export async function saveImport(plan: ImportPlan) {
  const now = new Date().toISOString();
  const r = applyImport(plan, state.seq, now);
  const connectors = { ...state.connectors };
  for (const s of plan.systems) connectors[s] = { ...connectors[s], connected: true, lastSaved: now };
  const importHistory = [r.history, ...state.importHistory];
  await store.write({ people: [...r.updated, ...r.added], meta: { seq: r.seq, connectors, importHistory } });
  const upd = new Map(r.updated.map((p) => [p.id, p]));
  set({ people: sortPeople([...state.people.map((p) => upd.get(p.id) ?? p), ...r.added]), seq: r.seq, connectors, importHistory });
  return r;
}

export async function addPerson(draft: Omit<Person, "id" | "created">): Promise<Person> {
  const seq = state.seq + 1;
  const person: Person = { ...draft, id: mrdId(seq), created: new Date().toISOString() };
  await store.write({ people: [person], meta: { seq } });
  set({ people: sortPeople([...state.people, person]), seq });
  return person;
}

export async function deletePerson(id: string) {
  await store.write({ deletePeople: [id] });
  set({ people: state.people.filter((p) => p.id !== id), drawer: state.drawer === id ? null : state.drawer });
}

export async function setKtp(id: string, ktp: string) {
  const p = byId(id);
  if (!p) return;
  const next = { ...p, ktp };
  await store.write({ people: [next] });
  set({ people: state.people.map((x) => (x.id === id ? next : x)) });
}

export async function runBuild(params: Params, prompt: string): Promise<Version> {
  const n = Math.max(0, ...state.versions.map((v) => v.n)) + 1;
  const v = build({ people: state.people, params, prompt, n, built: new Date().toISOString(), today: AS_OF }, data);
  await store.write({ versions: [v], meta: { currentVersion: v.id } });
  set({ versions: [...state.versions, v], currentVersion: v.id });
  return v;
}

export async function showVersion(id: string) {
  await store.write({ meta: { currentVersion: id } });
  set({ currentVersion: id });
}

export function openPerson(id: string | null) { set({ drawer: id }); }

let toastSeq = 0;
export function toast(text: string, action?: Toast["action"]) {
  const t = { id: ++toastSeq, text, action };
  set({ toast: t });
  setTimeout(() => { if (state.toast?.id === t.id) set({ toast: null }); }, 7000);
}
export function dismissToast() { set({ toast: null }); }
