# Build: Meridian, the Workforce Redeployment Cockpit

You are building a working desktop web application for a consulting case study. Read this whole file before writing code, then propose a short plan, then build in small, testable steps.

Two companion files may sit next to this prompt:

- `meridian-data.json`: the domain data and seed records. It is the single source of truth for every number, rule and record below. Load it; do not retype it.
- `reference/index.html` (optional): a working prototype of this app. If present, treat it as the behavioural reference. Your build must produce the same numbers for the same inputs. Improve the code and the UX, but never change an output without saying why.

---

## 1. Context

**Who it is for.** Rakamin, a workforce-architecture consultancy, is pitching *Project Meridian* to a masked Indonesian state-owned energy enterprise: ~52,000 employees, 6 regional units (RU-1 to RU-6) and a head office (HO), a 60-year seniority culture, and 1,800+ job titles. Promotion has meant waiting for a seat to open ("menunggu kursi kosong").

**The problem.** One job family, *Field Metering & Manual Ops* (6,000 people), is ~70% automatable within 18 months because smart meters, IoT and AI-assisted operations are already being procured. That is **4,200 roles' worth of work**. The Director of Human Capital cannot lay anyone off (no PHK), cannot migrate SAP or Oracle, and cannot see payroll data, which is off-limits under the Ministry's data-governance policy. The union has heard that "consultants are mapping who gets cut."

**The idea.** Move from position-based to capability-based. A person is **grade + domain + skill portfolio**:

- grade and pay are protected;
- the title stays on the SK (decree) as a label;
- work is assigned by verified skills, not by the seat a person holds.

**Primary user: the Director of Human Capital.** She must defend every number to the Board, the Ministry and the union. A secondary user is the HR data steward who builds the database.

**The journey the app must tell, end to end:**

1. Build one trustworthy workforce database: import through APIs where possible, add manually where not.
2. Build a capability hierarchy with a rules agent driven by a natural-language instruction.
3. View the hierarchy:
   - see AI exposure by family;
   - open Field Metering;
   - **Show redeployment paths**: see *Where do the 4,200 go?*;
   - open a person to see what each claim rests on;
   - take the Board pack.

**The AHA moment.** The single frightening number, 4,200 displaced, dissolves into named, evidenced paths:

- retirement on schedule;
- five destination bands, reached through a "B1 bridge" (installing the meters while training);
- other families' vacancies;
- "choices, never forced".

It is drawn as an electrical **single-line diagram**: a busbar, feeders, a transformer and loads. Design this moment deliberately.

---

## 2. Non-negotiable requirements (the case brief's "What it must do")

1. **One self-contained HTML file, content baked in.** It opens and runs in any browser in one click. Viewers have no login, no build step and no setup. It is hosted on Netlify Drop or GitHub Pages.
2. **A complete user journey** for the primary user, from the problem she walks in with to the decision she walks out with.
3. **The problem is visibly solved.** By the end the user can see and act on the exposure picture, the capability map and the redeployment path. This shows in use, not in captions.
4. **Every screen shows what it asserts.** Any level, score or recommendation lets the user reach what it rests on and how sure it is. Measured, inferred and assumed values are visually distinct everywhere.
5. **An engineered AHA moment**, as described above.
6. **Realistic, workforce-shaped sample content:** the 40 seed records plus the import payloads. A few dozen believable records beat a full dataset.
7. **Design taste is judged hard.** It must not look like an unedited AI generation. There must be intentional hierarchy, calibrated density, honest uncertainty and one consistent visual language.

---

## 3. Technical constraints

