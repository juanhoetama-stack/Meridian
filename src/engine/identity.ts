// Identity resolution and survivorship (brief §8.1). Pure: payloads + database (+ your decisions) → ImportPlan.
// Nothing here writes anything; apply.ts turns an accepted plan into records.
import type { DomainData, EduLevel, Perf, Person, Skill, UnitId } from "./types";
import type { MoodleUser, Payloads, SfRow, UnitFeed } from "./payloads";
import { gradeToProf } from "./payloads";
import { cleanName, normName } from "./names";
import { jaroWinkler } from "./jw";
import { normDate } from "./dates";
import { skillName } from "../data";

export type DecisionAnswer = "merge" | "new";

export interface FieldDiff { field: string; ours: string; theirs: string; differs: boolean }
export interface PendingDecision { key: string; sf: SfRow; candidateId: string; score: number; diffs: FieldDiff[] }
export interface PlannedUpdate { id: string; name: string; changes: string[]; notes: string[]; next: Person }
export interface PlannedNew { key: string; name: string; unit: UnitId; title: string; sources: string[]; notes: string[]; draft: Person }
export interface NotImported { system: string; name: string; reason: string }

export interface ImportPlan {
  systems: string[];
  newPeople: PlannedNew[];
  updates: PlannedUpdate[];
  decisions: PendingDecision[];          // still waiting for an answer
  decided: { key: string; answer: DecisionAnswer; candidateId: string }[];
  upToDate: { id: string; name: string }[];
  notImported: NotImported[];
  notes: string[];
  kpis: { newPeople: number; enriched: number; needDecision: number; duplicatesAvoided: number };
  matched: number;                       // SAP SF records matched to someone already in the database
}

const LMS_SRC = "LMS course passed (2023+)";
const LMS_FROM = "2023-01-01";

function fromOData(s: string): string {
  const m = /\/Date\((-?\d+)\)\//.exec(s);
  return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : normDate(s);
}

interface SfNorm { row: SfRow; rawName: string; name: string; norm: string; dob: string; pob: string; unit: UnitId; title: string; start: string; edu: EduLevel; nik: string }

function normaliseSf(row: SfRow, d: DomainData): SfNorm {
  const rawName = [row.firstName, row.lastName].filter(Boolean).join(" ");
  return {
    row, rawName, name: cleanName(rawName), norm: normName(rawName),
    dob: fromOData(row.dateOfBirth), pob: row.placeOfBirth,
    unit: d.ORG_MAP[row.businessUnit], title: row.jobTitle, start: fromOData(row.originalStartDate),
    edu: d.EDU_MAP[row.degree], nik: row.nationalId,
  };
}

const clone = (p: Person): Person => JSON.parse(JSON.stringify(p));

/** Ratings: A–E map to 5–1; z-score within unit and year (population SD). */
function ratingValue(scale: string, s: number | string): number {
  if (scale === "A–E") return { A: 5, B: 4, C: 3, D: 2, E: 1 }[String(s).toUpperCase()] ?? 3;
  return Number(s);
}

