# Software Requirements Specification: Meridian

| | |
|---|---|
| Document | SRS · v0.1 draft for review |
| Date | 2026-10-05 |
| Upstream | [BRD](BRD.md) · [PRD](PRD.md) |
| Downstream | [Architecture](ARCHITECTURE.md) · [Plan](PLAN.md) |
| Conventions | "shall" = mandatory; "should" = expected. IDs are stable and referenced by tests. `data.X` means key `X` of `meridian-data.json` |

---

## 1. Introduction

### 1.1 Purpose
This SRS specifies the functional and non-functional requirements of Meridian precisely enough to implement and test it. The brief (`CLAUDE_CODE_PROMPT.md`) remains authoritative. Where this SRS adds detail the brief leaves open, the addition is marked **[D]** (derived) and listed in §10.

### 1.2 Definitions

| Term | Meaning |
|---|---|
| Tier | Evidence strength of a skill: **V** Verified (weight 1.0), **S** Supported (0.7), **I** Inferred (0.4), via `data.SOURCES` and `data.TIER_W` |
| Prof | Proficiency: Foundation (1), Working (2), Advanced (3), Expert (4). The index is `profIdx` |
| Band | A role band (`data.BANDS`). B0 = today's route-based meter work. B1 = bridge. B2 to B6 = destination bands (`data.DEST`) |
| Version | One saved run of the rules agent (§3.6.4) |
| Population figures | Deck-model numbers in `data.POP`. They never change with user data |
| Named people | People in the user's database, counted from the current version |
| MRD ID | `MRD-` + 6-digit sequence. Persisted counter; never reused |
| Today | The as-of date for ages, service and certificate status. Injected into the engine (§10, D-1) |

### 1.3 Overview
§2 describes the product environment. §3 states functional requirements by module. §4 covers data. §5 covers the external interfaces (simulated). §6 lists non-functional requirements. §7 gives security and privacy rules. §8 states the algorithms precisely. §9 contains the acceptance test suite. §10 lists derived decisions. §11 gives traceability.

## 2. Overall description

### 2.1 Product perspective
A standalone single-page web app delivered as one HTML file. It has no back end. All "integrations" are deterministic sample payloads generated in the browser.

### 2.2 Users
The Director of Human Capital (primary) and the HR data steward (secondary). See PRD §2.

### 2.3 Operating environment
Current desktop Chrome, Edge, Firefox and Safari (two latest majors). The app is served from a static host (Netlify Drop or GitHub Pages) or opened from `file://`. It is desktop-first and usable down to 820 px wide.

### 2.4 Constraints
- C-1: Single `dist/index.html`. All JS, CSS and fonts inlined. Under 1 MB without user images.
- C-2: No runtime network requests (no CDN, analytics, APIs or LLMs).
- C-3: Engine logic is pure TypeScript with no DOM dependency, so it can be unit-tested.
- C-4: No salary or payroll fields in any type, store, UI or export.

## 3. Functional requirements

### 3.1 Shell and navigation (SH)

| ID | Requirement |
|---|---|
| SH-1 | The app shall use hash routes `#/db/import`, `#/db/add`, `#/db/view`, `#/h/build` and `#/h/view`. An empty or unknown hash shall redirect to `#/h/view` on the Exposure tab |
| SH-2 | The sidebar (252 px) shall show the groups Database (1 Import from systems, 2 Add manually, 3 View database + count badge) and Hierarchy (4 Build hierarchy, 5 View hierarchy + version badge `vN`) and mark the active route |
| SH-3 | The sidebar footer shall show the evidence legend (● Measured, ◐ Inferred, ○ Assumed; three-bar V/S/I), a storage status line ("Saved in this browser (IndexedDB)" or "Memory only: changes are lost on reload") and "Restore sample data" |
| SH-4 | Restore sample data shall ask for confirmation. Then it shall clear all stores, reseed the 40 records as MRD-000001…MRD-000040, reset the sequence, connectors, import history and versions, and run a default build v1 **[D]** |
| SH-5 | Every page shall show a top bar: serif title, one-line purpose and right-aligned status "N people in the database · Hierarchy vN · built <date>" |
| SH-6 | On first load with an empty store, the app shall seed the 40 records, set `meta.seeded`, and run the default build to create v1 **[D]** |
| SH-7 | At ≤1100 px two-column layouts shall stack. At ≤820 px the sidebar shall sit above the content |