- **Output:** a single `dist/index.html` with all JS, CSS and fonts inlined. Target under 1 MB without user images.
- **Suggested stack:** Vite + TypeScript + `vite-plugin-singlefile`. Use vanilla TS or Preact; no UI kit. Fonts come from `@fontsource/inter` (400, 500, 600, 700) and `@fontsource/source-serif-4` (600), inlined as base64 woff2.
- **No runtime network requests:** no CDNs, no analytics, no real API calls, no LLM calls.
- **Persistence:** IndexedDB, with three stores: `people`, `versions` and `meta` (sequence counter, connector state, import history, current version, seeded flag). If IndexedDB is unavailable, fall back to memory and say so in the sidebar.
- **Images:** compress photos to ≤480 px and KTP images to ≤900 px, as JPEG at quality 0.82 via canvas, stored as data URLs.
- **Routing:** hash-based (`#/db/import`, `#/db/add`, `#/db/view`, `#/h/build`, `#/h/view`). The default route is `#/h/view` on the Exposure tab, because the Director's journey starts there.
- **Engine code is pure TypeScript functions,** independent of the DOM, so it can be unit-tested.
- **Security and honesty:**
  - no salary or payroll fields anywhere;
  - NIK is only ever a demo hash (`nik#xxxxxxxx`), never a raw number;
  - KTP images are blurred by default.

---

## 4. Information architecture

**Left sidebar.** The items are numbered because they are a real sequence.

- **Database**
  - 1 Import from systems
  - 2 Add manually
  - 3 View database (shows a count badge)
- **Hierarchy**
  - 4 Build hierarchy
  - 5 View hierarchy (shows a version badge, e.g. `v2`)

**Sidebar footer:**
- the evidence legend;
- a storage status line;
- "Restore sample data" (with a confirmation step). It reseeds the database and resets connectors, history and versions.

**Top bar on every page:**
- a serif page title;
- a one-line purpose;
- right-aligned status: "N people in the database · Hierarchy vN · built <date>".

---

## 5. Domain model

```ts
type Tier = "V" | "S" | "I";                  // Verified, Supported, Inferred
type Prof = "Foundation" | "Working" | "Advanced" | "Expert";
interface Skill { skill: string; prof: Prof; src: EvidenceSource; date?: string }   // src keys in data.SOURCES
interface Cert  { type: "SKTTK" | "BNSP" | "K3" | "Other"; name: string; number: string; valid?: string }
interface Perf  { year: number; raw: number | string; scale: string; z: number; unit: string; id: string }
interface Person {
  id: string;                    // MRD-000001, sequential, never reused (sequence persisted in meta)
  name: string; pob: string; dob: string;           // as on the KTP
  edu: { level: "SMA"|"SMK"|"D3"|"D4"|"S1"|"S2"|"S3"; major: string };
  title: string;                 // legacy title, kept as a label
  unit: "RU-1"|"RU-2"|"RU-3"|"RU-4"|"RU-5"|"RU-6"|"HO";
  start: string;                 // length of service is always computed from this
  skills: Skill[]; certs: Cert[]; photo: string|null; ktp: string|null;
  src?: { sf?: string; lms?: string; perf?: string };  // linked source IDs
  nikHash?: string; perf?: Perf[];
  prov?: { identity: "sf" | "manual"; synced?: string };
  seed: boolean; imported?: boolean; created: string;
}
```

**Evidence tier from the source** (`data.SOURCES`):

| Tier | Sources | Weight |
|---|---|---|
| Verified | SKTTK certificate, BNSP certificate, Assessor check, Work orders (20 or more) | 1.0 |
| Supported | LMS course passed (2023+), Performance rating 2023+, Supervisor attestation | 0.7 |
| Inferred | Self-declared, Role prior, Tenure | 0.4 |

**Downgrade rule.** A skill sourced from "SKTTK certificate" or "BNSP certificate" becomes **Inferred** if the person has no non-expired certificate of that type. Show the reason in the profile.

**Certificate status:**
- `expired` if valid-until < today;
- `expiring` if < 90 days away;
- otherwise `valid`.

---

## 6. Capability architecture (data in `meridian-data.json`)

