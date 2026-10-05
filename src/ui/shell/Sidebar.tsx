import { useState } from "preact/hooks";
import { href, type Page } from "../lib/router";
import { currentVersion, restoreSample, toast, useApp } from "../../store/state";
import { AS_OF_LABEL } from "../../config";
import { Mark, Strength } from "../kit";
import { cx } from "../lib/format";

const NAV: { group: string; items: { n: number; page: Page; label: string }[] }[] = [
  { group: "Database", items: [
    { n: 1, page: "db/import", label: "Import from systems" },
    { n: 2, page: "db/add", label: "Add manually" },
    { n: 3, page: "db/view", label: "View database" },
  ] },
  { group: "Hierarchy", items: [
    { n: 4, page: "h/build", label: "Build hierarchy" },
    { n: 5, page: "h/view", label: "View hierarchy" },
  ] },
];

/** Busbar with three feeders: the brand mark echoes the single-line diagram. */
function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" class="brand-mark">
      <rect x="3" y="5" width="22" height="3" rx="1" fill="var(--navy)" />
      <path d="M7 8v7M14 8v4.5M21 8v9" stroke="var(--navy)" stroke-width="1.6" fill="none" />
      <circle cx="14" cy="15.5" r="3" fill="none" stroke="var(--navy)" stroke-width="1.6" />
      <rect x="4.5" y="15" width="5" height="5" rx="1" fill="none" stroke="var(--navy)" stroke-width="1.4" />
      <rect x="18.5" y="17" width="5" height="5" rx="1" fill="var(--rust)" />
    </svg>
  );
}

export function Sidebar({ page }: { page: Page }) {
  const app = useApp();
  const v = currentVersion();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const doRestore = async () => {
    setBusy(true);
    await restoreSample();
    setBusy(false);
    setConfirming(false);
    toast("Sample data restored: 40 records, hierarchy v1.");
  };

  return (
    <aside class="sidebar" aria-label="Main">
      <div class="brand">
        <BrandMark />
        <div>
          <div class="brand-name">Meridian</div>
          <div class="brand-sub">Workforce redeployment cockpit</div>
        </div>
      </div>

      <nav class="nav">
        {NAV.map((g) => (
          <div class="nav-group" key={g.group}>
            <div class="nav-group-label">{g.group}</div>
            <ul>
              {g.items.map((it) => (
                <li key={it.page}>
                  <a href={href(it.page)} class={cx("nav-item", page === it.page && "is-active")} aria-current={page === it.page ? "page" : undefined}>
                    <span class="nav-n">{it.n}</span>
                    <span class="nav-label">{it.label}</span>
                    {it.page === "db/view" && <span class="nav-badge" title={`${app.people.length} people`}>{app.people.length}</span>}
                    {it.page === "h/view" && v && <span class="nav-badge nav-badge-v" title={`Hierarchy version ${v.n}`}>v{v.n}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div class="sidebar-foot">
        <div class="legend">
          <div class="legend-title">How sure each number is</div>
          <div class="legend-row"><Mark ev="m" label /></div>
          <div class="legend-row"><Mark ev="i" label /></div>
          <div class="legend-row"><Mark ev="a" label /></div>
          <div class="legend-title">Skill evidence</div>
          <div class="legend-row"><Strength tier="V" /></div>
          <div class="legend-row"><Strength tier="S" /></div>
          <div class="legend-row"><Strength tier="I" /></div>
        </div>

        <div class={cx("storage", app.storage === "memory" && "is-memory")}>
          <span class="storage-dot" aria-hidden="true" />
          {app.storage === "indexeddb" ? "Saved in this browser only" : "Memory only: changes are lost on reload"}
        </div>
        <div class="asof">Ages and certificates as of {AS_OF_LABEL}, a fixed demo date</div>

        {!confirming ? (
          <button type="button" class="link-btn" onClick={() => setConfirming(true)}>Restore sample data</button>
        ) : (
          <div class="confirm-inline" role="group" aria-label="Confirm restore">
            <p>Replace everything with the 40 sample records? Imports, added people and hierarchy versions are removed.</p>
            <div class="row gap-8">
              <button type="button" class="btn btn-danger btn-sm" onClick={doRestore} disabled={busy}>{busy ? "Restoring…" : "Restore"}</button>
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
