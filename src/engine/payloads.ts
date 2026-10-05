// Deterministic sample payloads shaped like the real systems' APIs, with the same mess (brief §8.1).
// Generated from SEED + SF_NEW + LMS_NEW; no randomness, so every pull returns the same data.
import type { DomainData, EduLevel, Prof, UnitId } from "./types";
import { nikHash, fnv1a } from "./hash";
import { skillKey } from "../data";

// ---- SAP SuccessFactors (OData v2) ----
export interface SfRow {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;          // OData "/Date(ms)/"
  placeOfBirth: string;
  nationalId: string;           // already hashed on arrival: nik#xxxxxxxx
  jobTitle: string;
  businessUnit: string;         // org code, e.g. REG-JBR
  originalStartDate: string;    // OData "/Date(ms)/"
  degree: string;               // label, e.g. "Vocational High (SMK)"
}

// ---- Moodle (REST web services) ----
export interface MoodleCompletion { course: string; status: "complete" | "inprogress"; timecompleted: string | null; grade: number | null }
export interface MoodleUser { id: string; idnumber: string; fullname: string; department: UnitId; completions: MoodleCompletion[] }

// ---- Regional performance tools ----
export interface RatingRow { employee_no: string; name: string; birth_date: string; period: number; score: number | string }
export interface UnitFeed { unit: UnitId; scale: string; rows: RatingRow[] }

export interface Payloads { sf?: SfRow[]; lms?: MoodleUser[]; perf?: UnitFeed[] }

export const AGUS_EMP = "EMP-48213";
export const AGUS_LEARNER = "learner_9981";
export const AGUS_RATING = "RU2-PRF-0331";

const odataDate = (iso: string) => `/Date(${Date.parse(iso + "T00:00:00Z")})/`;

/** Unique EMP numbers: 8999 is prime, so i·1597 mod 8999 never repeats for i < 8999. Agus is fixed. */
function empId(i: number, name: string): string {
  if (name === "Agus Setiawan") return AGUS_EMP;
  let n = 41000 + ((i * 1597) % 8999);
  if (n === 48213) n = 49999;
  return `EMP-${n}`;
}

function splitName(full: string): [string, string] {
  const t = full.split(" ");
  return t.length === 1 ? [t[0], ""] : [t.slice(0, -1).join(" "), t[t.length - 1]];
}

/** Degree suffix a record would carry in SF, if the person holds a degree. */
function degreeSuffix(level: EduLevel, major: string): string {
  if (level === "D3" || level === "D4") return ", A.Md.";
  if (level === "S2" && /psikolog/i.test(major)) return ", M.Psi.";
  if (level === "S1") {
    if (/teknik/i.test(major)) return ", S.T.";
    if (/informatika|komputer/i.test(major)) return ", S.Kom.";
    if (/akuntansi|manajemen|ekonomi/i.test(major)) return ", S.E.";
    if (/hukum/i.test(major)) return ", S.H.";
  }
  return "";
}

function orgCode(unit: UnitId, i: number, d: DomainData): string {
  const codes = Object.entries(d.ORG_MAP).filter(([, u]) => u === unit).map(([c]) => c);
  return codes[i % codes.length];
}

function degreeLabel(level: EduLevel, d: DomainData): string {
  return Object.entries(d.EDU_MAP).find(([, l]) => l === level)![0];
}

/** One deliberate transfer so the preview shows a real unit change. */
const SF_TRANSFERS: Record<string, UnitId> = { "Agung Wibowo": "RU-2" };