- **Families:** 12, each with headcount, automatable share, certainty (High = technology procured, Medium = proven but not funded, Low = depends on Gen-AI maturity), driver and sub-families. `exposedFTE = round(headcount × automatable)`; the total is **13,079**.
- **Bands:** B0 to B6 plus D2, D3, G1–G3, T1, T2, C1, C2, E1, E2, P1, P2, A1, H1, I1, S1, R1.
  - B0 is today's route-based meter work.
  - B1 is the **bridge** (Smart-Meter Deployment, up to 1,200 people).
  - **Destination bands** B2–B6 carry `req` (skill → [required proficiency, weight]), `crit` (the placement gate), `pop` (roles to fill) and `ev` (evidence mark for the demand figure).
- **Levels:** 6, set by time-span of discretion (Jaques), with a KKNI crosswalk:

| Level | Name | KKNI |
|---|---|---|
| L1 | Operative | 2–3 |
| L2 | Skilled practitioner | 3–4 |
| L3 | Specialist / crew lead | 4–5 |
| L4 | Senior specialist | 6 |
| L5 | Department head | 7–8 |
| L6 | Division leader | 8–9 |

  The build can compress these to 5 levels (L5–6 → L5) or 4 levels (L1, L2, L3–4 → L3, L5–6 → L4).
- **Skills:** 42 taxonomy skills, each with a training-weeks estimate (`wk`).

---

## 7. The rules agent (Build hierarchy)

It is a deterministic rules engine that runs in the browser. Label it exactly like that: **"Rules agent · runs in this browser · no data leaves the device"**. Never imply an LLM.

### 7.1 Prompt parsing → parameters

| Parameter | Default | Detected from text (EN or ID) |
|---|---|---|
| levels | 6 | `(\d)\s*[- ]?\s*(levels?\|tingkat\|jenjang\|layers?)`, accepted only if 4–6; otherwise warn "ignored: 4 to 6 levels supported" |
| scope | all | "only/hanya/khusus/just … metering", "metering only" → `F01`; "all/semua/seluruh famil…" → `all` |
| group | family | "by/per/group by/kelompok… per region/regional/unit/wilayah" → `unit` |
| evidence | V | "supported/didukung" together with "placement/penempatan/place" → `S`; "verified/terverifikasi" → `V` |
| retire | 56 | "retire…/pensiun/retirement age … NN" (50–65) |
| high | 70 | "high/tinggi … NN%" (50–95) |
| kkni | true | "without/no/tanpa KKNI" → false |

- Show each parameter as an editable control. Under each one, show its origin: *From your text: "…"* or *Default*.
- Provide three example prompts the user can click (from the reference):
  - the default English prompt;
  - "Bentuk hierarchy khusus Field Metering, kelompokkan per region, usia pensiun 56, dan high adjacency mulai 75%.";
  - "Use 4 levels instead of 6, group by region, and allow supported evidence for placement decisions."

### 7.2 Build steps

Each step is a trace item shown sequentially (~320 ms apart; instant under reduced motion). Each item shows a title, a plain-language result and **the rule used**. Steps that raise a warning get an amber marker.

1. **Read the instruction:** restate the parameters in plain words.
2. **Resolve identities:** flag possible duplicates by name + DOB. Never merge automatically. Count records with no KTP image.
3. **Normalise titles to role profiles:** match `data.ROLE_RULES` in order; the first match wins. No match → review queue. Out-of-scope records are excluded.
4. **Grade the evidence:** tier counts, downgrades and skills not in the taxonomy.
5. **Set levels:** apply `data.LEVEL_RULES` in order; the default is L2, or L1 if service is under 3 years. Confidence is "evidenced" if L≥3 and there is an Advanced+ skill at tier ≠ I, or if L≤2 and there is any Verified skill. Otherwise "assess". **Tenure never lifts anyone above L2.**
6. **Find the people whose work is going away** (role band B0):
   - age ≥ retire − 2 → `retire`;
   - else level ≥ 3 → `stay` (crew leads run the exception-based work);
   - else continue to matching.
