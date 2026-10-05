# Architecture: Meridian

| | |
|---|---|
| Document | Architecture · v0.1 draft for review |
| Date | 2026-10-05 |
| Upstream | [SRS](SRS.md) |

---

## 1. Goals that shape the design

1. **One file, zero network.** Everything (code, styles, fonts, data) ships inside `dist/index.html`.
2. **Defensible numbers.** All domain logic is pure, deterministic TypeScript with unit tests. The UI only renders engine output.
3. **Honest provenance as a first-class concern.** Every engine result carries the inputs and the rule that produced it, so the UI can always answer "what does this rest on?".
4. **Quiet UI, one loud moment.** A small token-driven design system, plus one hand-built SVG diagram.

## 2. System context

```
┌───────────────────────────── Browser (single origin / file://) ─────────────────────────────┐
│                                                                                             │
│   ┌──────────── UI (Preact) ────────────┐        ┌──────────── Engine (pure TS) ─────────┐  │
│   │ Shell · Router · Pages · Drawer ·   │ calls  │ parse · evidence · roles · levels ·   │  │
│   │ Popover · Toast · Diagram (SVG)     ├───────►│ fit · build · identity · payloads ·   │  │
│   │                                     │◄───────┤ dates · names · jw · hash            │  │
│   └──────────────┬──────────────────────┘ results└───────────────▲───────────────────────┘  │
│                  │ read/write                                    │ imports                  │
│   ┌──────────────▼──────────────┐                 ┌───────────────┴──────────────┐          │
│   │ Store (IndexedDB | memory)  │                 │ Domain data (bundled JSON)   │          │
│   │ people · versions · meta    │                 │ meridian-data.json           │          │
│   └─────────────────────────────┘                 └──────────────────────────────┘          │
│                                                                                             │
│   Simulated connectors = payloads.ts generating SF / Moodle / unit-tool JSON in memory      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
          No outbound requests. Oracle Payroll: drawn as off-limits, never modelled.
```

## 3. Technology stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 6 + TypeScript (strict)** | Fast; first-class TS; plugin ecosystem |
| Single file | **vite-plugin-singlefile** | Inlines JS and CSS into `index.html` |
| UI | **Preact 10 + hooks** (~4 KB) | Component model for drawer, popover, tabs and forms without a UI kit; JSX keeps the SVG diagram readable |
| State | Small custom store (`createStore` + `useStore` hook, ~60 lines) | Enough for one user and a handful of slices; no dependency |
| Styling | Plain CSS with custom properties (tokens), one file per area, imported in order | Full control over the visual language; no framework look |
| Fonts | `@fontsource/inter` (400/500/600/700), `@fontsource/source-serif-4` (600), latin subset, inlined as base64 woff2 through a small Vite plugin | Meets "no runtime requests" and keeps the size budget (≈170 KB encoded) |
| Persistence | IndexedDB via a ~100-line promise wrapper (no `idb` dependency); memory fallback | Brief requirement; small |
| Unit tests | **Vitest** | Same transform pipeline as Vite |
| E2E / screenshots | **Playwright** (Chromium) | Smoke tests, `file://` test, network-zero assertion, 1440×900 screenshots for design critique |

## 4. Repository layout

