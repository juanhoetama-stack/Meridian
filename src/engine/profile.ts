// Everything the database table and the profile drawer show about one person, from one pure function,
// so a path or flag can never disagree between screens (Architecture §5.4).
import type { Assignment, DomainData, Fit, Person, RoleMatch, Version } from "./types";
import { gradeAll, tierCounts, type Graded } from "./evidence";
import { certStatus, type CertStatus } from "./dates";
import { matchRole } from "./roles";
import { compressLevel, confidence, levelFor } from "./levels";
import { normName } from "./names";

export type Flag = "expired" | "expiring" | "duplicate" | "review" | "notInHierarchy" | "noKtp";

export const FLAG_LABEL: Record<Flag, string> = {
  expired: "Expired certificate",
  expiring: "Certificate expiring",
  duplicate: "Possible duplicate",
  review: "Title needs review",
  notInHierarchy: "Not in hierarchy yet",
  noKtp: "KTP not on file",
};

export type PathKind = "retire" | "stay" | "high" | "med" | "low" | "mapped" | "review" | "out" | "notIn" | "none";

export interface ProfileView {
  person: Person;
  graded: Graded[];
  tiers: { V: number; S: number; I: number };
  certs: { cert: Person["certs"][number]; status: CertStatus }[];
  role: RoleMatch | null;
  level: number;
  levelShown: number;
  levelRule: string;
  confidence: "evidenced" | "assess";
  assignment: Assignment | null;
  path: { kind: PathKind; label: string };
  topFits: Fit[];
  flags: Flag[];
  duplicateOf: string[];
}

/** Ids that share a normalised name + DOB with someone else. */
export function duplicateIndex(people: Person[]): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const p of people) {
    const k = `${normName(p.name)}|${p.dob}`;
    byKey.set(k, [...(byKey.get(k) ?? []), p.id]);
  }
  const out = new Map<string, string[]>();
  for (const ids of byKey.values()) if (ids.length > 1) for (const id of ids) out.set(id, ids.filter((x) => x !== id));
  return out;
}

export function profileView(p: Person, v: Version | null, d: DomainData, today: string, dups?: Map<string, string[]>): ProfileView {
  const graded = gradeAll(p, d, today);
  const certs = p.certs.map((cert) => ({ cert, status: certStatus(cert.valid, today) }));
  const a = v?.A[p.id] ?? null;
  const role = a?.role ?? matchRole(p.title, d);
  const live = levelFor(p, d, today);
  const level = a?.level || live.level;
  const levelShown = a?.levelShown || compressLevel(level, v?.params.levels ?? 6);
  const n = v?.n ?? 0;

  let path: ProfileView["path"];
  if (!v) path = { kind: "none", label: "No hierarchy built yet" };
  else if (!v.ids.includes(p.id)) path = { kind: "notIn", label: `Not in v${n}: rebuild` };
  else if (v.review.some((r) => r.id === p.id)) path = { kind: "review", label: "In the review queue" };
  else if (v.out.includes(p.id)) path = { kind: "out", label: `Outside v${n} scope` };
  else if (a?.seg === "retire") path = { kind: "retire", label: "Retires on schedule" };
  else if (a?.seg === "stay") path = { kind: "stay", label: "Stays as crew lead" };
  else if (a?.seg === "low") path = { kind: "low", label: "Needs choices, second offer first" };
  else if (a?.seg && a.fits) {
    const f = a.fits[0];
    path = { kind: a.seg, label: `L${levelShown} Path to ${f.band} ${d.BANDS[f.band].n} · ${f.pct}% fit` };
  } else path = { kind: "mapped", label: `L${levelShown} ${role?.roleProfile ?? ""}`.trim() };

  const duplicateOf = dups?.get(p.id) ?? [];
  const flags: Flag[] = [];
  if (certs.some((c) => c.status === "expired")) flags.push("expired");
  if (certs.some((c) => c.status === "expiring")) flags.push("expiring");
  if (duplicateOf.length) flags.push("duplicate");
  if (!matchRole(p.title, d)) flags.push("review");
  if (v && !v.ids.includes(p.id)) flags.push("notInHierarchy");
  if (!p.seed && !p.ktp) flags.push("noKtp");

  return {
    person: p, graded, tiers: tierCounts(graded), certs, role,
    level, levelShown, levelRule: a?.levelRule || live.rule,
    confidence: a?.confidence ?? confidence(level, graded),
    assignment: a, path, topFits: (a?.fits ?? []).slice(0, 3), flags, duplicateOf,
  };
}

/** Where a record's data comes from: "· SF · LMS · Rating" or "· Manual". */
export function sourceTags(p: Person): string[] {
  const t: string[] = [];
  if (p.src?.sf) t.push("SF");
  if (p.src?.lms) t.push("LMS");
  if (p.src?.perf) t.push("Rating");
  return t.length ? t : ["Manual"];
}
