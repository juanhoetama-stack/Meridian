# Business Requirements Document: Project Meridian

| | |
|---|---|
| Document | BRD · v0.1 draft for review |
| Date | 2026-10-05 |
| Engagement | Rakamin (workforce-architecture consultancy) pitching to a masked Indonesian state-owned energy enterprise ("the Client") |
| Deliverable | Meridian, the Workforce Redeployment Cockpit: a self-contained, browser-only case-study prototype |
| Companion documents | [PRD](PRD.md) · [SRS](SRS.md) · [Architecture](ARCHITECTURE.md) · [Plan](PLAN.md) |
| Source of truth | `CLAUDE_CODE_PROMPT.md` (brief) and `meridian-data.json` (all numbers, rules and records) |

---

## 1. Executive summary

The Client is about to automate most of the work done by one job family. Smart meters, IoT and AI-assisted operations are already being procured. *Field Metering & Manual Ops* has about 6,000 people, and about 70% of their work (**4,200 roles' worth**) goes away within 18 months. The Client cannot lay anyone off, cannot replace its HR systems and cannot see payroll. The union already believes consultants are "mapping who gets cut".

Project Meridian proposes moving from **position-based** to **capability-based** workforce management. A person becomes *grade + domain + skill portfolio*. Grade and pay are protected, the SK title stays as a label, and work is assigned by verified skills. The prototype must show, in use, that the 4,200 figure breaks down into named, evidenced redeployment paths, and that no one is forced out.

The business need for this deliverable is to **win the engagement**. That means giving the Director of Human Capital a tool she can believe and defend in front of the Board, the Ministry and the union.

## 2. Business context

| Fact | Value | Source key |
|---|---|---|
| Total workforce | ~52,000 | `POP.total` |
| Organisation | 6 regional units (RU-1 to RU-6) + head office (HO) | `UNITS` |
| Job titles in use | 1,800+ | brief |
| Culture | 60-year seniority culture; promotion means "menunggu kursi kosong" (waiting for a seat to open) | brief |
| Exposed work, all 12 families | 13,079 FTE | `FAMILIES`, `POP.exposed` |
| Field Metering headcount / automatable share | 6,000 / 70% (High certainty: technology procured) | `FAMILIES[F01]` |
| Displaced work in Field Metering | 4,200 roles' worth | `POP.displaced` |

## 3. Problem statement

The Director of Human Capital has one frightening number (4,200 displaced roles) and no defensible way to answer the obvious follow-up questions:

1. **Who exactly is affected, and what can each person really do?** Records are spread across SAP SuccessFactors, Moodle, a legacy assessment system with no API, and six unevenly tooled regional performance systems. Names, unit codes, date formats and rating scales are inconsistent.
2. **Where can they go?** Titles describe seats, not capabilities. No shared capability hierarchy exists to match people to emerging roles.
3. **How sure are we?** Any claim she makes to the Board or the union needs visible evidence. That means separating what is measured, what is inferred and what is assumed.

## 4. Business objectives and success measures

| ID | Objective | Measure of success (for the pitch) |
|---|---|---|
| BO-1 | Make the displacement problem **visibly solvable** | In a live demo, the 4,200 dissolves into retirement (650), redeployment through the B1 bridge into five bands plus other families (3,235), and choices (315), with named people on each path |
| BO-2 | Earn **trust** from a sceptical audience | Every level, score and recommendation reaches its evidence in ≤ 2 clicks. Measured, inferred and assumed values are visually distinct everywhere |
| BO-3 | Show a credible route to **one trustworthy workforce database** without migrating SAP or Oracle | Import from simulated APIs reconciles to one record per person (12 new, 40 enriched, 1 decision left to a human) and is idempotent on a second pull |
| BO-4 | Respect **governance**: no payroll, no PHK, privacy by default | No salary fields anywhere; NIK only as a demo hash; KTP images blurred by default; payroll connector visibly off-limits; "Payroll not accessed" shown on every profile |
| BO-5 | Hand the Director a **Board-ready decision** | A printable Board pack with headline, KPIs (Rp 206B investment vs Rp 1.04T do-nothing, 4.0x, break-even month 13), guarantees and the assumptions that matter most |
| BO-6 | Demonstrate **design taste** that sets Rakamin apart | Passes an internal critique against the visual standard (PRD §7): no generic AI look, one visual language, one deliberate bold moment |

## 5. Stakeholders

| Stakeholder | Interest | What they need from Meridian |
|---|---|---|
| **Director of Human Capital** (primary user) | Must defend every number; cannot lay off; cannot see payroll | One journey from problem to decision; provenance on every figure; a Board pack |
| HR data steward (secondary user) | Builds and maintains the workforce database | Fast, uniform import; clear decisions on ambiguous matches; manual entry for what no API gives |
| Board of Commissioners / Directors | Cost, risk, timing | Headline, investment case and Day-90 decisions |
| Ministry (data-governance owner) | Payroll and personal data stay protected | Evidence that payroll is never touched and data never leaves the device |
| Union (SP) | Fear of covert cut-lists | "Choices, never forced"; guarantees; union observer and appeal; grade and pay protected |
| Rakamin engagement team | Win the engagement | A one-click demo that runs anywhere, has no setup and holds up to hostile questions |

## 6. Scope

### 6.1 In scope
- A single self-contained HTML file hosted on Netlify Drop or GitHub Pages. It runs offline and also from `file://`.
- The end-to-end journey: build the database (import + manual entry), build the capability hierarchy (rules agent), view exposure → Field Metering → redeployment paths → person evidence → Board pack.
- Realistic sample content: 40 seed records, 12 new SAP SF hires, Moodle learners and four regional rating feeds.
- Browser-local persistence, with an in-memory fallback.

### 6.2 Out of scope
- Real API calls, OAuth, servers and LLM calls.
- Salary, grade-pay or payroll data of any kind.
- Accounts, roles and login.
- Editing existing records (except adding a KTP image).
- Person-level data for the other ~46,000 employees.
- Real photos or real KTP images.

## 7. Business requirements

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| BR-1 | The prototype opens in one click with no login, build step or setup, and makes no network requests at runtime | Must | BO-6, brief §2.1 |
| BR-2 | It supports one complete journey for the Director, from the problem she arrives with to the decision she leaves with | Must | BO-1, BO-5 |
| BR-3 | It consolidates records from multiple simulated systems into one record per person, with explicit survivorship rules and human decisions on ambiguous matches | Must | BO-3 |
| BR-4 | It captures by hand what no system provides: KTP image, certificates, legacy assessments, RU-4 and RU-6 appraisals | Must | BO-3 |
| BR-5 | It builds a capability hierarchy from a natural-language instruction using a **deterministic, inspectable rules engine**, labelled honestly as such (never presented as AI) | Must | BO-2 |
| BR-6 | It shows AI exposure across all 12 families and drills into Field Metering with a regional timeline | Must | BO-1 |
| BR-7 | It shows *Where do the 4,200 go?* as an electrical single-line diagram (the AHA moment), with named people on each path | Must | BO-1 |
| BR-8 | Every asserted level, score, fit or population figure exposes what it rests on, how it was calculated and its evidence tier | Must | BO-2 |
| BR-9 | It never stores or displays payroll data. Identity numbers are hashed, and identity images are blurred by default | Must | BO-4 |
| BR-10 | It produces a printable Board pack with the investment case, guarantees and key assumptions | Must | BO-5 |
| BR-11 | Population-model figures (deck model) are kept visibly separate from named-people counts (from the user's data) | Must | BO-2 |
| BR-12 | Sample data can be restored to a known state for repeatable demos | Should | BO-6 |
| BR-13 | Data can be exported as CSV, without images | Should | BO-3 |

## 8. Business rules (policy-level)

1. **No PHK.** No path ends in termination. The lowest-fit group is routed to "choices, never forced": voluntary options and a development pool, with guardrails.
2. **Grade and pay protected.** Redeployment never changes grade or pay. The SK title is kept as a label.
3. **Tenure never lifts anyone above L2.** Seniority alone is not capability evidence.
4. **Never merge identities automatically below the confidence threshold.** A human decides.
5. **Same name with a different date of birth means a different person.**
6. **In-region first:** a placement target of 85% or more within the person's own regional unit.
7. **Payroll is off-limits.** Cost figures use a declared planning assumption (Rp 180M per FTE per year), which Finance grade-band aggregates replace at Day 45.

## 9. Constraints

- No SAP or Oracle migration; Meridian sits alongside the systems of record.
- Ministry data-governance policy: no payroll access. Personal data stays inside the Client's network (in the prototype: inside the browser).
- Pitch-grade deliverable: a single file under ~1 MB, desktop-first, English UI with Indonesian terms kept as-is.

## 10. Assumptions

| ID | Assumption | Mark |
|---|---|---|
| A1 | Rp 180M per FTE per year is a round planning assumption, not Client data | ○ Assumed |
| A2 | Population split (650 / 3,235 / 215 / 100) comes from the Day-30 workforce model | ◐ Inferred |
| A3 | B1 bridge capacity is up to 1,200 people at a time | ◐ Inferred |
| A4 | Sample payloads reproduce the shape and the mess of the real APIs closely enough to be convincing | ○ Assumed |

## 11. Business risks

| Risk | Impact | Mitigation in the deliverable |
|---|---|---|
| Audience reads the tool as a "cut list" | Union opposition; pitch lost | Language of choices; guarantees panel; no termination path; "Payroll not accessed" |
| A number cannot be defended under questioning | Credibility lost | Provenance popover on every figure; reconciliation tests (SRS §9) |
| The rules agent is mistaken for an opaque AI | Distrust; governance objection | Explicit label "Rules agent · runs in this browser · no data leaves the device"; visible rule per step |
| Demo fails on the venue machine | Embarrassment | Single file, no network, `file://` support, memory fallback |
| The output looks generic | Fails the design-taste criterion | Strict token system; boldness spent only on the single-line diagram; screenshot critique loop |

## 12. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Engagement lead (Rakamin) | | ☐ Approve ☐ Revise | |