7. **Match to destination bands** B2–B6:
   - `fit = Σ(credit × weight) / Σ weight`, where `credit = min(1, profIdx(held) / profIdx(required)) × tierWeight`, and a missing skill = 0.
   - Best fit ≥ `high` → `high`; ≥ 40 → `med`; else `low` (path `choices`).
   - Gaps = missing skills sorted by weight. Pathway weeks = sum of `wk` over the gaps.
   - **Eligible to place now** if every `crit` skill is held at ≥ the required proficiency at tier V (or V/S when evidence = S).
   - `bridge` = holds meter installation at ≥ Working.
8. **Assemble the hierarchy:** counts of families, sub-families, bands and people, with correct plurals.

Save each build as a version: `{id, n, prompt, params, trace, A (assignments by person id), review, out, dups, seg, built, count, ids}`. Keep all versions and let the user pick which one is shown.

---

## 8. Pages and acceptance criteria

### 8.1 Import from systems (`#/db/import`)

**Purpose:** speed up building the database and keep it uniform, with one record per person. Whatever an API can give is pulled. Whatever it cannot give is entered manually.

**Top note (honest):** "Prototype connectors. Each returns a sample payload shaped like the real system's API, with the same mess… In production the same flow runs through an integration service inside the Client's network; credentials never sit in a browser."

**Section 1, Source systems** (`data.CONNECTORS`). Each row shows name and role, access type, status chip, known issue, an expandable **Field mapping** table and an action:

- **SAP SuccessFactors.** OData API. Source of truth for identity and employment.
- **Moodle LMS.** REST web services. Completions mapped to skills through `data.COURSES`.
- **Legacy competency and assessment system.** No API: the action is an "Enter manually" link to `#/db/add`. Its generic 5-level scores are not used as evidence.
- **Regional performance tools.** Per-unit chips: RU-1, RU-2, RU-3 and RU-5 have APIs; RU-4 and RU-6 are manual.
- **Oracle Payroll.** Shown as **Off-limits**, with no action.

Connect opens an inline config (endpoint, auth, "Credentials: held by the integration service", all read-only), then "Test and connect" (simulated ~700 ms), and the connected status persists. "Pull all connected" is the primary action.

**Sample payloads.** Generate them deterministically from `SEED` + `SF_NEW` + `LMS_NEW`, matching the reference:

- **SF:**
  - one row per seed, with `userId` EMP-#####; Agus Setiawan = `EMP-48213`;
  - name variants: every 4th seed in UPPERCASE; the next one with a degree suffix (", S.T.", ", A.Md.", ", M.Psi."); Muhammad Rizal appears as **"Muh. Rizal, S.T."**;
  - `businessUnit` in org codes (`REG-JBR`…, mapped via `ORG_MAP`), `degree` labels mapped via `EDU_MAP`, `nik` = demo hash of name + DOB;
  - plus the 12 `SF_NEW` hires, so **52 records**.
- **Moodle:**
  - one learner per seed that has LMS-sourced skills (same course, same proficiency → no change); Agus = `learner_9981` with LMS-ANO-115 **in progress**;
  - Dian Purnamasari gains a handheld completion (Inferred → Supported) and Nur Aini gains K3 (Inferred → Supported);
  - pre-2023 K3 completions for Suparman, Rusdi Hasibuan, Joko Susilo and Taufik Hidayat, which are not counted;
  - some seeds have an empty `idnumber` (link by name + unit);
  - learners for the new hires from `LMS_NEW`;
  - 2 orphans (Bagus Prakoso, Linda Kartika) with no idnumber and no HR match.
- **Unit tools:**
  - ratings for RU-1 (1–5), RU-2 (0–100), RU-3 (A–E, dates in **dd/mm/yyyy**) and RU-5 (1–4);
  - period 2025 for each person, plus some 2022 rows, which are ignored;
  - Agus = `RU2-PRF-0331`.

**Identity resolution and survivorship:**