### 3.2 Import from systems (IM)

| ID | Requirement |
|---|---|
| IM-1 | The page shall show the prototype note verbatim from brief §8.1 |
| IM-2 | It shall list the five connectors from `data.CONNECTORS`: name, role, access type, status chip, known issue, expandable field-mapping table (`map`) and action |
| IM-3 | Actions: **sf**, **lms** → Connect. **legacy** → "Enter manually" link to `#/db/add`, with the note that its generic 5-level scores are not used as evidence. **perf** → per-unit chips (RU-1, RU-2, RU-3, RU-5 API; RU-4, RU-6 manual). **payroll** → "Off-limits" chip, no action |
| IM-4 | Connect shall open an inline read-only config (endpoint `base`, `auth`, "Credentials: held by the integration service"). "Test and connect" shall simulate ~700 ms, then set status Connected. Connector state shall persist in `meta` |
| IM-5 | "Pull all connected" (primary action) shall generate payloads for connected systems (§8.7), run identity resolution and survivorship (§8.6), and present "Check before saving". **Nothing shall be written before Save** |
| IM-6 | Check before saving shall show KPIs (new people, existing records enriched, need your decision, duplicates avoided) and normalisation notes (unit codes mapped, names normalised, dates converted, scales converted, excluded completions, what still needs manual entry) |
| IM-7 | Tabs: *New people*; *Updates* (one line per change: "Unit: X → Y", "Link SAP SF EMP-…", "Add skill …", "Strengthen evidence …", "Add rating 2025 (…)"); *Needs your decision* (side-by-side comparison, differing cells highlighted, "Same person: merge" / "Different people: add as new"); *Already up to date*; *Not imported* (with reasons) |
| IM-8 | The Save button shall read "Save to database: N new, M updated". Pending decisions shall be excluded, and the UI shall say so. Discard shall drop the staged import |
| IM-9 | On Save: new people get the next MRD IDs; updates merge fields, links, skills and ratings; an import-history row is written (time, systems, new, updated, left for review, not imported); each pulled connector's "last saved" is updated |
| IM-10 | A pull on an already-imported database shall yield 0 new, 0 updated and 52 matched (idempotence) |

### 3.3 Add manually (AD)

| ID | Requirement |
|---|---|
| AD-1 | The subtitle shall explain that this page covers what no system gives through an API: KTP image, certificates, legacy assessment records, RU-4 and RU-6 appraisals |
| AD-2 | An ID preview shall read "Employee ID, generated on save: MRD-0000NN · Unique, never reused", with the value taken from the persisted sequence |
| AD-3 | Identity: full name as on the KTP*, place of birth*, date of birth*, photo (optional; drag-drop or click; keyboard operable), KTP image (optional for save; its absence raises a flag) **[D]** |
| AD-4 | Employment: education level + major (optional), job title* (datalist of existing titles; live hint "Maps to <role profile> · <family>" or "No role-profile rule matches yet; the record will go to review"), regional unit*, start date* (live "Length of service: 14 yrs 7 mo") |
| AD-5 | Skills: repeatable rows of skill (taxonomy datalist; "Not in taxonomy" warning for free text), proficiency, evidence source and a live strength badge |
| AD-6 | Certifications: repeatable rows of type (SKTTK, BNSP, K3, Other), name/unit, number and valid until |
| AD-7 | Validation shall cover required fields and start date after DOB. Errors are inline and specific, appear on submit or blur, and clear as soon as the field becomes valid |
| AD-8 | If a record with the same normalised name + DOB exists, the app shall show a warning naming the existing MRD ID. Pressing Save again keeps both records |
| AD-9 | Images are compressed via canvas to JPEG q0.82: photos ≤480 px, KTP ≤900 px on the long edge. Stored as data URLs |
| AD-10 | On save: the toast "Employee MRD-0000NN saved. View record" (role=status). The link opens the profile drawer on View database |

