// Date helpers on ISO strings (YYYY-MM-DD). The as-of date is always passed in, never read here (SRS D-1).

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m || 1, d || 1];
}

function utc(iso: string): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function age(dob: string, today: string): number {
  const [by, bm, bd] = parts(dob);
  const [ty, tm, td] = parts(today);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Whole months of service from start date to today. */
export function serviceMonths(start: string, today: string): number {
  const [sy, sm, sd] = parts(start);
  const [ty, tm, td] = parts(today);
  return Math.max(0, (ty - sy) * 12 + (tm - sm) - (td < sd ? 1 : 0));
}

export function serviceYears(start: string, today: string): number {
  return serviceMonths(start, today) / 12;
}

/** "14 yrs 7 mo", "1 yr", "5 mo". */
export function fmtService(start: string, today: string): string {
  const total = serviceMonths(start, today);
  const y = Math.floor(total / 12);
  const m = total % 12;
  const ys = y === 1 ? "1 yr" : `${y} yrs`;
  if (y === 0) return `${m} mo`;
  return m === 0 ? ys : `${ys} ${m} mo`;
}

export type CertStatus = "valid" | "expiring" | "expired";

/** expired if valid-until < today; expiring if under 90 days away; otherwise valid (brief §5). */
export function certStatus(valid: string | undefined, today: string): CertStatus {
  if (!valid) return "valid";
  if (valid < today) return "expired";
  return daysBetween(today, valid) < 90 ? "expiring" : "valid";
}

/** Accepts ISO or dd/mm/yyyy; returns ISO. */
export function normDate(s: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s.trim();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Mar 1979". */
export function fmtDate(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
