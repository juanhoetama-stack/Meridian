// Store + actions against fake IndexedDB: seed, sequence never reused, restore restarts (T-17), import idempotence.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { addPerson, deletePerson, getState, init, restoreSample, runBuild, saveImport } from "../../src/store/state";
import { memoryStore } from "../../src/store/db";
import { generatePayloads } from "../../src/engine/payloads";
import { resolveImport } from "../../src/engine/identity";
import { DEFAULT_PARAMS, DEFAULT_PROMPT } from "../../src/engine/parse";
import { data } from "../../src/data";
import { AS_OF } from "../../src/config";

const draft = (name: string) => ({
  name, pob: "Bandung", dob: "1990-01-01", edu: { level: "SMK" as const, major: "" }, title: "Petugas Catat Meter",
  unit: "RU-1" as const, start: "2015-01-01", skills: [], certs: [], photo: null, ktp: null, seed: false,
});

describe("store and actions", () => {
  it("first open seeds 40 records and builds v1", async () => {
    await init();
    const s = getState();
    expect(s.storage).toBe("indexeddb");
    expect(s.people).toHaveLength(40);
    expect(s.seq).toBe(40);
    expect(s.versions.map((v) => v.id)).toEqual(["v1"]);
    expect(s.currentVersion).toBe("v1");
  });

  it("IDs are sequential and never reused after a delete", async () => {
    const a = await addPerson(draft("Test Satu"));
    expect(a.id).toBe("MRD-000041");
    await deletePerson(a.id);
    const b = await addPerson(draft("Test Dua"));
    expect(b.id).toBe("MRD-000042");
  });

  it("restore restarts at MRD-000001 and the next new person is MRD-000041", async () => {
    await runBuild(DEFAULT_PARAMS, DEFAULT_PROMPT);
    await restoreSample();
    const s = getState();
    expect(s.people[0].id).toBe("MRD-000001");
    expect(s.people).toHaveLength(40);
    expect(s.versions).toHaveLength(1);
    expect((await addPerson(draft("Test Tiga"))).id).toBe("MRD-000041");
  });

  it("saving an import writes history and connector timestamps", async () => {
    await restoreSample();
    const payloads = generatePayloads(data, { sf: true, lms: true, perf: true });
    const first = resolveImport(payloads, getState().people, data, AS_OF);
    const plan = resolveImport(payloads, getState().people, data, AS_OF, { [first.decisions[0].key]: "merge" });
    await saveImport(plan);
    const s = getState();
    expect(s.people).toHaveLength(52);
    expect(s.importHistory[0]).toMatchObject({ added: 12, updated: 40, review: 0 });
    expect(s.connectors.sf.lastSaved).toBeTruthy();
    const again = resolveImport(payloads, s.people, data, AS_OF);
    expect([again.kpis.newPeople, again.kpis.enriched, again.matched]).toEqual([0, 0, 52]);
  });

  it("memory store implements the same interface", async () => {
    const m = memoryStore();
    await m.write({ meta: { seq: 3 } });
    expect(await m.getMeta<number>("seq")).toBe(3);
    await m.clear();
    expect(await m.getMeta("seq")).toBeUndefined();
  });
});