### 3.4 View database (DB)

| ID | Requirement |
|---|---|
| DB-1 | Toolbar: search (name, ID, title), unit filter, family filter (+ "Needs review"), status filter (has a flag / added by you), result count, Export CSV, Add employee |
| DB-2 | Columns: Person (initials avatar or photo, name, ID, source tags "· SF · LMS · Rating" or "· Manual"); job title + role profile; unit; service (no wrap); evidence bar (V/S/I counts); level and path; flags |
| DB-3 | Level-and-path strings per §8.5.4 (e.g. "L2 Path to B3 Revenue Protection & Loss Investigation · 81% fit", "Retires on schedule", "Stays as crew lead", "Needs choices, second offer first", "Not in v1: rebuild", "In the review queue", "Outside v2 scope") |
| DB-4 | Flags: Expired certificate; Certificate expiring; Possible duplicate; Title needs review; Not in hierarchy yet; KTP not on file (non-seed records only) |
| DB-5 | Rows shall be keyboard-focusable. Enter or click opens the profile drawer |
| DB-6 | An empty result shall say so and offer "Clear filters" |
| DB-7 | Export CSV shall include identity, employment, skills summary, certificates summary, level and path. It shall exclude photo, KTP and NIK hash **[D]** |

### 3.5 Person profile drawer (PR)

| ID | Requirement |
|---|---|
| PR-1 | The drawer is openable from any page (database rows, diagram tables, structure tree, toasts). role=dialog, aria-modal. Focus moves in, is trapped and is restored on close. Esc closes it |
| PR-2 | Header: name, ID, age, place and date of birth, unit, service, education; "Title on SK: … (unchanged)"; chips for SAP SF ID, Moodle ID, unit-tool ID and **"Payroll not accessed"**; KTP thumbnail blurred with a Show/Hide toggle, or "KTP not on file" |
| PR-3 | Grade / Domain / Skill portfolio trio. Grade shows the level, "Backed by evidence" or "Confirm by assessment", "pay unchanged", and a caption with the level rule used |
| PR-4 | Skills table: skill, proficiency, strength icon + label, source, and the downgrade reason in rust where it applies |
| PR-5 | Certifications with status chips (valid / expiring / expired) |
| PR-6 | Where this person can go: retire, stay or not-in-displaced-family message where it applies; otherwise the top 3 fits as buttons ("81%"). Each opens the breakdown popover (need, held, evidence, weight, credit) with the formula "12.1 of 15 weighted points = 81%" |
| PR-7 | Gaps line: "Gap: A; B +n more (N weeks)" |
| PR-8 | Decision rights: ✓ count in planning totals; ✓ invite to assessment; ✓ or ✗ place now, naming the missing verified skill. For `low`: "Needs choices, never a forced exit" plus guardrails |
| PR-9 | Data lineage: identity (SAP SF + sync date, or manual entry); skills (n from learning records); ratings (scale, raw, z-score); KTP (with "Add KTP image" upload, the only permitted edit) |
| PR-10 | Delete record with confirmation. The ID is never reused |

### 3.6 Build hierarchy (BH)

| ID | Requirement |
|---|---|
| BH-1 | Label exactly: "Rules agent · runs in this browser · no data leaves the device". No copy shall imply an LLM |
| BH-2 | Left column: instruction textarea; three clickable example prompts (§8.1); a parameters panel with editable controls, each showing "From your text: "…"" or "Default"; "Build hierarchy" button |
| BH-3 | Right column: Agent steps trace and Versions table |
| BH-4 | The trace shall show 8 steps (§8.5) in sequence, ~320 ms apart (instant under reduced motion). Each step has a title, a plain-language result and "Rule used". Warnings get an amber marker |
| BH-5 | Each build shall be saved as a version `{id, n, prompt, params, trace, A, review, out, dups, seg, built, count, ids}`. All versions are kept; the user picks which is shown |
| BH-6 | Completion shows a success box: "Hierarchy vN built from N records…" with a View hierarchy link |

