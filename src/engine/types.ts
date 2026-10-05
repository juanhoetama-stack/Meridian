// Domain types shared by the engine, store and UI. No salary or payroll fields, by design (SRS SP-1).

export type Tier = "V" | "S" | "I";
export type Prof = "Foundation" | "Working" | "Advanced" | "Expert";
export type EduLevel = "SMA" | "SMK" | "D3" | "D4" | "S1" | "S2" | "S3";
export type UnitId = "RU-1" | "RU-2" | "RU-3" | "RU-4" | "RU-5" | "RU-6" | "HO";
export type EvMark = "m" | "i" | "a";
export type CertType = "SKTTK" | "BNSP" | "K3" | "Other";

/** `skill` holds a taxonomy key (e.g. "tamper") or, when not in the taxonomy, the free text entered. */
export interface Skill { skill: string; prof: Prof; src: string; date?: string }
export interface Cert { type: CertType; name: string; number: string; valid?: string }
export interface Perf { year: number; raw: number | string; scale: string; z: number; unit: string; id: string }

export interface Person {
  id: string;
  name: string; pob: string; dob: string;
  edu: { level: EduLevel; major: string };
  title: string;
  unit: UnitId;
  start: string;
  skills: Skill[]; certs: Cert[]; photo: string | null; ktp: string | null;
  src?: { sf?: string; lms?: string; perf?: string };
  nikHash?: string; perf?: Perf[];
  prov?: { identity: "sf" | "manual"; synced?: string };
  seed: boolean; imported?: boolean; created: string;
}

// ---- Domain data (meridian-data.json) ----

export interface Family {
  id: string; name: string; headcount: number; automatable: number;
  certainty: "High" | "Medium" | "Low"; driver: string; exposedFTE?: number;
  subFamilies: { name: string; bands: string[] }[];
}
export interface Band {
  n: string; fam: string; lv: string; note?: string; bridge?: boolean; wks?: string;
  pop?: number; ev?: EvMark;
  req?: Record<string, [Prof, number]>;
  crit?: [string, Prof][];
}
export interface RoleRule { pattern: string; flags: string; roleProfile: string; family: string; subFamily: string; band: string }
export interface LevelRule { pattern: string; level: number; reason: string }
export interface Unit { id: UnitId; name: string; wave: number; win: string; hc: number }
export interface ProvEntry { t: string; ev: EvMark; rests: string; how: string }
export interface Connector {
  id: string; n: string; role: string; api: string; status: "api" | "none" | "mixed" | "locked";
  base?: string; auth?: string; known?: string; note?: string; gives?: string[];
  map?: [string, string][];
  units?: { u: UnitId; api: string; scale: string; ok: boolean }[];
}
export interface SeedRecord {
  name: string; placeOfBirth: string; dateOfBirth: string; eduLevel: EduLevel; eduMajor: string;
  jobTitle: string; unit: UnitId; startDate: string;
  skills: { skill: string; prof: Prof; src: string; date?: string }[];
  certs?: { type: CertType; name: string; number: string; validUntil?: string }[];
}

export interface DomainData {
  UNITS: Unit[];
  EDU_LEVELS: EduLevel[];
  PROF: Prof[];
  SOURCES: Record<string, Tier>;
  TIER_W: Record<Tier, number>;
  SKILLS: Record<string, { n: string; wk: number }>;
  FAMILIES: Family[];
  BANDS: Record<string, Band>;
  DEST: string[];
  ROLE_RULES: RoleRule[];
  LEVEL_RULES: LevelRule[];
  POP: Record<string, number | string>;
  PROV: Record<string, ProvEntry>;
  SEED: SeedRecord[];
  CONNECTORS: Connector[];
  ORG_MAP: Record<string, UnitId>;
  EDU_MAP: Record<string, EduLevel>;
  COURSES: Record<string, [string, string]>;
  SF_NEW: [string, string, string, EduLevel, string, UnitId, string][];
  LMS_NEW: Record<string, [string, string][]>;
}

// ---- Rules agent ----

export interface Params {
  levels: 4 | 5 | 6;
  scope: "all" | "F01";
  group: "family" | "unit";
  evidence: "V" | "S";
  retire: number;
  high: number;
  kkni: boolean;
}

export interface RoleMatch { roleProfile: string; family: string; subFamily: string; band: string; rule: number }

export interface FitLine { skill: string; need: Prof; held: Prof | null; tier: Tier | null; weight: number; credit: number }
export interface Fit {
  band: string; pct: number; points: number; total: number; lines: FitLine[];
  gaps: string[]; weeks: number; placeNow: boolean; missingCrit: { skill: string; prof: Prof } | null;
}

export type Segment = "retire" | "stay" | "high" | "med" | "low";

export interface Assignment {
  id: string;
  role: RoleMatch | null;
  level: number;          // uncompressed L1–L6
  levelShown: number;     // after compression to params.levels
  levelRule: string;
  confidence: "evidenced" | "assess";
  seg?: Segment;
  fits?: Fit[];           // B2–B6 sorted by pct desc
  bridge?: boolean;
}

export interface TraceStep { n: number; title: string; result: string; rule: string; warn?: boolean }
export interface ReviewItem { id: string; reason: string }

export interface Version {
  id: string; n: number; prompt: string; params: Params; trace: TraceStep[];
  A: Record<string, Assignment>;
  review: ReviewItem[];
  out: string[];
  dups: [string, string][];
  seg: Record<string, string[]>;   // retire, stay, high, med, low, and per destination band B2..B6
  built: string;
  count: number;
  ids: string[];
}