export function sfPayload(d: DomainData): SfRow[] {
  const rows: SfRow[] = d.SEED.map((s, i) => {
    let display = s.name;
    const n = i + 1;
    if (s.name === "Muhammad Rizal") display = "Muh. Rizal, S.T.";
    else if (n % 4 === 0) display = s.name.toUpperCase();
    else if (n % 4 === 1 && n > 1) display = s.name + degreeSuffix(s.eduLevel, s.eduMajor);
    const [firstName, lastName] = splitName(display);
    const unit = SF_TRANSFERS[s.name] ?? s.unit;
    return {
      userId: empId(i, s.name), firstName, lastName,
      dateOfBirth: odataDate(s.dateOfBirth), placeOfBirth: s.placeOfBirth,
      nationalId: nikHash(s.name, s.dateOfBirth),
      jobTitle: s.jobTitle, businessUnit: unit === s.unit ? orgCode(unit, i, d) : orgCode(unit, i + 1, d),
      originalStartDate: odataDate(s.startDate), degree: degreeLabel(s.eduLevel, d),
    };
  });
  d.SF_NEW.forEach(([name, pob, dob, edu, title, unit, start], j) => {
    const i = d.SEED.length + j;
    const [firstName, lastName] = splitName(name);
    rows.push({
      userId: empId(i, name), firstName, lastName,
      dateOfBirth: odataDate(dob), placeOfBirth: pob, nationalId: nikHash(name, dob),
      jobTitle: title, businessUnit: orgCode(unit, i, d), originalStartDate: odataDate(start),
      degree: degreeLabel(edu, d),
    });
  });
  return rows;
}

// ---- Moodle ----

const PROF_GRADE: Record<Prof, number> = { Foundation: 64, Working: 78, Advanced: 91, Expert: 97 };

export function gradeToProf(grade: number | null): Prof {
  if (grade === null) return "Working";
  if (grade >= 95) return "Expert";
  if (grade >= 85) return "Advanced";
  if (grade >= 70) return "Working";
  return "Foundation";
}

function courseFor(skill: string, d: DomainData): string | undefined {
  return Object.entries(d.COURSES).find(([, [k]]) => k === skill)?.[0];
}

const monthDay = (ym: string, day = 14) => (ym.length === 7 ? `${ym}-${String(day).padStart(2, "0")}` : ym);

/** Seeds whose Moodle profile has a blank idnumber; they link by name + unit instead. */
const BLANK_IDNUMBER = new Set(["Rina Marlina", "Nur Aini", "Yuliana Pasaribu"]);

/** Extra completions that change evidence (gains) or must be excluded (pre-2023, in progress). */
const EXTRA: Record<string, MoodleCompletion[]> = {
  "Agus Setiawan": [{ course: "LMS-ANO-115", status: "inprogress", timecompleted: null, grade: null }],
  "Dian Purnamasari": [{ course: "LMS-HH-010", status: "complete", timecompleted: "2025-03-11", grade: 80 }],
  "Nur Aini": [{ course: "LMS-K3-001", status: "complete", timecompleted: "2024-11-06", grade: 76 }],
  Suparman: [{ course: "LMS-K3-001", status: "complete", timecompleted: "2021-05-17", grade: 82 }],
  "Rusdi Hasibuan": [{ course: "LMS-K3-001", status: "complete", timecompleted: "2020-09-08", grade: 79 }],
  "Joko Susilo": [{ course: "LMS-K3-001", status: "complete", timecompleted: "2022-02-21", grade: 74 }],
  "Taufik Hidayat": [{ course: "LMS-K3-001", status: "complete", timecompleted: "2022-10-03", grade: 77 }],
};

function learnerId(i: number, name: string): string {
  if (name === "Agus Setiawan") return AGUS_LEARNER;
  return `learner_${7000 + ((i * 389) % 2900)}`;
}