### 3.7 View hierarchy (VH)

| ID | Requirement |
|---|---|
| VH-1 | A version selector. A stale banner appears when the current database ids ≠ version `ids` (records added or deleted), with a Rebuild link |
| VH-2 | Tabs (ARIA tablist): Exposure and redeployment · Structure · Board pack |
| VH-3 | Exposure, left: 12 family rows sorted by exposed FTE desc. Each shows name, "6,000 people · 70% · 22 in database", a bar coloured by certainty and the value. Includes a certainty legend |
| VH-4 | Exposure, right (no selection): "One family carries a third of the exposed work, and it is the only exposure already funded." plus "Open Field Metering" |
| VH-5 | Field Metering deep-dive: **4,200** (rust, serif, provenance on click), 6,000 people, 70%; "When each unit loses its work" timeline RU-1…RU-6 on an M0–M18 axis, coloured by wave; "48% of the displacement lands in RU-1 and RU-2 by M9" (computed from `UNITS.hc`); "Show redeployment paths" button |
| VH-6 | Other families: exposure stats plus "Mapped, not acted on in the first 90 days… a destination, not a source." |
| VH-7 | AHA diagram per PRD §4 and §8.8 below: inline SVG ≥1,040 px wide, horizontal scroll if needed; keyboard-operable load boxes; detail panel; one energise animation; footnote |
| VH-8 | Structure: a tree by family → sub-family → band → people (sorted by level), or unit → family → people when group = unit. Node counts and an evidence-mix bar. Destination bands show "N roles to fill"; empty ones read "People arrive here through redeployment."; sub-families with no bands read "part of the full 64-band taxonomy, not defined in this prototype"; a review queue with reasons |
| VH-9 | Board pack: the headline "4,200 roles of work go away; no one is pushed out."; KPI rows 650 / 3,235 / 215 / 100 and Rp 206B / Rp 1.04T / Rp 833B (4.0x) / 13, each with evidence mark and provenance; panels (Board decisions at Day 90; what the evidence supports today, from the current version; guarantees; assumptions that matter most); the A1 note verbatim; print CSS hides the chrome |

### 3.8 Provenance and evidence UI (PV)

| ID | Requirement |
|---|---|
| PV-1 | Number marks drawn in CSS: ● filled = measured (`ev:"m"`), ◐ half = inferred (`"i"`), ○ ring = assumed (`"a"`). Each has an accessible label |
| PV-2 | Strength icon: three bars (3 = V, 2 = S, 1 = I) plus a text label |
| PV-3 | Any element with `data-prov="<key>"` opens a popover from `data.PROV[key]`: title, mark, "Rests on", "How it is calculated" |
| PV-4 | Any fit percentage opens its per-skill breakdown |
| PV-5 | Popovers stay within the viewport, close on outside click or Esc, and return focus to the trigger |
| PV-6 | Population figures and named-people counts shall carry separate labels wherever both appear |

## 4. Data requirements

### 4.1 Static domain data
Loaded from `meridian-data.json` at build time (bundled). It shall not be retyped. Keys used: `UNITS, EDU_LEVELS, PROF, SOURCES, TIER_W, SKILLS (42), FAMILIES (12), BANDS (25), DEST, ROLE_RULES (19), LEVEL_RULES (4), POP, PROV, SEED (40), CONNECTORS (5), ORG_MAP, EDU_MAP, COURSES, SF_NEW (12), LMS_NEW`.

### 4.2 Seed mapping **[D]**
SEED uses long field names. The loader maps `placeOfBirth→pob`, `dateOfBirth→dob`, `eduLevel/eduMajor→edu`, `jobTitle→title`, `startDate→start`, `validUntil→valid`. Skill labels map to `SKILLS` keys by their `n` label. Unknown labels are kept and flagged "not in taxonomy".

### 4.3 Person entity
As in brief §5 (`Person`, `Skill`, `Cert`, `Perf`). It contains no salary or payroll field.

