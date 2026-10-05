import { currentVersion, useApp } from "../../store/state";
import { fmtStamp, fmtInt } from "../lib/format";

export function TopBar({ title, purpose }: { title: string; purpose: string }) {
  const app = useApp();
  const v = currentVersion();
  return (
    <header class="topbar">
      <div class="topbar-text">
        <h1 class="page-title">{title}</h1>
        <p class="page-purpose">{purpose}</p>
      </div>
      <p class="topbar-status">
        <span>{fmtInt(app.people.length)} {app.people.length === 1 ? "person" : "people"} in the database</span>
        {v ? (
          <>
            <span class="sep">·</span><span>Hierarchy v{v.n}</span>
            <span class="sep">·</span><span>built {fmtStamp(v.built)}</span>
          </>
        ) : (
          <><span class="sep">·</span><span>No hierarchy yet</span></>
        )}
      </p>
    </header>
  );
}