1. **Normalise names** for matching only: strip degrees and titles (S.T., S.E., S.Kom., S.H., A.Md., M.Psi., M.T., M.M., Ir., Dr(s)., H., Hj.), lowercase, drop punctuation, collapse spaces. For display, use `cleanName` (strip degrees; title-case if all caps).
2. **SF match order:**
   1. previously linked `src.sf`;
   2. hashed NIK;
   3. DOB equal and normalised name equal (0.99);
   4. DOB equal and Jaro-Winkler ≥ 0.95 (auto);
   5. 0.80–0.95 → **Needs your decision**;
   6. otherwise new.

   **Same name with a different DOB = different person.** Add the note: "Same name as MRD-… but a different date of birth: kept as a separate person."
3. **Moodle:** link by `idnumber` → SF staged record or `src.sf` in the database; else by normalised name + unit; else orphan. Completions must be `complete` and dated ≥ 2023-01-01 to count. Add a skill if it is missing; upgrade if the existing tier is I; otherwise no change.
4. **Ratings:** keep periods ≥ 2023; normalise dates; match on normalised name + DOB; compute z-scores within unit and year (A–E map to 5–1). They are supporting evidence only.
5. **Survivorship:**
   - identity and employment come from SAP SF;
   - learning evidence from Moodle;
   - ratings from the unit tools;
   - KTP images and certificates from manual entry only.

**Section 2, Check before saving.** Nothing is written before Save.

- **KPIs:** new people, existing records enriched, need your decision, duplicates avoided.
- **Normalisation notes:** unit codes mapped, names normalised, dates converted, scales converted, excluded completions, what still needs manual entry.
- **Tabs:**
  - *New people*;
  - *Updates*: each change listed, e.g. "Unit: X → Y", "Link SAP SF EMP-…", "Add skill …", "Strengthen evidence …", "Add rating 2025 (…)";
  - *Needs your decision*: a side-by-side comparison with differing cells highlighted, plus "Same person: merge" and "Different people: add as new";
  - *Already up to date*;
  - *Not imported*: with reasons.
- **Save button:** "Save to database: N new, M updated". Pending decisions are left out and the UI says so. Discard is also available.
- **On save:** new people get the next MRD IDs. Updates merge fields, links, skills and ratings. Write an import-history row (time, systems, new, updated, left for review, not imported) and update each connector's "last saved".

**Acceptance (fresh seed):**
- First pull: **12 new, 40 updated, 1 needs decision** (Muh. Rizal vs MRD-000007, score ≈0.85, same DOB). After "Same person", still 12 new / 40 updated and 0 pending.
- A second pull is idempotent: **0 new, 0 updated, 52 matched**.

### 8.2 Add manually (`#/db/add`)

**Subtitle:** this is for what no system gives through an API: KTP image, certificates, legacy assessment records, RU-4 and RU-6 appraisals.

**Fields:**
- An ID preview box ("Employee ID, generated on save: MRD-000041 · Unique, never reused").
- Identity: full name as on the KTP, place of birth, date of birth, photo (optional, drag-drop or click), KTP image.
- Employment: education level + major (optional), job title (datalist of existing titles; live hint "Maps to <role profile> · <family>" or "No role-profile rule matches yet; the record will go to review"), regional unit, start date (live "Length of service: 14 yrs 7 mo").
- Skills: repeatable rows of skill (datalist from the taxonomy; "Not in taxonomy" warning for free text), proficiency, evidence source, and a live strength badge.
- Certifications: repeatable rows of type, name/unit, number, valid until.

**Validation:**
- All required fields; start date after DOB.
- Errors are inline and specific, and clear as soon as the field is fixed.

**Duplicate check:** same normalised name + DOB shows a warning. Pressing Save again keeps both records.

**On save:** a toast "Employee MRD-000041 saved. View record", where the link opens the profile in View database.

### 8.3 View database (`#/db/view`)

**Toolbar:** search (name, ID, title), unit filter, family filter (+ "Needs review"), status filter (has a flag / added by you), count, Export CSV (no images), Add employee.

