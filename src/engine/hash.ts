// Demo NIK hash (SRS SP-2, D-5): FNV-1a 32-bit → "nik#xxxxxxxx". A real NIK is never stored or shown.
import { normName } from "./names";

export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function nikHash(name: string, dob: string): string {
  return "nik#" + fnv1a(`${normName(name)}|${dob}`);
}