### 4.4 Persistence (IndexedDB `meridian`, version 1)

| Store | Key | Content |
|---|---|---|
| `people` | `id` | Person |
| `versions` | `id` | Version |
| `meta` | `key` | `seq` (number), `connectors` (id → {connected, lastSaved}), `importHistory` (rows), `currentVersion` (id), `seeded` (bool) |

If IndexedDB is unavailable or fails to open, the app shall use an in-memory store with the same interface and say so in the sidebar (SH-3).

## 5. External interfaces (simulated)

| System | Simulated interface | Payload notes |
|---|---|---|
| SAP SuccessFactors | OData-shaped JSON | 52 records: 40 seeds + 12 `SF_NEW` (§8.7.1) |
| Moodle LMS | REST-shaped JSON (`core_completion`-like) | Learners per seed with LMS skills, gains, pre-2023 completions, blank idnumbers, new hires and 2 orphans (§8.7.2) |
| Regional performance tools | Per-unit JSON (RU-1, RU-2, RU-3, RU-5) | Scales 1–5, 0–100, A–E (dd/mm/yyyy), 1–4; 2025 + some 2022 rows (§8.7.3) |
| Legacy assessment | None | Manual entry only |
| Oracle Payroll | None | Off-limits; never generated or read |

## 6. Non-functional requirements (NF)

| ID | Category | Requirement |
|---|---|---|
| NF-1 | Packaging | One `dist/index.html`, < 1 MB without user images; fonts as base64 woff2 (Inter 400/500/600/700, Source Serif 4 600; latin subset) |
| NF-2 | Offline | Zero network requests at runtime (verified in Playwright by failing any non-`data:`/`blob:` request) |
| NF-3 | Portability | Works from a static host and from `file://` |
| NF-4 | Performance | Interactive in < 2 s from `file://`. Build of ≤ 200 records < 100 ms of engine time (excluding trace pacing) |
| NF-5 | Reliability | No console errors on any route. Store failures degrade to memory with a message |
| NF-6 | Accessibility | WCAG 2.1 AA contrast; visible focus; keyboard access to rows, diagram boxes and drop zones; ARIA tabs, dialog and status; `prefers-reduced-motion` honoured |
| NF-7 | Determinism | Same data + same params + same `today` ⇒ identical engine output. Payload generation uses no randomness |
| NF-8 | Maintainability | Engine in pure TS modules with Vitest coverage of every §9 assertion |
| NF-9 | Visual | Tokens, type and layout exactly per PRD §7 |
| NF-10 | Print | The Board pack prints cleanly on A4 landscape with the chrome hidden |

## 7. Security and privacy (SP)

| ID | Requirement |
|---|---|
| SP-1 | No salary, grade-pay or payroll attributes anywhere (types, stores, UI, CSV) |
| SP-2 | NIK is only ever stored or shown as `nik#xxxxxxxx` (8 hex characters of a deterministic hash of normalised name + DOB) **[D: hash = FNV-1a 32-bit]** |
| SP-3 | KTP images are blurred by default; Show is per-view and is not persisted |
| SP-4 | No data leaves the device; no network APIs used at runtime |
| SP-5 | Connector credentials are never shown or held: "Credentials: held by the integration service" |

## 8. Algorithms (normative)

### 8.1 Instruction parsing
Default parameters: `levels 6, scope all, group family, evidence V, retire 56, high 70, kkni true`. Detection is case-insensitive and works in EN and ID:

| Param | Rule |
|---|---|
| levels | `/(\d)\s*[- ]?\s*(levels?|tingkat|jenjang|layers?)/i`. Accept 4–6; otherwise keep the default and warn "ignored: 4 to 6 levels supported" |
| scope | (only\|hanya\|khusus\|just) … metering, or "metering only" → `F01`; (all\|semua\|seluruh) famil… → `all` |
| group | (by\|per\|group by\|kelompok…) … (region\|regional\|unit\|wilayah) → `unit` |
| evidence | (supported\|didukung) together with (placement\|penempatan\|place) → `S`; (verified\|terverifikasi) → `V` |
| retire | (retire…\|pensiun\|retirement age) … NN, with 50 ≤ NN ≤ 65 |
| high | (high\|tinggi) … NN%, with 50 ≤ NN ≤ 95 |
| kkni | (without\|no\|tanpa) KKNI → false |