**Table columns:**
- Person: avatar, name, ID and source tags "· SF · LMS · Rating" or "· Manual".
- Job title + role profile.
- Unit; service (no wrapping).
- Evidence bar: verified/supported/inferred counts.
- **Level and path**, e.g. "L2 Path to B3 Revenue Protection & Loss Investigation · 81% fit", "Retires on schedule", "Stays as crew lead", "Needs choices, second offer first", "Not in v1: rebuild", "In the review queue", "Outside v2 scope".
- Flags:
  - Expired certificate; Certificate expiring;
  - Possible duplicate;
  - Title needs review;
  - Not in hierarchy yet;
  - KTP not on file (only for non-seed records).

An empty filter result says what to do ("Clear filters").

### 8.4 Person profile (drawer, opens from anywhere)

- **Header:**
  - name, ID, age, place and date of birth, unit, service, education;
  - "Title on SK: … (unchanged)";
  - linked-record chips: SAP SF ID, Moodle ID, unit-tool ID, **"Payroll not accessed"**;
  - KTP thumbnail, blurred, with a Show/Hide toggle, or "KTP not on file".
- **Grade / Domain / Skill portfolio trio:** Grade shows "Backed by evidence" or "Confirm by assessment" and "pay unchanged". The level rule used appears as a caption.
- **Skills table:** proficiency, strength bars + label, source, and the downgrade reason in rust.
- **Certifications** with status chips.
- **Where this person can go:**
  - Retire, stay or not-the-displaced-family messages where they apply.
  - Otherwise the top 3 fits, each a button showing **"81%"**. Clicking opens a popover with the per-skill breakdown table (need, held, evidence, weight, credit) and the formula: "12.1 of 15 weighted points = 81%".
  - Gaps: "Gap: A; B +n more (N weeks)".
  - **Decision rights:** ✓ count in planning totals, ✓ invite to assessment, and ✓/✗ place now, naming the missing verified skill. For `low`: "Needs choices, never a forced exit" with the guardrails.
- **Where this record's data comes from:** identity (SAP SF + sync date, or manual entry), skills (n from learning records), ratings with scale and z-score, KTP (with an "Add KTP image" upload).
- Delete record, with confirmation; the ID is never reused.
- Esc closes the drawer; focus moves into it.

### 8.5 Build hierarchy (`#/h/build`)

- A two-column layout:
  - left: the instruction textarea, examples and the parameters panel with "Build hierarchy";
  - right: Agent steps (trace) and a Versions table ("Shown" chip or a "Show" button).
- Ends with a success box ("Hierarchy vN built from N records… View hierarchy").

### 8.6 View hierarchy (`#/h/view`)

- **Version selector.** A **stale banner** appears when records were added or deleted since the version was built, with a Rebuild link.
- **Tabs:** Exposure and redeployment · Structure · Board pack.

**Exposure and redeployment:**
- **Left:** 12 family rows sorted by exposed FTE. Each shows name, "6,000 people · 70% · 22 in database", a bar coloured by certainty and the value. Add a certainty legend.
- **Right (before selection):** "One family carries a third of the exposed work, and it is the only exposure already funded." plus an **Open Field Metering** button.
- **Field Metering deep-dive:**
  - **4,200** (rust, serif, clickable provenance), 6,000 people, 70%;
  - a "When each unit loses its work" timeline: rows RU-1 to RU-6 with rollout windows on an M0–M18 axis, coloured by wave;
  - "48% of the displacement lands in RU-1 and RU-2 by M9";
  - the **Show redeployment paths** button.