export function lmsPayload(d: DomainData): MoodleUser[] {
  const sf = sfPayload(d);
  const users: MoodleUser[] = [];
  d.SEED.forEach((s, i) => {
    const own: MoodleCompletion[] = s.skills
      .filter((k) => k.src === "LMS course passed (2023+)")
      .map((k) => ({ course: courseFor(skillKey(k.skill)!, d)!, status: "complete" as const, timecompleted: monthDay(k.date ?? "2024-01"), grade: PROF_GRADE[k.prof] }));
    const completions = [...own, ...(EXTRA[s.name] ?? [])];
    if (!completions.length) return;
    users.push({
      id: learnerId(i, s.name),
      idnumber: BLANK_IDNUMBER.has(s.name) ? "" : sf[i].userId,
      fullname: s.name, department: s.unit, completions,
    });
  });
  d.SF_NEW.forEach(([name, , , , , unit], j) => {
    const list = d.LMS_NEW[name];
    if (!list) return;
    const i = d.SEED.length + j;
    users.push({
      id: learnerId(i, name), idnumber: sf[i].userId, fullname: name, department: unit,
      completions: list.map(([course, date]) => ({ course, status: "complete", timecompleted: date, grade: 78 })),
    });
  });
  users.push(
    { id: "learner_8120", idnumber: "", fullname: "Bagus Prakoso", department: "RU-1", completions: [{ course: "LMS-K3-001", status: "complete", timecompleted: "2024-05-02", grade: 81 }] },
    { id: "learner_8133", idnumber: "", fullname: "Linda Kartika", department: "RU-3", completions: [{ course: "LMS-CS-020", status: "complete", timecompleted: "2023-08-19", grade: 88 }] },
  );
  return users;
}

// ---- Regional performance tools ----

export const RATING_UNITS: { unit: UnitId; scale: string }[] = [
  { unit: "RU-1", scale: "1–5" },
  { unit: "RU-2", scale: "0–100" },
  { unit: "RU-3", scale: "A–E" },
  { unit: "RU-5", scale: "1–4" },
];

const toDmy = (iso: string) => { const [y, m, dd] = iso.split("-"); return `${dd}/${m}/${y}`; };

function score(scale: string, name: string, period: number): number | string {
  const h = parseInt(fnv1a(`${name}|${period}`).slice(0, 6), 16);
  switch (scale) {
    case "1–5": return [3, 3, 4, 4, 5, 2][h % 6];
    case "0–100": return 62 + (h % 31);
    case "A–E": return ["B", "B", "C", "A", "B", "D"][h % 6];
    default: return [3, 2, 3, 4, 3][h % 5];
  }
}

/** A few people also have a 2022 row, which the import ignores (data before 2023 unreliable). */
const HAS_2022 = new Set(["Suparman", "Bambang Hermanto", "Yohanes Manurung", "La Ode Hamzah", "Eko Prasetyo"]);

export function perfPayload(d: DomainData): UnitFeed[] {
  const everyone = [
    ...d.SEED.map((s) => ({ name: s.name, dob: s.dateOfBirth, unit: s.unit })),
    ...d.SF_NEW.map(([name, , dob, , , unit]) => ({ name, dob, unit })),
  ];
  return RATING_UNITS.map(({ unit, scale }) => {
    const prefix = unit.replace("-", "") + "-PRF-";
    const rows: RatingRow[] = [];
    everyone.filter((p) => p.unit === unit).forEach((p, k) => {
      const no = p.name === "Agus Setiawan" ? AGUS_RATING : prefix + String(100 + k * 37).padStart(4, "0");
      const birth = unit === "RU-3" ? toDmy(p.dob) : p.dob;
      if (HAS_2022.has(p.name)) rows.push({ employee_no: no, name: p.name, birth_date: birth, period: 2022, score: score(scale, p.name, 2022) });
      rows.push({ employee_no: no, name: p.name, birth_date: birth, period: 2025, score: score(scale, p.name, 2025) });
    });
    return { unit, scale, rows };
  });
}

export function generatePayloads(d: DomainData, systems: { sf?: boolean; lms?: boolean; perf?: boolean }): Payloads {
  return {
    sf: systems.sf ? sfPayload(d) : undefined,
    lms: systems.lms ? lmsPayload(d) : undefined,
    perf: systems.perf ? perfPayload(d) : undefined,
  };
}