```
/
├─ CLAUDE_CODE_PROMPT.md          brief (unchanged)
├─ meridian-data.json             domain data (unchanged, imported by src/data)
├─ docs/                          BRD · PRD · SRS · ARCHITECTURE · PLAN
├─ index.html                     Vite entry
├─ vite.config.ts                 singlefile + font-inline plugin
├─ src/
│  ├─ main.tsx                    boot: open store → seed if needed → mount
│  ├─ data/
│  │  ├─ index.ts                 typed re-export of JSON + lookups (skillByLabel, bandById…)
│  │  └─ seed.ts                  SEED → Person mapping
│  ├─ engine/                     PURE, no DOM, no store
│  │  ├─ types.ts                 Person, Skill, Cert, Perf, Version, Params, TraceStep…
│  │  ├─ dates.ts                 age, service ("14 yrs 7 mo"), cert status, date normalisation
│  │  ├─ names.ts                 normName, cleanName
│  │  ├─ jw.ts                    Jaro-Winkler
│  │  ├─ hash.ts                  FNV-1a → nik#xxxxxxxx
│  │  ├─ evidence.ts              tier, downgrade, tier counts
│  │  ├─ roles.ts                 ROLE_RULES matcher
│  │  ├─ levels.ts                LEVEL_RULES, compression, confidence
│  │  ├─ fit.ts                   fit, breakdown, gaps, weeks, placeNow, bridge
│  │  ├─ parse.ts                 instruction → Params + origins + warnings
│  │  ├─ build.ts                 8-step pipeline → Version (trace + assignments + segments)
│  │  ├─ payloads.ts              deterministic SF / Moodle / unit-tool payloads
│  │  ├─ identity.ts              resolution, survivorship, staged diff (ImportPlan)
│  │  ├─ apply.ts                 apply ImportPlan + decisions → people mutations
│  │  └─ exposure.ts              family exposure, regional timeline, diagram segments
│  ├─ store/
│  │  ├─ db.ts                    IndexedDB wrapper + memory fallback (same interface)
│  │  ├─ repo.ts                  people / versions / meta operations, sequence
│  │  └─ state.ts                 app state slices + actions (seed, save, build, restore)
│  ├─ ui/
│  │  ├─ shell/                   Sidebar, TopBar, Router, StatusLine
│  │  ├─ kit/                     Button, Chip, Mark (●◐○), Strength, Tabs, Field, Table, EvidenceBar
│  │  ├─ overlays/                Drawer, Popover (prov + fit), Toast, Confirm
│  │  ├─ pages/                   Import, Add, Database, Build, View{Exposure, Structure, Board}
│  │  ├─ profile/                 PersonDrawer sections
│  │  └─ diagram/                 SingleLine.tsx (layout.ts pure geometry + render)
│  └─ styles/                     tokens.css · base.css · layout.css · kit.css · pages/*.css · print.css
├─ tests/
│  ├─ engine/*.test.ts            Vitest (SRS §9 T-01 … T-18, T-22, T-23)
│  └─ e2e/*.spec.ts               Playwright (T-15 … T-21, T-24) + screenshots
├─ README.md
└─ CHANGELOG.md
```

## 5. Core data flow

### 5.1 Boot
```
main → db.open() ──fail──► memory store (status = "Memory only")
     → meta.seeded? ──no──► seed 40 (MRD-000001..040), seq=40, build(defaultParams) → v1
     → load people, versions, meta into state → mount <App/> → route
```

### 5.2 Build (rules agent)
```
Build page: text ─parse()─► Params(+origins) ─(user edits)─► build(people, params, data, today)
   build() returns Version {trace[8], A, review, out, dups, seg, ...} synchronously (pure)
   UI reveals trace items 320 ms apart (0 ms under reduced motion), then repo.saveVersion()
```
The pipeline is pure and instant. The pacing is a presentation concern only. This keeps tests fast and honest: the "agent" is visibly a rules engine.

### 5.3 Import
```
connected systems ─payloads(data, connectedSet)─► raw payloads
  ─resolve(raw, people, data, today)─► ImportPlan { newPeople, updates[], decisions[], upToDate[], notImported[], notes, kpis }
  UI preview (nothing written) ─user decisions─► apply(plan, decisions, people, seq) ─► mutations
  repo.commit(mutations, historyRow, connectorTimestamps)   // one IndexedDB transaction
```
`resolve` is pure, so idempotence (T-13) is tested by applying the plan to an in-memory copy and resolving again.

### 5.4 Reading a person
`personView(person, version, data, today)` (pure) gathers everything the drawer needs: tiers with downgrade reasons, cert statuses, level + rule, top-3 fits with breakdowns, gaps, decision rights and lineage. The drawer is a pure renderer of that object. The database table uses the same function, so paths and flags never disagree between screens.

## 6. Key engine contracts

```ts
interface Params { levels: 4|5|6; scope: "all"|"F01"; group: "family"|"unit"; evidence: "V"|"S";
                   retire: number; high: number; kkni: boolean }
interface ParseResult { params: Params; origin: Record<keyof Params, string|null>; warnings: string[] }

interface FitLine { skill: string; need: Prof; held: Prof|null; tier: Tier|null; weight: number; credit: number }
interface Fit { band: string; pct: number; points: number; total: number; lines: FitLine[];
                gaps: string[]; weeks: number; placeNow: boolean; missingCrit: string|null }

interface Assignment { id: string; role: RoleMatch|null; level: number; levelShown: number;
                       levelRule: string; confidence: "evidenced"|"assess";
                       seg?: "retire"|"stay"|"high"|"med"|"low"; fits?: Fit[]; bridge?: boolean }

interface Version { id: string; n: number; prompt: string; params: Params; trace: TraceStep[];
                    A: Record<string, Assignment>; review: ReviewItem[]; out: string[];
                    dups: [string, string][]; seg: Record<string, string[]>; built: string;
                    count: number; ids: string[] }
```

Every derived value carries its **reason** (rule text, source, formula), so provenance needs no second code path.

## 7. UI architecture