Each parsed parameter records its origin snippet. Example prompts: (1) the default English prompt **[D: wording drafted, see §10]**; (2) "Bentuk hierarchy khusus Field Metering, kelompokkan per region, usia pensiun 56, dan high adjacency mulai 75%." → scope F01, group unit, retire 56, high 75; (3) "Use 4 levels instead of 6, group by region, and allow supported evidence for placement decisions." → levels 4, group unit, evidence S.

### 8.2 Evidence
- `tier(skill) = data.SOURCES[skill.src]`.
- **Downgrade:** if `src ∈ {SKTTK certificate, BNSP certificate}` and the person has no certificate of that type with status ≠ expired, then tier = I. Reason: "SKTTK certificate expired 2024-07-31" or "no SKTTK certificate on file".
- **Certificate status:** `expired` if `valid < today`; `expiring` if `valid − today < 90 days`; else `valid`. A missing `valid` counts as valid **[D]**.

### 8.3 Role normalisation
Apply `data.ROLE_RULES` in order, using `new RegExp(pattern, flags)` against the title. The first match gives roleProfile, family, subFamily and band. No match → review queue ("No role-profile rule matches '<title>'"). With scope F01, records whose family ≠ F01 are *out of scope* (excluded, not reviewed).

### 8.4 Levels
1. Apply `data.LEVEL_RULES` in order against the title; the first match gives the level and reason.
2. Otherwise L2, or L1 if service < 3 years. **Tenure never lifts above L2.**
3. Compress per `levels`: 6 = identity; 5 = L5–6 → L5; 4 = L1, L2, L3–4 → L3, L5–6 → L4. Segmentation uses the **uncompressed** level **[D]**.
4. Confidence = *evidenced* if (L ≥ 3 and some skill is Advanced+ at tier ≠ I) or (L ≤ 2 and some skill is at tier V); else *assess*.

### 8.5 Segmentation and matching (role band B0 only)
1. `age ≥ retire − 2` → `retire`.
2. else `level ≥ 3` → `stay`.
3. else match against each destination band b ∈ B2…B6:
   - `credit(s) = held ? min(1, profIdx(held.prof) / profIdx(req.prof)) × TIER_W[tier(held)] : 0`
   - `fit(b) = Σ credit(s)·w(s) / Σ w(s)`, shown as `round(fit × 100)%` with "x of y weighted points" (1 decimal)
   - best fit ≥ `high` → `high`; ≥ 40 → `med`; else `low` (path `choices`)
   - gaps = required skills not held, sorted by weight desc (ties keep `req` order); pathway weeks = Σ `SKILLS[gap].wk`
   - `placeNow(b)` = every `crit` skill held at ≥ required prof with tier V (or V/S when evidence = S)
   - `bridge` = holds `meter_install` at ≥ Working

#### 8.5.4 Path labels (database column)
| Condition | Label |
|---|---|
| retire | Retires on schedule |
| stay | Stays as crew lead |
| high / med | "L<n> Path to <band> <name> · <fit>% fit" |
| low | Needs choices, second offer first |
| person not in the version's `ids` | Not in v<n>: rebuild |
| in review queue | In the review queue |
| out of scope for the version | Outside v<n> scope |
| other family, mapped | "L<n> <role profile>" **[D]** |

