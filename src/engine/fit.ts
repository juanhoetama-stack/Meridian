// Fit to destination bands B2–B6 (brief §7.2 step 7).
// fit = Σ(credit × weight) / Σ weight; credit = min(1, profIdx(held)/profIdx(required)) × tierWeight.
import type { DomainData, Fit, FitLine, Params, Prof, Tier } from "./types";
import type { Graded } from "./evidence";
import { profIdx, skillKey } from "../data";

/** Best graded holding per taxonomy skill key (highest prof × tier weight). */
export function holdings(graded: Graded[], d: DomainData): Map<string, Graded> {
  const m = new Map<string, Graded>();
  for (const g of graded) {
    const k = skillKey(g.skill.skill);
    if (!k) continue;
    const prev = m.get(k);
    const score = (x: Graded) => profIdx(x.skill.prof) * d.TIER_W[x.tier];
    if (!prev || score(g) > score(prev)) m.set(k, g);
  }
  return m;
}

export function fitBand(bandId: string, held: Map<string, Graded>, d: DomainData, evidence: Params["evidence"]): Fit {
  const band = d.BANDS[bandId];
  const req = band.req ?? {};
  const lines: FitLine[] = [];
  let points = 0, total = 0;
  for (const [skill, [need, weight]] of Object.entries(req)) {
    const h = held.get(skill);
    const credit = h ? Math.min(1, profIdx(h.skill.prof) / profIdx(need)) * d.TIER_W[h.tier] : 0;
    lines.push({ skill, need, held: h ? h.skill.prof : null, tier: h ? h.tier : null, weight, credit });
    points += credit * weight;
    total += weight;
  }
  const gaps = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.held === null)
    .sort((a, b) => b.l.weight - a.l.weight || a.i - b.i)
    .map(({ l }) => l.skill);
  const weeks = gaps.reduce((s, k) => s + (d.SKILLS[k]?.wk ?? 0), 0);
  const okTiers: Tier[] = evidence === "S" ? ["V", "S"] : ["V"];
  let missingCrit: { skill: string; prof: Prof } | null = null;
  for (const [skill, prof] of band.crit ?? []) {
    const h = held.get(skill);
    if (!h || profIdx(h.skill.prof) < profIdx(prof) || !okTiers.includes(h.tier)) { missingCrit = { skill, prof }; break; }
  }
  const fit = total ? points / total : 0;
  return { band: bandId, pct: Math.round(fit * 100), points, total, lines, gaps, weeks, placeNow: !missingCrit, missingCrit };
}

export function fitAll(held: Map<string, Graded>, d: DomainData, evidence: Params["evidence"]): Fit[] {
  return d.DEST.map((b) => fitBand(b, held, d, evidence))
    .sort((a, b) => b.points / b.total - a.points / a.total || d.DEST.indexOf(a.band) - d.DEST.indexOf(b.band));
}

/** "12.1 of 15 weighted points = 81%". */
export function fitFormula(f: Fit): string {
  const r = (x: number) => (Math.round(x * 10) / 10).toString();
  return `${r(f.points)} of ${r(f.total)} weighted points = ${f.pct}%`;
}

export function holdsBridge(held: Map<string, Graded>): boolean {
  const h = held.get("meter_install");
  return !!h && profIdx(h.skill.prof) >= 2;
}
