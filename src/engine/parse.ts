// Instruction → parameters (brief §7.1). Deterministic pattern rules in English and Indonesian.
import type { Params } from "./types";

export const DEFAULT_PARAMS: Params = { levels: 6, scope: "all", group: "family", evidence: "V", retire: 56, high: 70, kkni: true };

export const EXAMPLE_PROMPTS = [
  "Build a capability hierarchy for all job families with 6 levels and a KKNI crosswalk. Group by family. Use verified evidence for placement decisions, retirement age 56, and high adjacency from 70%.",
  "Bentuk hierarchy khusus Field Metering, kelompokkan per region, usia pensiun 56, dan high adjacency mulai 75%.",
  "Use 4 levels instead of 6, group by region, and allow supported evidence for placement decisions.",
];

export const DEFAULT_PROMPT = EXAMPLE_PROMPTS[0];

export type Origins = Record<keyof Params, string | null>;
export interface ParseResult { params: Params; origin: Origins; warnings: string[] }

const snip = (s: string) => s.trim().replace(/\s+/g, " ");

export function parseInstruction(text: string): ParseResult {
  const params: Params = { ...DEFAULT_PARAMS };
  const origin: Origins = { levels: null, scope: null, group: null, evidence: null, retire: null, high: null, kkni: null };
  const warnings: string[] = [];
  let m: RegExpExecArray | null;

  if ((m = /(\d)\s*[- ]?\s*(levels?|tingkat|jenjang|layers?)\b/i.exec(text))) {
    const n = Number(m[1]);
    if (n >= 4 && n <= 6) { params.levels = n as Params["levels"]; origin.levels = snip(m[0]); }
    else warnings.push(`"${snip(m[0])}" ignored: 4 to 6 levels supported`);
  }

  if ((m = /\b(only|hanya|khusus|just)\b[^.,;]*?\bmetering\b/i.exec(text)) || (m = /\bmetering\s+only\b/i.exec(text))) {
    params.scope = "F01"; origin.scope = snip(m[0]);
  } else if ((m = /\b(all|semua|seluruh)\b[^.,;]*?\bfamil\w*/i.exec(text))) {
    params.scope = "all"; origin.scope = snip(m[0]);
  }

  if ((m = /\b(group\s+by|by|per|kelompok\w*)\s+(?:\w+\s+){0,2}?(region\w*|unit|wilayah)\b/i.exec(text))) {
    params.group = "unit"; origin.group = snip(m[0]);
  } else if ((m = /\b(group\s+by|by|per|kelompok\w*)\s+(famil\w*|keluarga\s+jabatan)/i.exec(text))) {
    params.group = "family"; origin.group = snip(m[0]);
  }

  const sup = /\b(supported|didukung)\b/i.exec(text);
  const place = /\b(placement|penempatan|place)\b/i.exec(text);
  if (sup && place) {
    params.evidence = "S";
    const from = Math.min(sup.index, place.index);
    const to = Math.max(sup.index + sup[0].length, place.index + place[0].length);
    origin.evidence = snip(text.slice(from, to));
  } else if ((m = /\b(verified|terverifikasi)\b[^.,;]*/i.exec(text))) {
    params.evidence = "V"; origin.evidence = snip(m[0]);
  }

  if ((m = /\b(retire\w*|pensiun|retirement\s+age)\b\D{0,20}?(\d{2})\b/i.exec(text))) {
    const n = Number(m[2]);
    if (n >= 50 && n <= 65) { params.retire = n; origin.retire = snip(m[0]); }
    else warnings.push(`"${snip(m[0])}" ignored: retirement age must be 50 to 65`);
  }

  if ((m = /\b(high|tinggi)\b\D{0,30}?(\d{2})\s*%/i.exec(text))) {
    const n = Number(m[2]);
    if (n >= 50 && n <= 95) { params.high = n; origin.high = snip(m[0]); }
    else warnings.push(`"${snip(m[0])}" ignored: high adjacency must be 50% to 95%`);
  }

  if ((m = /\b(without|no|tanpa)\s+kkni\b/i.exec(text))) {
    params.kkni = false; origin.kkni = snip(m[0]);
  } else if ((m = /\bkkni\b[^.,;]*/i.exec(text))) {
    origin.kkni = snip(m[0]);
  }

  return { params, origin, warnings };
}

/** Plain-words restatement used by build step 1. */
export function describeParams(p: Params): string {
  return [
    `${p.levels} levels${p.kkni ? " with a KKNI crosswalk" : ", no KKNI crosswalk"}`,
    p.scope === "F01" ? "Field Metering only" : "all 12 families",
    p.group === "unit" ? "grouped by regional unit" : "grouped by family",
    p.evidence === "S" ? "placement on verified or supported evidence" : "placement on verified evidence only",
    `retirement at ${p.retire}`,
    `high adjacency from ${p.high}%`,
  ].join(" · ");
}
