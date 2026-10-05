// Typed access to meridian-data.json, the single source of truth for numbers, rules and records.
import raw from "../../meridian-data.json";
import type { DomainData, Prof } from "../engine/types";

export const data = raw as unknown as DomainData;

const labelToKey: Record<string, string> = Object.fromEntries(
  Object.entries(data.SKILLS).map(([k, v]) => [v.n.toLowerCase(), k]),
);

/** Taxonomy key for a key or a label; null when the skill is not in the taxonomy. */
export function skillKey(s: string): string | null {
  if (data.SKILLS[s]) return s;
  return labelToKey[s.trim().toLowerCase()] ?? null;
}

export function skillName(s: string): string {
  const k = skillKey(s);
  return k ? data.SKILLS[k].n : s;
}

export function profIdx(p: Prof): number {
  return data.PROF.indexOf(p) + 1;
}

export function familyById(id: string) {
  return data.FAMILIES.find((f) => f.id === id);
}

export function unitById(id: string) {
  return data.UNITS.find((u) => u.id === id);
}

/** exposedFTE = round(headcount × automatable), brief §6. */
export function exposedFTE(f: { headcount: number; automatable: number }): number {
  return Math.round(f.headcount * f.automatable);
}
