// The rules agent: a deterministic 8-step pipeline (brief §7.2). Pure: same inputs, same Version.
import type { Assignment, DomainData, Params, Person, ReviewItem, TraceStep, Version } from "./types";
import { gradeAll, tierCounts } from "./evidence";
import { matchRole } from "./roles";
import { compressLevel, confidence, levelFor } from "./levels";
import { fitAll, holdings, holdsBridge } from "./fit";
import { normName } from "./names";
import { age } from "./dates";
import { describeParams, parseInstruction } from "./parse";
import { skillKey } from "../data";

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

export interface BuildInput {
  people: Person[];
  params: Params;
  prompt: string;
  n: number;
  built: string;   // ISO timestamp
  today: string;   // ISO date
}

export function findDuplicates(people: Person[]): [string, string][] {
  const byKey = new Map<string, string[]>();
  for (const p of people) {
    const k = `${normName(p.name)}|${p.dob}`;
    byKey.set(k, [...(byKey.get(k) ?? []), p.id]);
  }
  const out: [string, string][] = [];
  for (const ids of byKey.values()) for (let i = 1; i < ids.length; i++) out.push([ids[0], ids[i]]);
  return out;
}

export function build(input: BuildInput, d: DomainData): Version {
  const { people, params, prompt, n, built, today } = input;
  const trace: TraceStep[] = [];
  const A: Record<string, Assignment> = {};
  const review: ReviewItem[] = [];
  const out: string[] = [];

  // 1 · Read the instruction
  const parsed = parseInstruction(prompt);
  trace.push({
    n: 1, title: "Read the instruction",
    result: describeParams(params) + (parsed.warnings.length ? `. ${parsed.warnings.join("; ")}.` : "."),
    rule: "Parameters come from your text where it names them; anything it does not mention keeps its default, and every value stays editable.",
    warn: parsed.warnings.length > 0,
  });

  // 2 · Resolve identities
  const dups = findDuplicates(people);
  const noKtp = people.filter((p) => !p.ktp).length;
  const noKtpNew = people.filter((p) => !p.ktp && !p.seed).length;
  trace.push({
    n: 2, title: "Resolve identities",
    result: `${plural(people.length, "record")} checked; ${dups.length === 0 ? "no possible duplicates" : plural(dups.length, "possible duplicate") + " flagged for you to review"}. ${plural(noKtp, "record")} ${noKtp === 1 ? "has" : "have"} no KTP image on file${noKtp > noKtpNew ? " (sample records carry none by design)" : ""}.`,
    rule: "Same normalised name and date of birth flags a possible duplicate. Records are never merged automatically.",
    warn: dups.length > 0 || noKtpNew > 0,
  });

  // 3 · Normalise titles to role profiles
  const inScope: Person[] = [];
  const profiles = new Set<string>();
  for (const p of people) {
    const role = matchRole(p.title, d);
    if (!role) {
      review.push({ id: p.id, reason: `No role-profile rule matches "${p.title}"` });
      continue;
    }
    if (params.scope !== "all" && role.family !== params.scope) { out.push(p.id); continue; }
    profiles.add(role.roleProfile);
    inScope.push(p);
    A[p.id] = { id: p.id, role, level: 0, levelShown: 0, levelRule: "", confidence: "assess" };
  }
  trace.push({
    n: 3, title: "Normalise titles to role profiles",
    result: `${plural(inScope.length, "title")} mapped to ${plural(profiles.size, "role profile")}; ${review.length === 0 ? "none" : plural(review.length, "record")} sent to the review queue${out.length ? `; ${plural(out.length, "record")} outside this scope excluded` : ""}.`,
    rule: "Role-profile rules are applied in order and the first match wins. A title no rule matches goes to review, never to a guess.",
    warn: review.length > 0,
  });

  // 4 · Grade the evidence
  const gradedBy = new Map(people.map((p) => [p.id, gradeAll(p, d, today)]));
  const tiers = { V: 0, S: 0, I: 0 };
  let downgrades = 0, offTaxonomy = 0;
  for (const p of inScope) {
    const g = gradedBy.get(p.id)!;
    const c = tierCounts(g);
    tiers.V += c.V; tiers.S += c.S; tiers.I += c.I;
    downgrades += g.filter((x) => x.reason).length;
    offTaxonomy += g.filter((x) => !skillKey(x.skill.skill)).length;
  }
  const totalSkills = tiers.V + tiers.S + tiers.I;
  trace.push({
    n: 4, title: "Grade the evidence",
    result: `${plural(totalSkills, "skill claim")}: ${tiers.V} verified, ${tiers.S} supported, ${tiers.I} inferred. ${downgrades === 0 ? "No downgrades" : plural(downgrades, "certificate-based skill") + " downgraded to inferred (certificate expired or missing)"}${offTaxonomy ? `; ${plural(offTaxonomy, "skill")} not in the taxonomy` : ""}.`,
    rule: "Tier comes from the source: verified 1.0, supported 0.7, inferred 0.4. A skill sourced from an SKTTK or BNSP certificate counts as inferred unless a non-expired certificate of that type is on file.",
    warn: downgrades > 0 || offTaxonomy > 0,
  });

  // 5 · Set levels
  const dist: Record<number, number> = {};
  let evidenced = 0;
  for (const p of inScope) {
    const a = A[p.id];
    const lv = levelFor(p, d, today);
    a.level = lv.level;
    a.levelShown = compressLevel(lv.level, params.levels);
    a.levelRule = lv.rule;
    a.confidence = confidence(lv.level, gradedBy.get(p.id)!);
    dist[a.levelShown] = (dist[a.levelShown] ?? 0) + 1;
    if (a.confidence === "evidenced") evidenced++;
  }
  const distText = Object.keys(dist).sort().map((k) => `L${k} ${dist[Number(k)]}`).join(", ");
  trace.push({
    n: 5, title: "Set levels",
    result: `${distText || "No one to level"}${params.levels < 6 ? ` (compressed to ${params.levels} levels)` : ""}. ${evidenced} backed by evidence, ${inScope.length - evidenced} to confirm by assessment.`,
    rule: "Title markers set the level (division, senior specialist, manager, crew lead). Otherwise L2, or L1 under 3 years of service. Tenure never lifts anyone above L2.",
  });

  // 6 · Find the people whose work is going away
  const seg: Record<string, string[]> = { retire: [], stay: [], high: [], med: [], low: [], bridge: [] };
  for (const b of d.DEST) seg[b] = [];
  const displaced = inScope.filter((p) => A[p.id].role?.band === "B0");
  const toMatch: Person[] = [];
  for (const p of displaced) {
    const a = A[p.id];
    if (age(p.dob, today) >= params.retire - 2) { a.seg = "retire"; seg.retire.push(p.id); }
    else if (a.level >= 3) { a.seg = "stay"; seg.stay.push(p.id); }
    else toMatch.push(p);
  }
  trace.push({
    n: 6, title: "Find the people whose work is going away",
    result: `${plural(displaced.length, "person", "people")} in route-based meter work (band B0): ${seg.retire.length} retire on schedule, ${seg.stay.length} stay as crew leads, ${toMatch.length} to match.`,
    rule: `Band B0 only. Age ${params.retire - 2} or over (retirement age ${params.retire} minus 2) retires on schedule; L3 and above stays to run the exception-based work; everyone else is matched.`,
  });

  // 7 · Match to destination bands
  let placeable = 0;
  for (const p of toMatch) {
    const a = A[p.id];
    const held = holdings(gradedBy.get(p.id)!, d);
    const fits = fitAll(held, d, params.evidence);
    a.fits = fits;
    a.bridge = holdsBridge(held);
    const best = fits[0];
    // Classified on the displayed whole percentage, so "70% fit" with high = 70 always reads as high.
    a.seg = best.pct >= params.high ? "high" : best.pct >= 40 ? "med" : "low";
    seg[a.seg].push(p.id);
    if (a.seg !== "low") {
      seg[best.band].push(p.id);
      if (best.placeNow) placeable++;
    }
    if (a.bridge) seg.bridge.push(p.id);
  }
  trace.push({
    n: 7, title: "Match to destination bands",
    result: `${seg.high.length} high fit, ${seg.med.length} medium, ${seg.low.length} need choices. ${placeable} can be placed now on ${params.evidence === "S" ? "verified or supported" : "verified"} evidence; ${seg.bridge.length} can start on the B1 bridge.`,
    rule: `Fit = Σ(credit × weight) ÷ Σ weight, where credit = min(1, held ÷ required proficiency) × evidence weight. High from ${params.high}%, medium from 40%, otherwise choices. Place now only if every gate skill is held at the required level on ${params.evidence === "S" ? "verified or supported" : "verified"} evidence.`,
    warn: seg.low.length > 0,
  });

  // 8 · Assemble the hierarchy
  const fams = params.scope === "all" ? d.FAMILIES : d.FAMILIES.filter((f) => f.id === params.scope);
  const subs = fams.reduce((s, f) => s + f.subFamilies.length, 0);
  const bands = new Set(fams.flatMap((f) => f.subFamilies.flatMap((s) => s.bands))).size;
  trace.push({
    n: 8, title: "Assemble the hierarchy",
    result: `${plural(fams.length, "family", "families")}, ${plural(subs, "sub-family", "sub-families")}, ${plural(bands, "band")} and ${plural(inScope.length, "person", "people")}${params.group === "unit" ? ", grouped by regional unit" : ""}.`,
    rule: params.group === "unit" ? "Tree: regional unit → family → people, sorted by level." : "Tree: family → sub-family → band → people, sorted by level.",
  });

  return {
    id: `v${n}`, n, prompt, params, trace, A, review, out, dups, seg, built,
    count: people.length, ids: people.map((p) => p.id),
  };
}
