# Product Requirements Document: Meridian, the Workforce Redeployment Cockpit

| | |
|---|---|
| Document | PRD · v0.1 draft for review |
| Date | 2026-10-05 |
| Upstream | [BRD](BRD.md) |
| Downstream | [SRS](SRS.md) · [Architecture](ARCHITECTURE.md) |

---

## 1. Product vision

> One frightening number, **4,200 displaced**, dissolves into named, evidenced paths that the Director of Human Capital can defend to anyone.

Meridian is a single-file, browser-only cockpit that does three things. It assembles a trustworthy workforce database. It builds a capability hierarchy with an inspectable rules agent. And it shows, person by person and with evidence, where the displaced work's people go. No one is pushed out.

## 2. Personas

### 2.1 Director of Human Capital (primary)
- **Situation:** owns the people consequences of a procurement decision she did not make. She reports to the Board, answers to the Ministry and negotiates with the union.
- **Goals:** understand the scale and timing of displacement; show a credible, humane path for everyone; take a decision pack to the Board.
- **Fears:** a number she cannot explain; anything that looks like a cut list; anything that touches payroll.
- **Success:** she walks out with a Board pack and can answer "how do you know?" for every number on it.

### 2.2 HR data steward (secondary)
- **Situation:** has to merge four imperfect systems and several spreadsheets into one record per person.
- **Goals:** pull everything the APIs can give, see exactly what will change before saving, decide ambiguous matches, and enter the rest by hand.
- **Success:** a clean database where every value is traceable to its source.

### 2.3 Indirect audiences (they see the screens, not the controls)
The Board, Ministry observers and union representatives. Their needs shape the copy, the guarantees and the provenance UI.

## 3. The journey (the product's spine)

| Step | Page / route | The Director's question | What Meridian shows |
|---|---|---|---|
| 0 | View hierarchy · Exposure (`#/h/view`, default) | "How big is this?" | 12 families by exposed FTE; one family carries a third and is the only one already funded |
| 1 | Import from systems (`#/db/import`) | "Can I trust the underlying data?" | Connectors, a preview of every change, one human decision, idempotent save |
| 2 | Add manually (`#/db/add`) | "What about what no system has?" | KTP, certificates, legacy assessments, RU-4 and RU-6 appraisals |
| 3 | View database (`#/db/view`) | "Who is in here and what is flagged?" | Searchable table with evidence mix, level, path and flags |
| 4 | Build hierarchy (`#/h/build`) | "How was the structure made?" | Instruction → parameters → 8 traced steps, each with the rule used |
| 5 | View hierarchy (`#/h/view`) | "Where do the 4,200 go?" | Field Metering deep-dive → **single-line diagram** → named people → person evidence |
| 6 | Board pack tab | "What do I take upstairs?" | Headline, KPIs, decisions, guarantees, assumptions; printable |

The default route opens on Exposure because that is where the Director's story starts. The numbered sidebar (1 to 5) is the steward's build sequence. Both readings stay available.

## 4. The AHA moment (designed deliberately)

**Metaphor:** an electrical single-line diagram. It suits an energy company's audience, and it turns a loss into a distribution.

| Element | Content |
|---|---|
| Busbar (thick navy) | "Field Metering · 4,200 roles' worth of displaced work". Subline: 6,000 today; 1,800 stay to run exception-based work (n in your database); feeder width ∝ people |
| Left feeder | Retire on schedule · **650** |
| Right feeder (rust) | Choices · **315** (voluntary 215 + development pool 100) |
| Central feeder + transformer | "B1 bridge: installing the smart meters while training · Up to 1,200 at a time" → **3,235 redeployed ◐** |
| Sub-busbar loads | B2 900 · B3 700 · B4 800 · B5 500 · B6 250 · Other families' vacancies 85 |
| Load boxes | Band name, serif population, sublabel, up to 3 initials of named database people, "+n" |
| Interaction | Click or Enter on a box → detail panel with band requirements, placement gate and a named-people table (fit popover, unit, "Can be placed now?") |
| Motion | One orchestrated "energise" sequence (stroke-dashoffset) on first view; none under reduced motion |
| Honesty | Footnote separates the population scale (Day-30 model ◐○) from named people (hierarchy vN from your database) |

**Design intent:** this is the only place the design is loud. Everything leading up to it stays quiet, so the diagram lands.

## 5. Features and priorities

P0 = required for the pitch (brief §2). P1 = strongly expected by the brief. P2 = polish if time allows.

### 5.1 Shell
| Feature | Pri |
|---|---|
| 252 px sidebar: Database (1 Import, 2 Add, 3 View + count badge), Hierarchy (4 Build, 5 View + version badge) | P0 |
| Sidebar footer: evidence legend, storage status (IndexedDB or "memory only"), Restore sample data with confirmation | P0 |
| Top bar: serif title, one-line purpose, "N people in the database · Hierarchy vN · built <date>" | P0 |
| Hash routing; responsive stacking at ≤1100 px; sidebar on top at ≤820 px | P0 |

### 5.2 Import from systems
| Feature | Pri |
|---|---|
| Honest prototype note | P0 |
| Five connector rows with status, known issue, expandable field mapping and action (Connect / Enter manually / per-unit chips / Off-limits) | P0 |
| Inline read-only connection config → "Test and connect" (~700 ms simulated); state persists | P0 |
| "Pull all connected" → deterministic sample payloads | P0 |
| Identity resolution (name normalisation, NIK hash, Jaro-Winkler, decision band 0.80–0.95) and survivorship | P0 |
| "Check before saving": KPIs, normalisation notes, five tabs, side-by-side decision view | P0 |
| Save / Discard; import history; connector "last saved" | P0 |