export function resolveImport(
  payloads: Payloads, people: Person[], d: DomainData, today: string,
  answers: Record<string, DecisionAnswer> = {},
): ImportPlan {
  const systems = [payloads.sf && "sf", payloads.lms && "lms", payloads.perf && "perf"].filter(Boolean) as string[];
  const notes: string[] = [];
  const notImported: NotImported[] = [];
  const decisions: PendingDecision[] = [];
  const decided: ImportPlan["decided"] = [];

  // Working copies: existing records (by id) and staged new records (by key).
  const next = new Map(people.map((p) => [p.id, clone(p)]));
  const changes = new Map<string, string[]>();
  const updNotes = new Map<string, string[]>();
  const touched = new Set<string>();
  const staged = new Map<string, PlannedNew>();
  const sfToExisting = new Map<string, string>();   // EMP id → person id
  const sfPending = new Set<string>();
  let matched = 0;

  const change = (id: string, text: string) => { changes.set(id, [...(changes.get(id) ?? []), text]); };
  const note = (id: string, text: string) => { updNotes.set(id, [...(updNotes.get(id) ?? []), text]); };

  // ---------- SAP SuccessFactors: identity and employment ----------
  let unitCodes = 0, nameVariants = 0, odataDates = 0;
  for (const row of payloads.sf ?? []) {
    const s = normaliseSf(row, d);
    unitCodes++; odataDates += 2;
    if (s.rawName !== s.name || s.rawName === s.rawName.toUpperCase()) nameVariants++;
    const all = [...next.values()];
    let hit: Person | undefined;
    let how = "";
    hit = all.find((p) => p.src?.sf === row.userId); if (hit) how = "linked";
    if (!hit) { hit = all.find((p) => p.nikHash && p.nikHash === s.nik); if (hit) how = "nik"; }
    if (!hit) { hit = all.find((p) => p.dob === s.dob && normName(p.name) === s.norm); if (hit) how = "exact"; }
    let decision: { cand: Person; score: number } | null = null;
    if (!hit) {
      const scored = all.filter((p) => p.dob === s.dob)
        .map((p) => ({ p, score: jaroWinkler(normName(p.name), s.norm) }))
        .sort((a, b) => b.score - a.score)[0];
      if (scored && scored.score >= 0.95) { hit = scored.p; how = "jw"; }
      else if (scored && scored.score >= 0.8) decision = { cand: scored.p, score: scored.score };
    }

    const key = `sf:${row.userId}`;
    if (decision) {
      const ans = answers[key];
      if (ans === "merge") { hit = decision.cand; how = "decided"; decided.push({ key, answer: ans, candidateId: decision.cand.id }); }
      else if (ans === "new") { decided.push({ key, answer: ans, candidateId: decision.cand.id }); }
      else {
        const c = decision.cand;
        const diffs: FieldDiff[] = [
          ["Full name", c.name, s.rawName], ["Date of birth", c.dob, s.dob], ["Place of birth", c.pob, s.pob],
          ["Unit", c.unit, s.unit], ["Job title", c.title, s.title], ["Start date", c.start, s.start],
          ["Education", c.edu.level, s.edu],
        ].map(([field, ours, theirs]) => ({ field, ours, theirs, differs: ours !== theirs }));
        decisions.push({ key, sf: row, candidateId: c.id, score: decision.score, diffs });
        sfPending.add(row.userId);
        continue;
      }
    }

    if (hit) {
      matched++;
      sfToExisting.set(row.userId, hit.id);
      touched.add(hit.id);
      const p = next.get(hit.id)!;
      if (p.src?.sf !== row.userId) {
        change(p.id, `Link SAP SF ${row.userId}`);
        p.src = { ...p.src, sf: row.userId };
        p.prov = { identity: "sf", synced: today };
      }
      if (!p.nikHash) p.nikHash = s.nik;
      if (normName(p.name) !== s.norm) note(p.id, `Name kept as on the KTP; SAP SF spells it "${s.rawName}".`);
      if (how === "decided") note(p.id, `Matched by your decision (similarity ${decision!.score.toFixed(2)}, same date of birth).`);
      if (s.unit !== p.unit) { change(p.id, `Unit: ${p.unit} → ${s.unit}`); p.unit = s.unit; }
      if (s.title !== p.title) { change(p.id, `Job title: ${p.title} → ${s.title}`); p.title = s.title; }
      if (s.pob !== p.pob) { change(p.id, `Place of birth: ${p.pob} → ${s.pob}`); p.pob = s.pob; }
      if (s.start !== p.start) { change(p.id, `Start date: ${p.start} → ${s.start}`); p.start = s.start; }
      if (s.edu && s.edu !== p.edu.level) { change(p.id, `Education: ${p.edu.level} → ${s.edu}`); p.edu = { ...p.edu, level: s.edu }; }
      continue;
    }

    // New person
    const sameName = all.find((p) => normName(p.name) === s.norm && p.dob !== s.dob);
    const pn: PlannedNew = {
      key, name: s.name, unit: s.unit, title: s.title, sources: ["SAP SF " + row.userId],
      notes: sameName ? [`Same name as ${sameName.id} but a different date of birth: kept as a separate person.`] : [],
      draft: {
        id: "", name: s.name, pob: s.pob, dob: s.dob, edu: { level: s.edu, major: "" }, title: s.title, unit: s.unit,
        start: s.start, skills: [], certs: [], photo: null, ktp: null,
        src: { sf: row.userId }, nikHash: s.nik, prov: { identity: "sf", synced: today },
        seed: false, imported: true, created: "",
      },
    };
    staged.set(row.userId, pn);
  }
  if (payloads.sf) {
    notes.push(`Unit codes mapped: ${unitCodes} SAP SF org codes (REG-JBR, REG-JTG, HQ…) to RU-1 to RU-6 and HO.`);
    notes.push(`Names normalised for matching: ${nameVariants} spelling variants (all caps, degree suffixes such as S.T. and A.Md.). The name on the KTP is kept for display.`);
  }

  // Finds an existing or staged record for an incoming linked source.
  type Target = { kind: "existing"; id: string } | { kind: "new"; pn: PlannedNew } | { kind: "pending" } | null;
  const byEmp = (emp: string): Target => {
    if (sfPending.has(emp)) return { kind: "pending" };
    const ex = sfToExisting.get(emp) ?? [...next.values()].find((p) => p.src?.sf === emp)?.id;
    if (ex) return { kind: "existing", id: ex };
    const pn = staged.get(emp);
    return pn ? { kind: "new", pn } : null;
  };
  const byNameUnit = (name: string, unit: string): Target => {
    const n = normName(name);
    const ex = [...next.values()].find((p) => normName(p.name) === n && p.unit === unit);
    if (ex) return { kind: "existing", id: ex.id };
    const pn = [...staged.values()].find((x) => normName(x.name) === n && x.unit === unit);
    return pn ? { kind: "new", pn } : null;
  };
  const byNameDob = (name: string, dob: string): Target => {
    const n = normName(name);
    const ex = [...next.values()].find((p) => normName(p.name) === n && p.dob === dob);
    if (ex) return { kind: "existing", id: ex.id };
    const pn = [...staged.values()].find((x) => normName(x.name) === n && x.draft.dob === dob);
    return pn ? { kind: "new", pn } : null;
  };

  // ---------- Moodle: learning evidence ----------
  let excludedOld = 0, excludedProgress = 0;
  for (const u of payloads.lms ?? []) {
    const t: Target = (u.idnumber && byEmp(u.idnumber)) || byNameUnit(u.fullname, u.department);
    if (!t) {
      notImported.push({ system: "Moodle LMS", name: u.fullname, reason: `${u.idnumber ? `idnumber ${u.idnumber} not found` : "No idnumber"} and no HR record with this name in ${u.department}` });
      continue;
    }
    if (t.kind === "pending") {
      notImported.push({ system: "Moodle LMS", name: u.fullname, reason: "Waits for your decision on the linked SAP SF record" });
      continue;
    }
    const p = t.kind === "existing" ? next.get(t.id)! : t.pn.draft;
    if (t.kind === "existing") touched.add(p.id);
    const say = (text: string) => (t.kind === "existing" ? change(p.id, text) : undefined);
    if (p.src?.lms !== u.id) {
      say(`Link Moodle ${u.id}`);
      p.src = { ...p.src, lms: u.id };
      if (t.kind === "new") t.pn.sources.push("Moodle " + u.id);
    }
    for (const c of u.completions) {
      if (c.status !== "complete" || !c.timecompleted) { excludedProgress++; continue; }
      if (c.timecompleted < LMS_FROM) { excludedOld++; continue; }
      const course = d.COURSES[c.course];
      if (!course) continue;
      const [key] = course;
      const prof = gradeToProf(c.grade);
      const date = c.timecompleted.slice(0, 7);
      const existing = p.skills.find((s) => s.skill === key);
      if (!existing) {
        p.skills.push({ skill: key, prof, src: LMS_SRC, date } as Skill);
        say(`Add skill ${skillName(key)} (${prof}, ${c.course})`);
      } else if ((d.SOURCES[existing.src] ?? "I") === "I") {
        say(`Strengthen evidence: ${skillName(key)}, ${existing.src} → ${LMS_SRC}`);
        existing.src = LMS_SRC; existing.prof = prof; existing.date = date;
      }
    }
  }
  if (payloads.lms) {
    notes.push(`Excluded completions: ${excludedOld} dated before 2023 and ${excludedProgress} still in progress; only completions from 2023 count as supported evidence.`);
  }

  // ---------- Regional performance tools: ratings ----------
  let dmy = 0, ratings = 0, old = 0;
  for (const feed of payloads.perf ?? []) {
    const current = feed.rows.filter((r) => r.period >= 2023);
    old += feed.rows.length - current.length;
    const byYear = new Map<number, number[]>();
    for (const r of current) byYear.set(r.period, [...(byYear.get(r.period) ?? []), ratingValue(feed.scale, r.score)]);
    const stats = new Map([...byYear].map(([y, xs]) => {
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
      return [y, { mean, sd }];
    }));
    for (const r of current) {
      const dob = normDate(r.birth_date);
      if (dob !== r.birth_date) dmy++;
      ratings++;
      const t = byNameDob(r.name, dob);
      if (!t || t.kind === "pending") {
        notImported.push({ system: `Unit tool ${feed.unit}`, name: r.name, reason: "No HR record with this name and date of birth" });
        continue;
      }
      const st = stats.get(r.period)!;
      const z = st.sd ? Math.round(((ratingValue(feed.scale, r.score) - st.mean) / st.sd) * 100) / 100 : 0;
      const perf: Perf = { year: r.period, raw: r.score, scale: feed.scale, z, unit: feed.unit, id: r.employee_no };
      const p = t.kind === "existing" ? next.get(t.id)! : t.pn.draft;
      if (t.kind === "existing") touched.add(p.id);
      const have = (p.perf ?? []).find((x) => x.year === perf.year && x.id === perf.id);
      if (have && String(have.raw) === String(perf.raw)) continue;
      p.perf = [...(p.perf ?? []).filter((x) => !(x.year === perf.year && x.id === perf.id)), perf];
      p.src = { ...p.src, perf: r.employee_no };
      if (t.kind === "existing") change(p.id, `Add rating ${perf.year} (${feed.unit} · ${perf.raw} on ${feed.scale} · z ${z >= 0 ? "+" : ""}${z.toFixed(2)})`);
      else if (!t.pn.sources.some((x) => x.startsWith("Rating"))) t.pn.sources.push("Rating " + r.employee_no);
    }
  }
  if (payloads.perf) {
    notes.push(`Dates converted: ${payloads.sf ? (payloads.sf.length * 2) + " SAP SF OData dates and " : ""}${dmy} RU-3 dates written dd/mm/yyyy, all to ISO.`);
    notes.push(`Scales converted: ${ratings} ratings on four scales (1–5, 0–100, A–E, 1–4) to z-scores within unit and year; ${old} ratings before 2023 ignored. Ratings are supporting evidence only.`);
  } else if (payloads.sf) {
    notes.push(`Dates converted: ${odataDates} SAP SF OData dates to ISO.`);
  }
  const newCount = staged.size;
  notes.push(`Still needs manual entry: ${newCount ? `KTP images for ${newCount} new ${newCount === 1 ? "person" : "people"}, ` : "KTP images, "}certificates, legacy assessment records, and RU-4 and RU-6 appraisals.`);

  // Moodle and rating notes for orphans are already in notImported.
  const updates: PlannedUpdate[] = [];
  const upToDate: ImportPlan["upToDate"] = [];
  for (const id of touched) {
    const p = next.get(id)!;
    const ch = changes.get(id) ?? [];
    if (ch.length) updates.push({ id, name: p.name, changes: ch, notes: updNotes.get(id) ?? [], next: p });
    else upToDate.push({ id, name: p.name });
  }
  updates.sort((a, b) => a.id.localeCompare(b.id));
  upToDate.sort((a, b) => a.id.localeCompare(b.id));

  return {
    systems,
    newPeople: [...staged.values()],
    updates, decisions, decided, upToDate, notImported, notes,
    kpis: { newPeople: staged.size, enriched: updates.length, needDecision: decisions.length, duplicatesAvoided: matched },
    matched,
  };
}

export type { MoodleUser, UnitFeed };
