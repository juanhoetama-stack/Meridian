// SEED (long field names) → Person. IDs follow seed order: seed #8 (Agus Setiawan) = MRD-000008.
import type { DomainData, Person } from "../engine/types";
import { skillKey } from "./index";

export function mrdId(n: number): string {
  return "MRD-" + String(n).padStart(6, "0");
}

export function seedPeople(d: DomainData, created: string): Person[] {
  return d.SEED.map((s, i) => ({
    id: mrdId(i + 1),
    name: s.name,
    pob: s.placeOfBirth,
    dob: s.dateOfBirth,
    edu: { level: s.eduLevel, major: s.eduMajor ?? "" },
    title: s.jobTitle,
    unit: s.unit,
    start: s.startDate,
    skills: s.skills.map((k) => ({ skill: skillKey(k.skill) ?? k.skill, prof: k.prof, src: k.src, date: k.date })),
    certs: (s.certs ?? []).map((c) => ({ type: c.type, name: c.name, number: c.number, valid: c.validUntil })),
    photo: null,
    ktp: null,
    seed: true,
    created,
  }));
}