### 8.6 Identity resolution and survivorship
- `normName`: strip degrees and titles (S.T., S.E., S.Kom., S.H., A.Md., M.Psi., M.T., M.M., Ir., Dr., Drs., H., Hj.), lowercase, drop punctuation, collapse spaces. `cleanName` (display): strip degrees; title-case if all caps.
- **SF match order:** (1) existing `src.sf`; (2) NIK hash; (3) DOB equal and normName equal (0.99); (4) DOB equal and Jaro-Winkler ≥ 0.95 (auto); (5) DOB equal and 0.80 ≤ JW < 0.95 → *needs decision*; (6) otherwise new. Same normName with a different DOB → new, with the note "Same name as MRD-… but a different date of birth: kept as a separate person." **[D: JW is only computed among DOB-equal candidates]**
- **Moodle:** link by `idnumber` → staged SF record or `src.sf` in the database; else normName + unit; else orphan. A completion counts only if `complete` and dated ≥ 2023-01-01. Mapping uses `data.COURSES`; the source is "LMS course passed (2023+)". Add the skill if missing; upgrade if the existing tier is I; otherwise no change.
- **Ratings:** keep periods ≥ 2023; normalise dd/mm/yyyy; match on normName + DOB; A–E → 5–1; z-score within (unit, year) using population SD. Supporting evidence only (`perf[]`, plus the "Performance rating 2023+" source where applicable **[D: ratings do not add skills]**).
- **Survivorship:** identity and employment ← SF; learning ← Moodle; ratings ← unit tools; KTP and certificates ← manual only.
- **Change detection:** an SF field update is emitted only when the cleaned and mapped value differs from the stored value. Name variants that normalise to the stored name are not updates **[D]**.

### 8.7 Sample payload generation (deterministic)
1. **SF**: one row per seed (index i). `userId = EMP-#####` from a fixed deterministic mapping, with seed #8 (Agus) = `EMP-48213`. Every 4th seed name in UPPERCASE; the next one with a degree suffix cycling ", S.T.", ", A.Md.", ", M.Psi."; Muhammad Rizal → "Muh. Rizal, S.T."; `businessUnit` via inverse `ORG_MAP`; `degree` via inverse `EDU_MAP`; `nik` = demo hash. Plus 12 `SF_NEW` → 52 rows. Some seed rows carry a deliberate unit or field change so that **all 40 seeds produce at least one update** (SF link at minimum) **[D]**.
2. **Moodle**: per brief §8.1, including Agus = `learner_9981` with LMS-ANO-115 *in progress*; Dian Purnamasari handheld gain; Nur Aini K3 gain; pre-2023 K3 for Suparman, Rusdi Hasibuan, Joko Susilo and Taufik Hidayat; selected blank idnumbers; `LMS_NEW` learners; orphans Bagus Prakoso and Linda Kartika.
3. **Unit tools**: RU-1 (1–5), RU-2 (0–100), RU-3 (A–E, dd/mm/yyyy), RU-5 (1–4); period 2025 per person plus some 2022 rows; Agus = `RU2-PRF-0331`.

Exact per-record choices that the brief leaves open (other EMP numbers, which idnumbers are blank, raw scores) are fixed in `payloads.ts` and asserted by the §9 counts.

### 8.8 Single-line diagram geometry
- Population values from `data.POP`: natural 650, placed 3,235, vol 215 + pool 100 = 315 choices, retained 1,800, other 85; destination `pop` from `BANDS`.
- Stroke width ∝ √people, scaled so the 3,235 feeder is the widest (≈ 14 px) and the 85 drop stays ≥ 2 px.
- Named people per load = version segments: B2…B6 by best-fit band for high/med; Choices = low; Retire = retire; Other families' vacancies = 0 named (population only) **[D]**.

## 9. Acceptance tests (must pass)

Engine tests run in Vitest with `today = 2026-10-05` pinned. Smoke tests run in Playwright against `dist/index.html` from both a static server and `file://`.

