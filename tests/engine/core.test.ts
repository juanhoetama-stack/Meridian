// SRS §9: T-01 … T-10, T-18, T-22. As-of date pinned (SRS D-1).
import { describe, expect, it } from "vitest";
import { data, exposedFTE, skillName } from "../../src/data";
import { seedPeople } from "../../src/data/seed";
import { gradeAll, tierCounts } from "../../src/engine/evidence";
import { confidence, levelFor, compressLevel } from "../../src/engine/levels";
import { fitAll, fitFormula, holdings } from "../../src/engine/fit";
import { build } from "../../src/engine/build";
import { DEFAULT_PARAMS, DEFAULT_PROMPT, EXAMPLE_PROMPTS, parseInstruction } from "../../src/engine/parse";
import { certStatus, fmtService } from "../../src/engine/dates";
import { jaroWinkler } from "../../src/engine/jw";
import { normName, cleanName } from "../../src/engine/names";
import { familyExposure, shareBy, totalExposed } from "../../src/engine/exposure";

const TODAY = "2026-10-05";
const people = seedPeople(data, "2026-10-05T00:00:00.000Z");
const byName = (n: string) => people.find((p) => p.name === n)!;
const v1 = build({ people, params: DEFAULT_PARAMS, prompt: DEFAULT_PROMPT, n: 1, built: "2026-10-05T00:00:00.000Z", today: TODAY }, data);

describe("T-01 exposure", () => {
  it("totals 13,079 and Field Metering 4,200", () => {
    expect(data.FAMILIES.reduce((s, f) => s + exposedFTE(f), 0)).toBe(13079);
    expect(exposedFTE(data.FAMILIES.find((f) => f.id === "F01")!)).toBe(4200);
  });
});

describe("Agus Setiawan (T-02 … T-07)", () => {
  const agus = byName("Agus Setiawan");
  const graded = gradeAll(agus, data, TODAY);
  const fits = fitAll(holdings(graded, data), data, "V");
  const f = (b: string) => fits.find((x) => x.band === b)!;

  it("T-02 is MRD-000008, RU-2, born 1979-03-12", () => {
    expect(agus.id).toBe("MRD-000008");
    expect(agus.unit).toBe("RU-2");
    expect(agus.dob).toBe("1979-03-12");
  });
  it("T-03 level L2, evidenced", () => {
    const lv = levelFor(agus, data, TODAY);
    expect(lv.level).toBe(2);
    expect(confidence(lv.level, graded)).toBe("evidenced");
    expect(v1.A[agus.id].levelShown).toBe(2);
  });
  it("T-04 six skills: 2 verified, 2 supported, 2 inferred", () => {
    expect(graded).toHaveLength(6);
    expect(tierCounts(graded)).toEqual({ V: 2, S: 2, I: 2 });
  });
  it("T-05 fits B3 81%, B2 76%, B4 58%", () => {
    expect(fits.slice(0, 3).map((x) => [x.band, x.pct])).toEqual([["B3", 81], ["B2", 76], ["B4", 58]]);
    expect(fitFormula(f("B3"))).toBe("12.1 of 15 weighted points = 81%");
  });
  it("T-06 gaps and pathway weeks", () => {
    expect(f("B3").gaps.map(skillName)).toEqual(["Loss investigation procedure (P2TL)", "Alert triage"]);
    expect(f("B3").weeks).toBe(12);
    expect(f("B2").gaps.map(skillName)).toEqual(["AMI comms fault diagnosis"]);
    expect(f("B2").weeks).toBe(10);
  });
  it("T-07 not placeable in B3 until tamper detection is verified at Advanced", () => {
    expect(f("B3").placeNow).toBe(false);
    expect(f("B3").missingCrit).toEqual({ skill: "tamper", prof: "Advanced" });
  });
});

