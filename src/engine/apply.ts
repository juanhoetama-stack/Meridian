// Accepted ImportPlan → records. New people take the next MRD IDs; pending decisions are left out.
import type { Person } from "./types";
import type { ImportPlan } from "./identity";
import { mrdId } from "../data/seed";

export interface ImportHistoryRow {
  time: string; systems: string[]; added: number; updated: number; review: number; notImported: number;
}

export interface ApplyResult { added: Person[]; updated: Person[]; seq: number; history: ImportHistoryRow }

export function applyImport(plan: ImportPlan, seq: number, now: string): ApplyResult {
  let n = seq;
  const added = plan.newPeople.map((pn) => ({ ...structuredClone(pn.draft), id: mrdId(++n), created: now }));
  const updated = plan.updates.map((u) => structuredClone(u.next));
  return {
    added, updated, seq: n,
    history: {
      time: now, systems: plan.systems, added: added.length, updated: updated.length,
      review: plan.decisions.length, notImported: plan.notImported.length,
    },
  };
}

/** Applies the result to an in-memory list (used by tests and by the memory store). */
export function mergeInto(people: Person[], r: ApplyResult): Person[] {
  const upd = new Map(r.updated.map((p) => [p.id, p]));
  return [...people.map((p) => upd.get(p.id) ?? p), ...r.added];
}