| ID | Assertion | Layer |
|---|---|---|
| T-01 | Σ exposedFTE = 13,079; F01 = 4,200 | unit |
| T-02 | Agus Setiawan = MRD-000008, RU-2, DOB 1979-03-12 | unit |
| T-03 | Agus level L2, confidence evidenced | unit |
| T-04 | Agus skills 6 = 2 V · 2 S · 2 I | unit |
| T-05 | Agus fits B3 81%, B2 76%, B4 58%; B3 breakdown "12.1 of 15" | unit |
| T-06 | Agus B3 gaps = loss investigation procedure, alert triage (12 wk); B2 gap = AMI comms fault diagnosis (10 wk) | unit |
| T-07 | Agus not placeable in B3: missing tamper detection verified at Advanced | unit |
| T-08 | Default build v1 (40 seeds): 22 Field Metering; 3 retire, 4 stay, 8 high, 3 med, 4 choices | unit |
| T-09 | v1 review queue = 1: Teguh Santoso, "Staf Khusus Direksi" | unit |
| T-10 | Fransiskus Nggadas: SKTTK skill downgraded to I (certificate expired 2024-07-31) | unit |
| T-11 | First pull: 12 new / 40 updated / 1 decision (Muh. Rizal vs MRD-000007, JW ≈ 0.85, same DOB) | unit |
| T-12 | After "Same person": 12 new / 40 updated / 0 pending | unit |
| T-13 | After save, second pull: 0 new / 0 updated / 52 matched | unit |
| T-14 | After import, Agus linked to EMP-48213, learner_9981, RU2-PRF-0331 | unit |
| T-15 | After import + rebuild, new hires appear in AHA path segments | unit + e2e |
| T-16 | Diagram and Board pack show 650, 3,235, 215, 100, 1,800, 85, 4,200 | e2e |
| T-17 | IDs sequential; not reused after delete; Restore restarts at MRD-000001 | unit + e2e |
| T-18 | Parser: the three example prompts yield the parameters in §8.1; "3 levels" warns | unit |
| T-19 | No console errors on any of the 5 routes × 3 view tabs | e2e |
| T-20 | Zero network requests; works from `file://` | e2e |
| T-21 | `dist/index.html` < 1 MB | build |
| T-22 | Downgrade, certificate status boundaries (expired / <90 d / valid) | unit |
| T-23 | Same name + different DOB → new person with the note | unit |
| T-24 | Add manually: validation messages, duplicate warning then keep both, toast text | e2e |

## 10. Derived decisions and open items

| ID | Decision | Status |
|---|---|---|
| D-1 | **As-of date.** The engine takes `today` as a parameter. The app uses the device clock; tests pin 2026-10-05. Risk: ages and certificate status drift over time and may move T-08/T-10 counts in the live app. Once the engine runs, I will check how sensitive the counts are and report | Confirm |
| D-2 | **No `reference/index.html` is present.** §9 numbers are the oracle. Payload details the brief leaves open are chosen to meet them and are documented in CHANGELOG | Confirm |
| D-3 | First load and Restore run a default build so View hierarchy (the default route) is never empty | Proposed |
| D-4 | Default English example prompt drafted as: "Build a capability hierarchy for all job families with 6 levels and a KKNI crosswalk. Group by family. Use verified evidence for placement decisions, retirement age 56, and high adjacency from 70%." | Proposed |
| D-5 | NIK demo hash = FNV-1a 32-bit over `normName|dob`, hex 8 | Proposed |
| D-6 | KTP image optional at save (absence flagged for non-seed records) | Proposed |
| D-7 | Preact as the UI layer (see Architecture ADR-2) | Proposed |

## 11. Traceability (BR → SRS → tests)

| BR | SRS | Tests |
|---|---|---|
| BR-1 | C-1, C-2, NF-1–3 | T-20, T-21 |
| BR-2 | SH-1–7, VH-* | T-19 |
| BR-3 | IM-1–10, §8.6–8.7 | T-11–T-14, T-23 |
| BR-4 | AD-1–10 | T-24 |
| BR-5 | BH-1–6, §8.1–8.5 | T-03–T-10, T-18 |
| BR-6 | VH-3–6 | T-01 |
| BR-7 | VH-7, §8.8 | T-15, T-16 |
| BR-8 | PV-1–6, PR-6 | T-05 |
| BR-9 | SP-1–5 | T-20 |
| BR-10 | VH-9, NF-10 | T-16 |
| BR-11 | PV-6 | T-16 |
| BR-12 | SH-4 | T-17 |
| BR-13 | DB-7 | — |
