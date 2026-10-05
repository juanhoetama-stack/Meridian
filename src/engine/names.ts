// Name normalisation for matching (normName) and for display (cleanName). Brief §8.1.

const DEGREES = ["s.t.", "s.e.", "s.kom.", "s.h.", "a.md.", "m.psi.", "m.t.", "m.m.", "ir.", "dr.", "drs."];
const HONORIFICS = ["h.", "hj."];

function withDot(t: string): string {
  return t.endsWith(".") ? t : t + ".";
}

function tokens(s: string): string[] {
  return s.replace(/,/g, " ").split(/\s+/).filter(Boolean);
}

/** For matching only: strip degrees and titles, lowercase, drop punctuation, collapse spaces. */
export function normName(s: string): string {
  return tokens(s.toLowerCase())
    .filter((t) => !DEGREES.includes(withDot(t)) && !HONORIFICS.includes(t))
    .join(" ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** For display: strip degrees; title-case if the name is all caps. */
export function cleanName(s: string): string {
  const kept = tokens(s).filter((t) => !DEGREES.includes(withDot(t.toLowerCase())));
  const joined = kept.join(" ").replace(/\s*,\s*$/, "").trim();
  if (joined === joined.toUpperCase() && /[A-Z]/.test(joined)) {
    return joined.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
  }
  return joined;
}

export function initials(name: string): string {
  const w = cleanName(name).split(/\s+/).filter((t) => /^[A-Za-z]/.test(t));
  if (w.length === 0) return "?";
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}
