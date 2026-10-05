// 3 · View database (brief §8.3).
import { useMemo, useState } from "preact/hooks";
import { data, familyById, skillName } from "../../data";
import { duplicateIndex, FLAG_LABEL, profileView, sourceTags, type Flag, type PathKind, type ProfileView } from "../../engine/profile";
import { fmtService } from "../../engine/dates";
import { AS_OF } from "../../config";
import { currentVersion, openPerson, useApp } from "../../store/state";
import { Avatar, Button, Chip, Empty, EvidenceBar } from "../kit";
import { href } from "../lib/router";
import { cx } from "../lib/format";

const FLAG_TONE: Record<Flag, "rust" | "amber" | "muted"> = {
  expired: "rust", expiring: "amber", duplicate: "amber", review: "amber", notInHierarchy: "muted", noKtp: "muted",
};

export const PATH_CLASS: Record<PathKind, string> = {
  high: "path-go", med: "path-go", retire: "path-quiet", stay: "path-quiet", low: "path-choices",
  mapped: "path-quiet", review: "path-warn", out: "path-quiet", notIn: "path-warn", none: "path-quiet",
};

export function useProfiles(): ProfileView[] {
  const app = useApp();
  const v = currentVersion();
  return useMemo(() => {
    const dups = duplicateIndex(app.people);
    return app.people.map((p) => profileView(p, v, data, AS_OF, dups));
  }, [app.people, v]);
}

export function DatabasePage() {
  const views = useProfiles();
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("");
  const [fam, setFam] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return views.filter((v) => {
      const p = v.person;
      if (s && !`${p.name} ${p.id} ${p.title}`.toLowerCase().includes(s)) return false;
      if (unit && p.unit !== unit) return false;
      if (fam === "review" ? !v.flags.includes("review") : fam && v.role?.family !== fam) return false;
      if (status === "flag" && !v.flags.length) return false;
      if (status === "mine" && (p.seed || p.imported)) return false;
      return true;
    });
  }, [views, q, unit, fam, status]);

  const filtered = q || unit || fam || status;
  const clear = () => { setQ(""); setUnit(""); setFam(""); setStatus(""); };

  return (
    <div class="db">
      <div class="toolbar" role="search">
        <input class="input search" type="search" placeholder="Search name, ID or job title" aria-label="Search name, ID or job title" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        <select class="select" aria-label="Unit" value={unit} onChange={(e) => setUnit((e.target as HTMLSelectElement).value)}>
          <option value="">All units</option>
          {data.UNITS.map((u) => <option key={u.id} value={u.id}>{u.id}</option>)}
        </select>
        <select class="select" aria-label="Family" value={fam} onChange={(e) => setFam((e.target as HTMLSelectElement).value)}>
          <option value="">All families</option>
          {data.FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          <option value="review">Needs review</option>
        </select>
        <select class="select" aria-label="Status" value={status} onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}>
          <option value="">Any status</option>
          <option value="flag">Has a flag</option>
          <option value="mine">Added by you</option>
        </select>
        <span class="count small muted" aria-live="polite">{rows.length === views.length ? `${views.length} people` : `${rows.length} of ${views.length} people`}</span>
        <span class="grow" />
        <Button onClick={() => exportCsv(rows)}>Export CSV</Button>
        <a class="btn btn-primary" href={href("db/add")}>Add employee</a>
      </div>

      <div class="panel db-table-wrap">
        {rows.length === 0 ? (
          <Empty title="No one matches these filters.">
            <p>Try a shorter search or another unit. <button type="button" class="link-btn" onClick={clear}>Clear filters</button></p>
          </Empty>
        ) : (
          <table class="tbl db-table">
            <thead>
              <tr><th>Person</th><th>Job title and role profile</th><th>Unit</th><th>Service</th><th>Evidence</th><th>Level and path</th><th>Flags</th></tr>
            </thead>
            <tbody>
              {rows.map((v) => {
                const p = v.person;
                return (
                  <tr
                    key={p.id} tabIndex={0} class="db-row" aria-label={`${p.name}, ${p.id}. Open profile`}
                    onClick={() => openPerson(p.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPerson(p.id); } }}
                  >
                    <td>
                      <div class="person-cell">
                        <Avatar name={p.name} photo={p.photo} size={32} />
                        <div>
                          <div class="person-name">{p.name}</div>
                          <div class="xs muted">{p.id} · {sourceTags(p).join(" · ")}</div>
                        </div>
                      </div>
                    </td>
                    <td class="title-cell">
                      {p.title}
                      <div class="xs muted" title={v.role?.roleProfile}>{v.role ? v.role.roleProfile : "No role profile yet"}</div>
                    </td>
                    <td class="nowrap">{p.unit}</td>
                    <td class="nowrap num">{fmtService(p.start, AS_OF)}</td>
                    <td><EvidenceBar {...v.tiers} /></td>
                    <td class={cx("path-cell", PATH_CLASS[v.path.kind])}><PathLabel label={v.path.label} /></td>
                    <td><div class="flags">{v.flags.map((f) => <Chip key={f} tone={FLAG_TONE[f]}>{FLAG_LABEL[f]}</Chip>)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {filtered && rows.length > 0 && <p class="xs muted db-foot"><button type="button" class="link-btn" onClick={clear}>Clear filters</button></p>}
    </div>
  );
}

function csvCell(s: string | number): string {
  const t = String(s);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** CSV without images or the NIK hash (SRS DB-7). */
function exportCsv(rows: ProfileView[]) {
  const head = ["ID", "Name", "Place of birth", "Date of birth", "Education", "Major", "Job title", "Role profile", "Family", "Unit", "Start date", "Service",
    "Skills", "Certificates", "Level", "Level confidence", "Path", "Flags", "SAP SF ID", "Moodle ID", "Unit tool ID"];
  const lines = rows.map((v) => {
    const p = v.person;
    return [
      p.id, p.name, p.pob, p.dob, p.edu.level, p.edu.major, p.title, v.role?.roleProfile ?? "", v.role ? familyById(v.role.family)?.name ?? "" : "",
      p.unit, p.start, fmtService(p.start, AS_OF),
      v.graded.map((g) => `${skillName(g.skill.skill)} (${g.skill.prof}, ${g.tier})`).join("; "),
      v.certs.map((c) => `${c.cert.type} ${c.cert.number} until ${c.cert.valid ?? "-"} (${c.status})`).join("; "),
      `L${v.levelShown}`, v.confidence, v.path.label, v.flags.map((f) => FLAG_LABEL[f]).join("; "),
      p.src?.sf ?? "", p.src?.lms ?? "", p.src?.perf ?? "",
    ].map(csvCell).join(",");
  });
  const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meridian-database-${AS_OF}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Keeps "· 81% fit" together on one line. */
export function PathLabel({ label }: { label: string }) {
  const i = label.lastIndexOf(" · ");
  if (i < 0 || !label.endsWith("fit")) return <>{label}</>;
  return <>{label.slice(0, i)} <span class="nowrap">· {label.slice(i + 3)}</span></>;
}
