# Implementation plan: Meridian

| | |
|---|---|
| Document | Plan · v0.1 for approval |
| Date | 2026-10-05 |
| Status | **Waiting for your go-ahead. No code has been written.** |

---

## 1. The journey, restated

The Director opens on **Exposure**: 12 families, and one carries a third of the exposed work. She opens **Field Metering** (4,200 · 6,000 · 70%, a regional M0–M18 timeline) and presses **Show redeployment paths**. The single-line diagram energises: 650 retire, 3,235 cross the **B1 bridge** into B2–B6 and other families, and 315 go to choices, with named database people on every load. She opens a person to see what each claim rests on, then takes the **Board pack**. Behind that story, the steward's numbered sequence (1 Import → 2 Add → 3 View DB → 4 Build → 5 View) shows how the database and hierarchy were made trustworthy.

## 2. Phases and checkpoints

Each phase ends with green tests and a short report. UI phases also end with 1440×900 screenshots critiqued against PRD §7. **I will pause for your review at the checkpoints marked ⏸.**

| # | Phase | Output | Exit criterion |
|---|---|---|---|
| 0 | **Scaffold** | `git init`, Vite + TS + Preact + singlefile, Vitest, Playwright, tokens.css, font-inline plugin, build-check script | `npm run build` emits one HTML file; empty test suite runs |
| 1 | **Engine core** | `data/`, `dates`, `names`, `jw`, `hash`, `evidence`, `roles`, `levels`, `fit`, `parse`, `build`, `exposure` | T-01 … T-10, T-18, T-22 pass |
| 2 | **Engine import** | `payloads`, `identity`, `apply` | T-11 … T-14, T-23 pass. Sensitivity of counts to `today` measured (D-1) ⏸ |
| 3 | **Store + shell** | IndexedDB / memory, seed, sequence, restore, sidebar, top bar, router, overlays (drawer / popover / toast / confirm), kit components | Store tests pass; shell screenshot critiqued |
| 4 | **Import page** | Connectors, config, pull, check-before-saving tabs, decisions, save, history | Manual run of 12 / 40 / 1 → merge → save → 0 / 0 / 52 in the UI; screenshots ⏸ |
| 5 | **Add manually** | Form, live hints, image compression, validation, duplicate check, toast | T-24 passes; screenshots |
| 6 | **View database + profile drawer** | Table, filters, flags, CSV, full drawer with fit popovers and lineage | Agus profile matches T-03 … T-07 visually; screenshots ⏸ |
| 7 | **Build hierarchy** | Instruction, examples, parameters with origins, paced trace, versions | Three example prompts behave per §8.1; screenshots |
| 8 | **View hierarchy** | Version selector + stale banner; Exposure + Field Metering + timeline; **AHA diagram**; Structure; Board pack + print CSS | T-15, T-16 pass; diagram critiqued separately and carefully ⏸ |
| 9 | **Hardening** | Accessibility pass (keyboard, ARIA, contrast), reduced motion, responsive breakpoints, route sweep for console errors, network-zero and `file://` tests | T-17 … T-21 pass |
| 10 | **Ship** | `dist/index.html`, README (what, run, deploy, limitations), CHANGELOG (deviations + reasons) | All §9 tests green; final screenshots ⏸ |

## 3. Tests from brief §11 (mapped to SRS §9)

T-01 exposed 13,079 / 4,200 · T-02…T-07 Agus (ID, L2 evidenced, 2/2/2 tiers, 81/76/58, gaps and weeks, not placeable in B3) · T-08 v1 22 / 3 / 4 / 8 / 3 / 4 · T-09 Teguh Santoso in review · T-10 Fransiskus downgrade · T-11…T-13 import 12 / 40 / 1 → 0 pending → 0 / 0 / 52 · T-14 Agus linked IDs · T-15 new hires in AHA after rebuild · T-16 population figures · T-17 IDs never reused, Restore restarts · T-19 no console errors · T-20 offline + `file://` · T-21 < 1 MB.

## 4. Decisions I need from you

1. **Node.js is not installed** on this machine (`node`/`npm` not found). The build needs Node 20+ LTS. Options:
   - (a) I install it with `winget install OpenJS.NodeJS.LTS` (needs your OK; it may show a UAC prompt), or
   - (b) you install it from nodejs.org and tell me when it's done.
2. **Package downloads.** Phase 0 runs `npm install` (Vite, TS, Preact, vite-plugin-singlefile, @fontsource fonts, Vitest, fake-indexeddb, Playwright). It also runs `npx playwright install chromium`, a ~150 MB browser download from Playwright's CDN. OK to proceed?
3. **No `reference/index.html` is present.** I will treat the §11 numbers as the oracle and choose the unspecified payload details to meet them, documenting each choice in CHANGELOG. If you have the reference file, please drop it in `reference/` before Phase 2.
4. **As-of date (SRS D-1).** The app uses the device clock and tests pin 2026-10-05. If the counts turn out to be date-sensitive, would you rather pin a fixed demo as-of date in the app as well? I'll report the sensitivity at the Phase 2 checkpoint either way.
5. **Proposed defaults** (I'll proceed with these unless you object): Preact rather than vanilla TS; a default build v1 created on first load and on Restore; the drafted English example prompt (SRS D-4); KTP optional at save; `git init` in this folder with commits per phase.

## 5. Not doing (per brief §12)

Real APIs or OAuth, servers, LLM calls, payroll data, login, editing records (except adding a KTP image), person-level data for the other 46,000, real photos or KTPs.
