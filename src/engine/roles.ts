// Title → role profile via data.ROLE_RULES; the first match wins (brief §7.2 step 3).
import type { DomainData, RoleMatch } from "./types";

export function matchRole(title: string, d: DomainData): RoleMatch | null {
  for (let i = 0; i < d.ROLE_RULES.length; i++) {
    const r = d.ROLE_RULES[i];
    if (new RegExp(r.pattern, r.flags).test(title)) {
      return { roleProfile: r.roleProfile, family: r.family, subFamily: r.subFamily, band: r.band, rule: i };
    }
  }
  return null;
}