### 5.3 Add manually
| Feature | Pri |
|---|---|
| ID preview (next MRD ID, never reused) | P0 |
| Identity, employment, skills and certifications sections with live hints (role-profile match, length of service, strength badge, "Not in taxonomy") | P0 |
| Photo and KTP drag-drop with canvas compression | P0 |
| Inline, specific validation; duplicate warning (save again to keep both) | P0 |
| Toast with "View record" link | P0 |

### 5.4 View database
| Feature | Pri |
|---|---|
| Search; unit, family (+ Needs review) and status filters; count | P0 |
| Columns: person + source tags; title + role profile; unit; service; evidence bar; level and path; flags | P0 |
| Export CSV (no images) | P1 |
| Empty-state with "Clear filters" | P0 |

### 5.5 Person profile drawer
| Feature | Pri |
|---|---|
| Header with SK title "(unchanged)", linked-record chips, "Payroll not accessed", blurred KTP toggle | P0 |
| Grade / Domain / Skill portfolio trio, with level rule caption and "pay unchanged" | P0 |
| Skills table with strength icon, source and downgrade reason; certifications with status | P0 |
| Where this person can go: top 3 fits with breakdown popover, gaps + weeks, decision rights | P0 |
| Data lineage section; Add KTP image; delete with confirmation | P0 |
| Esc closes; focus trapped and restored | P0 |

### 5.6 Build hierarchy
| Feature | Pri |
|---|---|
| Instruction textarea + 3 example prompts (EN, ID, EN-variant) | P0 |
| Parsed, editable parameters, each with its origin ("From your text: …" / "Default") | P0 |
| Sequential trace of 8 steps (~320 ms apart) with result, rule used and amber warnings | P0 |
| Versions table: every build kept; "Shown" chip / "Show" button | P0 |
| Success box with link to View hierarchy | P0 |

### 5.7 View hierarchy
| Feature | Pri |
|---|---|
| Version selector + stale banner with Rebuild | P0 |
| Exposure tab: family list by exposed FTE with certainty colours and legend; Field Metering deep-dive; regional M0–M18 timeline; other-family view | P0 |
| AHA single-line diagram (§4) | P0 |
| Structure tab: family → sub-family → band → people tree (or unit → family → people); evidence-mix bars; review queue | P0 |
| Board pack tab: headline, KPI rows with marks and provenance, four panels, A1 note, print CSS | P0 |

### 5.8 Cross-cutting provenance
| Feature | Pri |
|---|---|
| CSS-built number marks: ● Measured, ◐ Inferred, ○ Assumed | P0 |
| Three-bar strength icon + text label (never colour alone) | P0 |
| `data-prov` popovers from `PROV`; fit-breakdown popovers; viewport-clamped; close on Esc or outside click | P0 |

## 6. UX principles

1. **Show what you assert.** Every number either is measured or says how it was derived and how sure we are.
2. **Two scales, never mixed.** The population model (deck) vs named people (your data). Each is labelled every time it appears.
3. **Nothing is written before Save.** Imports preview every change.
4. **Machines propose, people decide.** No automatic merges below threshold; low fit means choices, not exits.
5. **Plain verbs, stable names.** "Save employee" → "Employee MRD-000041 saved". Errors say what is wrong and how to fix it. Empty states invite the next action.
6. **Quiet everywhere except one place.**

## 7. Visual standard (acceptance for "design taste")

- Tokens exactly as in brief §10 (paper `#F5F6F4`, ink `#13202E`, navy `#12305A`, teal `#0F766E`, rust `#B4441B`, amber `#B7791F`, plus tints and lines).
- Source Serif 4 600 for titles, big numbers and the AHA heading. Inter for UI with tabular numbers. 14 px body. Sentence case. No all-caps eyebrows.
- Hairline borders, 6 px radius, content max ~1320 px. Hierarchy varies; no identical card grids.
- No gradients, no shadow kit, no emoji, no "→" on buttons.
- Accessibility: visible focus, full keyboard access (rows, diagram boxes, drop zones), ARIA for tabs, drawer and toasts, WCAG AA contrast, reduced motion respected.

## 8. Success metrics (for the prototype)

| Metric | Target |
|---|---|
| Reconciliation tests (SRS §9) | 100% pass |
| Clicks from any number to its provenance | ≤ 2 |
| Console errors on any route | 0 |
| `dist/index.html` size (no user images) | < 1 MB |
| Time to interactive from `file://` on a mid-range laptop | < 2 s |
| Screenshot critique at 1440×900 against §7 | No open issues per page |

## 9. Non-goals

The same as BRD §6.2. In addition: no attempt to model the full 64-band taxonomy beyond the bands in the data file, and no real AI or LLM behaviour.

## 10. Release criteria

1. Every P0 feature is implemented and every SRS acceptance test passes.
2. `npm run build` produces one `dist/index.html` that works from a static host and from `file://`.
3. README (what, run, deploy, honest limitations) and CHANGELOG (deviations from the brief or reference, with reasons) are present.

## 11. Open product questions

See [PLAN.md §4](PLAN.md#4-decisions-i-need-from-you). These are resolved there or flagged for confirmation.