describe("Default build v1 (T-08 … T-10)", () => {
  it("T-08 22 Field Metering: 3 retire, 4 stay, 8 high, 3 medium, 4 choices", () => {
    const fm = Object.values(v1.A).filter((a) => a.role?.family === "F01");
    expect(fm).toHaveLength(22);
    expect([v1.seg.retire.length, v1.seg.stay.length, v1.seg.high.length, v1.seg.med.length, v1.seg.low.length]).toEqual([3, 4, 8, 3, 4]);
  });
  it("T-09 one record in review: Teguh Santoso", () => {
    expect(v1.review).toHaveLength(1);
    const p = people.find((x) => x.id === v1.review[0].id)!;
    expect(p.name).toBe("Teguh Santoso");
    expect(p.title).toBe("Staf Khusus Direksi");
  });
  it("T-10 Fransiskus Nggadas's SKTTK skill is downgraded", () => {
    const g = gradeAll(byName("Fransiskus Nggadas"), data, TODAY).find((x) => x.skill.src === "SKTTK certificate")!;
    expect(g.base).toBe("V");
    expect(g.tier).toBe("I");
    expect(g.reason).toContain("expired 2024-07-31");
  });
  it("has 8 trace steps and keeps every id", () => {
    expect(v1.trace.map((t) => t.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(v1.ids).toHaveLength(40);
  });
});

describe("T-18 instruction parsing", () => {
  it("default prompt", () => {
    const r = parseInstruction(EXAMPLE_PROMPTS[0]);
    expect(r.params).toEqual(DEFAULT_PARAMS);
    expect(r.origin.levels).toBe("6 levels");
    expect(r.warnings).toEqual([]);
  });
  it("Indonesian prompt", () => {
    const r = parseInstruction(EXAMPLE_PROMPTS[1]);
    expect(r.params).toMatchObject({ scope: "F01", group: "unit", retire: 56, high: 75, levels: 6 });
    expect(r.origin.levels).toBeNull();
  });
  it("4 levels, by region, supported evidence", () => {
    const r = parseInstruction(EXAMPLE_PROMPTS[2]);
    expect(r.params).toMatchObject({ levels: 4, group: "unit", evidence: "S", scope: "all" });
  });
  it("warns on unsupported level counts and range limits", () => {
    expect(parseInstruction("Use 3 levels").warnings[0]).toContain("ignored: 4 to 6 levels supported");
    expect(parseInstruction("pensiun 70").params.retire).toBe(56);
    expect(parseInstruction("hanya metering, tanpa KKNI").params).toMatchObject({ scope: "F01", kkni: false });
    expect(parseInstruction("metering only").params.scope).toBe("F01");
  });
  it("compresses levels", () => {
    expect([1, 2, 3, 4, 5, 6].map((l) => compressLevel(l, 4))).toEqual([1, 2, 3, 3, 4, 4]);
    expect([1, 2, 3, 4, 5, 6].map((l) => compressLevel(l, 5))).toEqual([1, 2, 3, 4, 5, 5]);
  });
});

describe("T-22 dates and certificates", () => {
  it("certificate status boundaries", () => {
    expect(certStatus("2026-10-04", TODAY)).toBe("expired");
    expect(certStatus("2026-10-05", TODAY)).toBe("expiring");
    expect(certStatus("2027-01-02", TODAY)).toBe("expiring"); // 89 days
    expect(certStatus("2027-01-03", TODAY)).toBe("valid");    // 90 days
    expect(certStatus(undefined, TODAY)).toBe("valid");
  });
  it("length of service", () => {
    expect(fmtService("2012-03-01", "2026-10-05")).toBe("14 yrs 7 mo");
    expect(fmtService("2026-05-01", "2026-10-05")).toBe("5 mo");
  });
});

describe("names and similarity", () => {
  it("normalises and cleans names", () => {
    expect(normName("Muh. Rizal, S.T.")).toBe("muh rizal");
    expect(normName("Hj. SITI  Rahmawati, A.Md.")).toBe("siti rahmawati");
    expect(cleanName("AGUS SETIAWAN")).toBe("Agus Setiawan");
    expect(cleanName("Dewi Lestari, S.T.")).toBe("Dewi Lestari");
    expect(cleanName("Muh. Rizal, S.T.")).toBe("Muh. Rizal");
  });
  it("Muh. Rizal vs Muhammad Rizal falls in the decision band (≈0.85)", () => {
    const s = jaroWinkler("muh rizal", "muhammad rizal");
    expect(s).toBeGreaterThanOrEqual(0.8);
    expect(s).toBeLessThan(0.95);
    expect(s.toFixed(2)).toBe("0.85");
  });
});

describe("exposure view", () => {
  it("sorts families by exposed FTE and counts database people", () => {
    const fx = familyExposure(data, v1);
    expect(fx[0]).toMatchObject({ id: "F01", exposed: 4200, inDb: 22 });
    expect(totalExposed(data)).toBe(13079);
  });
  it("48% of the displacement lands in RU-1 and RU-2 by M9", () => {
    expect(shareBy(data, 9)).toBe(48);
  });
});
