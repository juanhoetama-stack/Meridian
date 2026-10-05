// Path labels and flags shared by the database table and the profile drawer (SRS DB-3, DB-4).
import { describe, expect, it } from "vitest";
import { data } from "../../src/data";
import { seedPeople } from "../../src/data/seed";
import { build } from "../../src/engine/build";
import { DEFAULT_PARAMS, DEFAULT_PROMPT, EXAMPLE_PROMPTS, parseInstruction } from "../../src/engine/parse";
import { duplicateIndex, profileView, sourceTags } from "../../src/engine/profile";
import type { Person } from "../../src/engine/types";

const TODAY = "2026-10-05";
const people = seedPeople(data, "2026-10-05T00:00:00.000Z");
const v1 = build({ people, params: DEFAULT_PARAMS, prompt: DEFAULT_PROMPT, n: 1, built: "x", today: TODAY }, data);
const view = (name: string, v = v1, ps = people) => {
  const p = ps.find((x) => x.name === name)!;
  return profileView(p, v, data, TODAY, duplicateIndex(ps));
};

describe("path labels", () => {
  it("Agus: L2 path to B3 at 81%", () => {
    expect(view("Agus Setiawan").path.label).toBe("L2 Path to B3 Revenue Protection & Loss Investigation · 81% fit");
  });
  it("retire, stay, choices, review, mapped", () => {
    expect(view("Suparman").path.label).toBe("Retires on schedule");
    expect(view("Bambang Hermanto").path.label).toBe("Stays as crew lead");
    expect(view("Joko Susilo").path.label).toBe("Needs choices, second offer first");
    expect(view("Teguh Santoso").path.label).toBe("In the review queue");
    expect(view("Hadi Kusuma").path.label).toBe("L4 Distribution Network Engineer / Technician");
  });
  it("outside scope and not in version", () => {
    const p = parseInstruction(EXAMPLE_PROMPTS[1]).params;
    const v2 = build({ people, params: p, prompt: EXAMPLE_PROMPTS[1], n: 2, built: "x", today: TODAY }, data);
    expect(view("Hadi Kusuma", v2).path.label).toBe("Outside v2 scope");
    const extra: Person = { ...people[7], id: "MRD-000041", seed: false };
    const more = [...people, extra];
    const pv = profileView(extra, v1, data, TODAY, duplicateIndex(more));
    expect(pv.path.label).toBe("Not in v1: rebuild");
    expect(pv.flags).toEqual(["duplicate", "notInHierarchy", "noKtp"]);
  });
});

describe("flags and sources", () => {
  it("expired and expiring certificates", () => {
    expect(view("Fransiskus Nggadas").flags).toContain("expired");
    expect(view("Suparman").flags).toContain("expiring");
    expect(view("Agus Setiawan").flags).toEqual([]);
  });
  it("title needs review; seeds never flag a missing KTP", () => {
    expect(view("Teguh Santoso").flags).toEqual(["review"]);
  });
  it("source tags", () => {
    expect(sourceTags(people[0])).toEqual(["Manual"]);
    expect(sourceTags({ ...people[0], src: { sf: "EMP-1", perf: "X" } })).toEqual(["SF", "Rating"]);
  });
});
