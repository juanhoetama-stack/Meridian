// Evidence tier per skill, with the certificate downgrade rule (brief §5).
import type { DomainData, Person, Skill, Tier } from "./types";
import { certStatus } from "./dates";

export interface Graded { skill: Skill; tier: Tier; base: Tier; reason?: string }

const CERT_SOURCES: Record<string, "SKTTK" | "BNSP"> = {
  "SKTTK certificate": "SKTTK",
  "BNSP certificate": "BNSP",
};

export function gradeSkill(s: Skill, p: Person, d: DomainData, today: string): Graded {
  const base: Tier = d.SOURCES[s.src] ?? "I";
  const type = CERT_SOURCES[s.src];
  if (!type) return { skill: s, tier: base, base };
  const ofType = p.certs.filter((c) => c.type === type);
  if (ofType.some((c) => certStatus(c.valid, today) !== "expired")) return { skill: s, tier: base, base };
  const latest = ofType.map((c) => c.valid ?? "").sort().pop();
  const reason = latest
    ? `${type} certificate expired ${latest}: counted as Inferred until renewed`
    : `No ${type} certificate on file: counted as Inferred`;
  return { skill: s, tier: "I", base, reason };
}

export function gradeAll(p: Person, d: DomainData, today: string): Graded[] {
  return p.skills.map((s) => gradeSkill(s, p, d, today));
}

export function tierCounts(g: Graded[]): Record<Tier, number> {
  const c: Record<Tier, number> = { V: 0, S: 0, I: 0 };
  for (const x of g) c[x.tier]++;
  return c;
}
