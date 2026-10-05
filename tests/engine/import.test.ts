// SRS §9: T-11 … T-15, T-17 (engine part), T-23.
import { describe, expect, it } from "vitest";
import { data } from "../../src/data";
import { seedPeople } from "../../src/data/seed";
import { generatePayloads, lmsPayload, sfPayload, AGUS_EMP, AGUS_LEARNER, AGUS_RATING } from "../../src/engine/payloads";
import { resolveImport } from "../../src/engine/identity";
import { applyImport, mergeInto } from "../../src/engine/apply";
import { build } from "../../src/engine/build";
import { DEFAULT_PARAMS, DEFAULT_PROMPT } from "../../src/engine/parse";
import { gradeAll } from "../../src/engine/evidence";

const TODAY = "2026-10-05";
const NOW = "2026-10-05T09:00:00.000Z";
const all = { sf: true, lms: true, perf: true };
const seed = seedPeople(data, NOW);
const payloads = generatePayloads(data, all);

describe("sample payloads", () => {
  it("SF has 52 records with unique ids; Agus is EMP-48213; Rizal appears as Muh. Rizal, S.T.", () => {
    const sf = sfPayload(data);
    expect(sf).toHaveLength(52);
    expect(new Set(sf.map((r) => r.userId)).size).toBe(52);
    expect(sf[7].userId).toBe(AGUS_EMP);
    expect(`${sf[7].firstName} ${sf[7].lastName}`).toBe("AGUS SETIAWAN");
    expect(`${sf[6].firstName} ${sf[6].lastName}`).toBe("Muh. Rizal, S.T.");
  });
  it("Moodle learner ids are unique and include the two orphans", () => {
    const lms = lmsPayload(data);
    expect(new Set(lms.map((u) => u.id)).size).toBe(lms.length);
    expect(lms.find((u) => u.fullname === "Agus Setiawan")!.id).toBe(AGUS_LEARNER);
    expect(lms.filter((u) => ["Bagus Prakoso", "Linda Kartika"].includes(u.fullname))).toHaveLength(2);
  });
});

describe("first pull (T-11, T-12)", () => {
  const plan = resolveImport(payloads, seed, data, TODAY);

  it("T-11 12 new / 40 updated / 1 decision: Muh. Rizal vs MRD-000007, ≈0.85, same DOB", () => {
    expect(plan.kpis.newPeople).toBe(12);
    expect(plan.kpis.enriched).toBe(40);
    expect(plan.decisions).toHaveLength(1);
    const dec = plan.decisions[0];
    expect(dec.candidateId).toBe("MRD-000007");
    expect(dec.score.toFixed(2)).toBe("0.85");
    expect(dec.diffs.find((x) => x.field === "Date of birth")!.differs).toBe(false);
    expect(dec.diffs.find((x) => x.field === "Full name")!.differs).toBe(true);
  });

  it("T-12 after 'Same person': still 12 new / 40 updated, 0 pending", () => {
    const merged = resolveImport(payloads, seed, data, TODAY, { [plan.decisions[0].key]: "merge" });
    expect([merged.kpis.newPeople, merged.kpis.enriched, merged.decisions.length]).toEqual([12, 40, 0]);
    const rizal = merged.updates.find((u) => u.id === "MRD-000007")!;
    expect(rizal.changes.some((c) => c.startsWith("Link SAP SF EMP-"))).toBe(true);
    expect(rizal.next.name).toBe("Muhammad Rizal");
  });

  it("'Different people' adds Rizal's SF record as a 13th new person", () => {
    const sep = resolveImport(payloads, seed, data, TODAY, { [plan.decisions[0].key]: "new" });
    expect([sep.kpis.newPeople, sep.decisions.length]).toEqual([13, 0]);
  });

  it("T-23 same name, different DOB is a different person (Sri Wahyuni)", () => {
    const sri = plan.newPeople.find((x) => x.name === "Sri Wahyuni")!;
    expect(sri.notes[0]).toBe("Same name as MRD-000035 but a different date of birth: kept as a separate person.");
  });

  it("reports orphans, exclusions and the evidence gains", () => {
    expect(plan.notImported.filter((x) => x.system === "Moodle LMS").map((x) => x.name).sort()).toEqual(["Bagus Prakoso", "Linda Kartika"]);
    const dian = plan.updates.find((u) => u.name === "Dian Purnamasari")!;
    expect(dian.changes.some((c) => c.startsWith("Strengthen evidence: Handheld field apps"))).toBe(true);
    const nur = plan.updates.find((u) => u.name === "Nur Aini")!;
    expect(nur.changes.some((c) => c.startsWith("Strengthen evidence: LV electrical safety (K3)"))).toBe(true);
    const suparman = plan.updates.find((u) => u.name === "Suparman")!;
    expect(suparman.changes.some((c) => c.includes("K3"))).toBe(false);
    expect(plan.notes.some((n) => n.startsWith("Excluded completions: 6 dated before 2023 and 1 still in progress"))).toBe(true);
    expect(plan.updates.find((u) => u.name === "Agung Wibowo")!.changes).toContain("Unit: RU-1 → RU-2");
  });
});

describe("save and second pull (T-13, T-14, T-15, T-17)", () => {
  const plan = resolveImport(payloads, seed, data, TODAY);
  const merged = resolveImport(payloads, seed, data, TODAY, { [plan.decisions[0].key]: "merge" });
  const res = applyImport(merged, 40, NOW);
  const after = mergeInto(seed, res);

  it("new people take MRD-000041 … MRD-000052", () => {
    expect(res.added.map((p) => p.id)).toEqual(Array.from({ length: 12 }, (_, i) => `MRD-0000${41 + i}`));
    expect(res.seq).toBe(52);
    expect(res.history).toMatchObject({ added: 12, updated: 40, review: 0 });
  });

  it("T-13 second pull is idempotent: 0 new, 0 updated, 52 matched", () => {
    const again = resolveImport(payloads, after, data, TODAY);
    expect([again.kpis.newPeople, again.kpis.enriched, again.matched, again.decisions.length]).toEqual([0, 0, 52, 0]);
    expect(again.upToDate).toHaveLength(52);
  });

  it("T-14 Agus is linked to EMP-48213, learner_9981, RU2-PRF-0331", () => {
    const agus = after.find((p) => p.id === "MRD-000008")!;
    expect(agus.src).toEqual({ sf: AGUS_EMP, lms: AGUS_LEARNER, perf: AGUS_RATING });
    expect(agus.perf![0]).toMatchObject({ year: 2025, scale: "0–100", unit: "RU-2" });
    expect(gradeAll(agus, data, TODAY)).toHaveLength(6); // in-progress course adds nothing
  });

  it("T-15 after import + rebuild, new hires appear in the redeployment segments", () => {
    const v2 = build({ people: after, params: DEFAULT_PARAMS, prompt: DEFAULT_PROMPT, n: 2, built: NOW, today: TODAY }, data);
    const newIds = new Set(res.added.map((p) => p.id));
    const segIds = ["retire", "high", "med", "low"].flatMap((k) => v2.seg[k]);
    expect(segIds.filter((id) => newIds.has(id)).length).toBeGreaterThanOrEqual(6);
    expect(v2.ids).toHaveLength(52);
  });

  it("T-17 IDs are never reused: after deleting MRD-000052 the next new person is MRD-000053", () => {
    const fewer = after.filter((p) => p.id !== "MRD-000052");
    const sep = resolveImport(payloads, fewer, data, TODAY);
    const r = applyImport(sep, res.seq, NOW);
    expect(r.added.map((p) => p.id)).toEqual(["MRD-000053"]);
  });
});