- **Router:** `hashchange` → `{page, tab, personId?}`. A deep link such as `#/db/view?p=MRD-000008` opens the drawer.
- **Overlays:** one overlay root. The drawer, popover, toast and confirm dialogs are portals managed by a tiny overlay controller (focus trap, Esc stack, return focus).
- **Provenance:** a single delegated click and keydown listener on `[data-prov]` and `[data-fit]` opens the popover. Popover placement measures the trigger, flips and clamps to the viewport.
- **Single-line diagram:** `diagram/layout.ts` (pure) computes the busbar, feeders, transformer, sub-busbar and load-box geometry from population numbers and named segments. `SingleLine.tsx` renders the SVG. The width is ≥ 1,040 px inside a horizontal scroller. Energise uses CSS `stroke-dashoffset` transitions with staggered delays, triggered once by an IntersectionObserver and skipped under `prefers-reduced-motion`. Load boxes are `<g role="button" tabindex="0">` with aria-labels.
- **Styling:** `tokens.css` defines exactly the brief's palette. Components use tokens only. Print CSS hides the sidebar, top bar and controls for the Board pack.

## 8. Persistence design

- DB `meridian` v1; stores `people`(keyPath `id`), `versions`(keyPath `id`), `meta`(keyPath `key`).
- Sequence: `meta.seq` is incremented inside the same transaction that writes the new person, so IDs are never reused, even after a delete.
- Restore: one transaction clears all three stores, then the app reseeds and runs the default build.
- Fallback: `MemoryDB` implements the same interface; `state.storage = "memory"` drives the sidebar notice.

## 9. Build pipeline

1. `vite build` with `vite-plugin-singlefile` (`assetsInlineLimit: ∞`, CSS code split off).
2. A small custom plugin rewrites `@fontsource` woff2 `url()`s to base64 data URIs (latin subset only).
3. Post-build check script: asserts a single file, no `http(s)://` references in `src=`/`href=`/`url()`, and size < 1 MB (T-21).
4. `type="module"` inline scripts work from `file://` in Chromium, Firefox and Safari, because no module imports remain after inlining.

## 10. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Engine | Vitest | Every numeric acceptance (T-01 … T-14, T-18, T-22, T-23). `today` pinned to 2026-10-05 |
| Store | Vitest + `fake-indexeddb` | Sequence never reused; restore; memory fallback |
| E2E | Playwright | Route sweep with console-error capture; request interception failing any non-`data:` request; `file://` load; import → decide → save → rebuild → diagram contains new hires; Add-manually validation; diagram figures |
| Visual | Playwright screenshots at 1440×900 | Saved to `tests/screenshots/` after each page; critiqued against PRD §7 before moving on |

## 11. Architecture decision records

| ADR | Decision | Alternatives considered | Rationale |
|---|---|---|---|
| ADR-1 | Engine is pure functions taking `(people, params, data, today)` | Classes with internal state | Deterministic, trivially testable, and provenance can be serialised into versions |
| ADR-2 | Preact rather than vanilla TS | Vanilla DOM, Lit, Svelte | Many interactive overlays and forms; Preact gives a component model at ~4 KB with no build exotica. Vanilla would cost more code and more bugs for the same result |
| ADR-3 | Build is synchronous; the trace is paced in the UI | Async step-by-step engine | Honest about being rules, not AI; tests need no timers |
| ADR-4 | Fonts inlined via a custom plugin, latin subset | Full fontsource CSS | Keeps the file < 1 MB |
| ADR-5 | Jaro uses half-transpositions as a real number (t = mismatches / 2) | Integer division | Gives JW("muh rizal","muhammad rizal") ≈ 0.85, as the brief states; integer division gives ≈ 0.86 |
| ADR-6 | Hand-written IndexedDB wrapper | `idb` library | Very small surface; avoids a dependency |
| ADR-7 | Population figures read only from `data.POP` / `BANDS.pop`; named counts read only from the Version | Deriving populations from the sample | Enforces the "two scales" honesty rule structurally |

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Without a reference prototype, payload details may not reproduce 12 / 40 / 1 on the first attempt | Write T-11…T-13 first and tune the deterministic payload tables until they pass; record choices in CHANGELOG |
| Live-date drift changes segment counts (see SRS D-1) | Inject `today`; measure sensitivity; if needed propose pinning the demo as-of date |
| Font inlining pushes the size over budget | Latin subset only; measure in the build check |
| `file://` quirks (IndexedDB in Safari) | Memory fallback with visible notice; Playwright `file://` test in Chromium |
| SVG diagram legibility at smaller widths | Fixed ≥1,040 px canvas inside a horizontal scroller, per the brief |
