// Exposure by family and the Field Metering regional timeline (brief §8.6).
import type { DomainData, Person, Version } from "./types";
import { exposedFTE } from "../data";

export interface FamilyExposure { id: string; name: string; headcount: number; automatable: number; certainty: string; exposed: number; inDb: number; driver: string }

export function familyExposure(d: DomainData, v: Version | null): FamilyExposure[] {
  const inDb: Record<string, number> = {};
  if (v) for (const a of Object.values(v.A)) if (a.role) inDb[a.role.family] = (inDb[a.role.family] ?? 0) + 1;
  return d.FAMILIES.map((f) => ({
    id: f.id, name: f.name, headcount: f.headcount, automatable: f.automatable, certainty: f.certainty,
    exposed: exposedFTE(f), inDb: inDb[f.id] ?? 0, driver: f.driver,
  })).sort((a, b) => b.exposed - a.exposed);
}

export function totalExposed(d: DomainData): number {
  return d.FAMILIES.reduce((s, f) => s + exposedFTE(f), 0);
}

export interface UnitWindow { id: string; name: string; wave: number; from: number; to: number; hc: number; share: number }

/** Rollout windows ("M0–M9") parsed onto the M0–M18 axis, with each unit's share of Field Metering headcount. */
export function rolloutTimeline(d: DomainData): UnitWindow[] {
  const total = d.UNITS.reduce((s, u) => s + u.hc, 0);
  return d.UNITS.filter((u) => u.win).map((u) => {
    const [from, to] = u.win.replace(/M/g, "").split(/[–-]/).map(Number);
    return { id: u.id, name: u.name, wave: u.wave, from, to, hc: u.hc, share: u.hc / total };
  });
}

/** Share of displacement landing in units whose window closes by month m (48% for RU-1 and RU-2 by M9). */
export function shareBy(d: DomainData, m: number): number {
  const t = rolloutTimeline(d);
  return Math.round(t.filter((u) => u.to <= m).reduce((s, u) => s + u.share, 0) * 100);
}

/** Named people in the database per diagram load, from the current version (the second scale). */
export function namedOnPaths(v: Version | null, people: Person[]) {
  const ids = new Set(people.map((p) => p.id));
  const pick = (k: string) => (v?.seg[k] ?? []).filter((id) => ids.has(id));
  return {
    retire: pick("retire"), stay: pick("stay"), choices: pick("low"),
    bands: Object.fromEntries(["B2", "B3", "B4", "B5", "B6"].map((b) => [b, pick(b)])) as Record<string, string[]>,
    bridge: pick("bridge"),
  };
}