- **Other families:** exposure stats plus "Mapped, not acted on in the first 90 days… a destination, not a source."
- **AHA, "Where do the 4,200 go?"** An inline SVG, minimum 1,040 px wide, scrolling horizontally if needed:
  - **Busbar:** a thick navy line labelled "Field Metering · 4,200 roles' worth of displaced work", with the subline "6,000 people today. 1,800 stay to run exception-based work (n in your database). Feeder width is proportional to people."
  - **Main feeders:** Retire (650) on the left, Choices (315, rust) on the right, and the central Redeployed feeder (3,235).
  - **Transformer** (two circles) labelled "B1 bridge: installing the smart meters while training · Up to 1,200 at a time" and "3,235 redeployed ◐".
  - **Sub-busbar** with drops to B2 900, B3 700, B4 800, B5 500, B6 250 and Other families' vacancies 85.
  - Feeder stroke ∝ √people. Small breaker squares sit on each feeder.
  - **Load boxes:** name, population count (serif), a sublabel, up to 3 avatar initials of the database people on that path, and "+n" or "named".
  - Clicking or pressing Enter on a box opens a detail panel: band requirements and the placement gate, plus a table of named people with fit (popover), unit and "Can be placed now?" (Yes, evidence verified / Assess first / Second offer first / Not applicable). The overview state explains the diagram and summarises the database segments.
  - **One orchestrated motion:** feeders "energise" (stroke-dashoffset) in sequence when the diagram first appears. Disable it under `prefers-reduced-motion`.
  - Footnote: "Population figures: Day-30 workforce model ◐○ · Named people: hierarchy vN built from your database."

**Structure:**
- A tree: family → sub-family → band → people (sorted by level), or unit → family → people.
- Each node shows counts and an evidence-mix bar. Destination bands show "N roles to fill". Empty destination bands read "People arrive here through redeployment."
- Sub-families with no defined bands read "part of the full 64-band taxonomy, not defined in this prototype".
- A review queue with reasons.

**Board pack** (printable; print CSS hides the chrome):
- **Headline:** "4,200 roles of work go away; no one is pushed out."
- **KPI rows:** 650 / 3,235 / 215 / 100, and Rp 206B / Rp 1.04T / Rp 833B (4.0x) / 13, each with evidence marks and provenance popovers.
- **Panels:** Board decisions at Day 90; what the evidence supports today (tier shares and placeable count from the current version); guarantees (no PHK, grade and pay protected, in-region first ≥85%, union observer and appeal); assumptions that matter most.
- **A1 must read:** "Rp 180M per FTE per year: a round planning assumption, not Client data (payroll is off-limits); replaced by Finance grade-band aggregates at Day 45."

---

## 9. Provenance and evidence UI

- **Number marks:** ● Measured (filled), ◐ Inferred (half), ○ Assumed (ring). Build them in CSS, not emoji.
- **Skill strength:** a three-bar signal icon (3 = Verified, 2 = Supported, 1 = Inferred) plus a text label. Never rely on colour alone.
- **Popovers:** any element with `data-prov="<key>"` opens a popover from `data.PROV` (title, mark, "Rests on", "How it is calculated"). Any fit percentage opens its breakdown. Close on outside click or Esc. The popover must stay inside the viewport.
- **Two scales, labelled separately:** population figures (the deck model) never change with the user's data. Named-people counts come from the current hierarchy version.

---

## 10. Visual design

**Tokens:**

| Token | Value |
|---|---|
| paper | `#F5F6F4` |
| panel | `#FFFFFF` |
| ink | `#13202E` |
| muted | `#5B6573` |
| faint | `#8A939E` |
| line | `#DDE1E4` |
| line2 | `#ECEEF0` |
| navy | `#12305A` (tint `#EAF0F7`) |
| teal | `#0F766E` (tint `#E4F2F0`) |
| rust | `#B4441B` (tint `#F8ECE6`) |
| amber | `#B7791F` (tint `#F7EEDC`) |

These match the pitch deck.

**Type:**
- Source Serif 4 (600) for page titles, big numbers and the AHA heading.
- Inter for the UI, with tabular numbers.
- 14 px body; a clear scale.
- Sentence case. **No all-caps eyebrows.**

**Layout:**
- A 252 px light sidebar.
- Content max-width ~1320 px.
- Hairline borders and a 6 px radius. Vary hierarchy instead of identical card grids.
- No gradients, no drop-shadow kit, no emoji, no "→" appended to buttons.

