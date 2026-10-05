// Levels by time-span of discretion (brief §6, §7.2 step 5). Tenure never lifts anyone above L2.
import type { DomainData, Person } from "./types";
import type { Graded } from "./evidence";
import { serviceYears } from "./dates";
import { profIdx } from "../data";

export interface LevelResult { level: number; rule: string }

export function levelFor(p: Person, d: DomainData, today: string): LevelResult {
  for (const r of d.LEVEL_RULES) {
    if (new RegExp(r.pattern, "i").test(p.title)) return { level: r.level, rule: `L${r.level}: ${r.reason}` };
  }
  if (serviceYears(p.start, today) < 3) {
    return { level: 1, rule: "L1: default for under 3 years of service; no title marker" };
  }
  return { level: 2, rule: "L2: default; no title marker, and tenure never lifts anyone above L2" };
}

/** 6 = as is; 5 = L5–6 → L5; 4 = L1, L2, L3–4 → L3, L5–6 → L4. */
export function compressLevel(level: number, levels: 4 | 5 | 6): number {
  if (levels === 6) return level;
  if (levels === 5) return Math.min(level, 5);
  if (level <= 2) return level;
  return level <= 4 ? 3 : 4;
}

export function confidence(level: number, graded: Graded[]): "evidenced" | "assess" {
  if (level >= 3) return graded.some((g) => profIdx(g.skill.prof) >= 3 && g.tier !== "I") ? "evidenced" : "assess";
  return graded.some((g) => g.tier === "V") ? "evidenced" : "assess";
}

export const KKNI: Record<number, string> = { 1: "2–3", 2: "3–4", 3: "4–5", 4: "6", 5: "7–8", 6: "8–9" };
export const LEVEL_NAMES: Record<number, string> = {
  1: "Operative", 2: "Skilled practitioner", 3: "Specialist / crew lead",
  4: "Senior specialist", 5: "Department head", 6: "Division leader",
};