**Spend boldness in one place:** the single-line diagram. Keep everything else quiet.

**Accessibility:**
- visible focus;
- keyboard access to rows, diagram boxes and drop zones;
- ARIA roles for tabs, the drawer and toasts;
- WCAG AA contrast;
- reduced motion respected.

**Responsive:** desktop first. At ≤1100 px, stack the two-column layouts. At ≤820 px, the sidebar sits on top.

**Copy:**
- Plain verbs; actions keep their names through the flow ("Save employee" → "Employee … saved").
- Errors say what is wrong and how to fix it.
- Empty states invite an action.
- The UI language is English. Indonesian terms (KTP, SK, PHK, PKB, SKTTK, BNSP, KKNI) stay as they are.

---

## 11. Numbers that must reconcile (write tests for these)

Use Vitest for the engine and Playwright for smoke tests.

- `exposedFTE` total = **13,079**; Field Metering = **4,200**.
- **Agus Setiawan** (seed #8 → **MRD-000008**, RU-2, born 1979-03-12):
  - level **L2**, confidence "evidenced";
  - 6 skills = 2 verified · 2 supported · 2 inferred;
  - fits **B3 81%**, **B2 76%**, **B4 58%**;
  - B3 gaps: loss investigation procedure, alert triage (12 weeks); B2 gap: AMI comms fault diagnosis (10 weeks);
  - not placeable in B3 until tamper detection is verified at Advanced;
  - linked IDs after import: `EMP-48213`, `learner_9981`, `RU2-PRF-0331`.
- **Default build (v1, 40 seeds):**
  - 22 Field Metering people: 3 retire, 4 stay, 8 high, 3 medium, 4 need choices;
  - 1 record in the review queue (Teguh Santoso, "Staf Khusus Direksi");
  - Fransiskus Nggadas's SKTTK skill is downgraded (certificate expired 2024-07-31).
- **Import:**
  - first pull = 12 new / 40 updated / 1 decision;
  - after merge 0 pending;
  - second pull = 0 / 0 / 52 matched;
  - after import + rebuild, the new hires appear in the AHA paths.
- **Population figures** in the diagram and Board pack: 650, 3,235, 215, 100, 1,800, 85, 4,200.
- **IDs:**
  - sequential and never reused after a delete;
  - "Restore sample data" restarts at MRD-000001.
- No console errors on any route.
- `dist/index.html` works when opened from a static host and from `file://`.

---

## 12. Out of scope (do not build)

- Real API calls, OAuth flows, servers or LLM calls.
- Salary, grade-pay or payroll data.
- Accounts, roles or login.
- Editing existing records, except adding a KTP image.
- The other 46,000 people at person level.
- Real photos or real KTP images in the seed data (avatars use initials).

---

## 13. How to work

1. **Plan first.** Restate the journey, list the modules, and list the tests from §11. Wait for confirmation if anything here is ambiguous; otherwise proceed.
2. **Suggested structure:**
   - `src/data` (load `meridian-data.json`);
   - `src/engine` (`evidence.ts`, `roles.ts`, `fit.ts`, `build.ts`, `parse.ts`, `identity.ts`, `payloads.ts`);
   - `src/store` (IndexedDB);
   - `src/ui` (shell, pages, drawer, popover, toast, diagram);
   - `src/styles`.
3. **Build the engine with unit tests first,** then the UI page by page, in this order: Import → Add → Database → Build → View (Exposure + AHA, Structure, Board).
4. **After each page,** run the app, take screenshots (Playwright) at 1440×900, critique them against §10, and fix before moving on.
5. **Finish with:**
   - `npm run build` → a single `dist/index.html`;
   - a README covering what it is, how to run it, how to deploy (drag `dist/index.html` to Netlify Drop, or push to GitHub Pages) and the honest limitations (prototype connectors, rules agent, browser-only storage);
   - a short CHANGELOG of any deviation from the reference outputs, with reasons.
