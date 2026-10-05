// 1 · Import from systems (brief §8.1). Nothing is written before Save.
import { useMemo, useState } from "preact/hooks";
import type { Connector } from "../../engine/types";
import { data, familyById } from "../../data";
import { generatePayloads, type Payloads } from "../../engine/payloads";
import { resolveImport, type DecisionAnswer, type ImportPlan, type PendingDecision } from "../../engine/identity";
import { matchRole } from "../../engine/roles";
import { mrdId } from "../../data/seed";
import { AS_OF } from "../../config";
import { byId, connect, openPerson, saveImport, toast, useApp } from "../../store/state";
import { Avatar, Button, Chip, Empty, Note, TabPanel, Tabs } from "../kit";
import { cx, fmtInt, fmtStamp } from "../lib/format";
import { href, navigate } from "../lib/router";

const PULLABLE = ["sf", "lms", "perf"];
const SYSTEM_NAME: Record<string, string> = { sf: "SAP SuccessFactors", lms: "Moodle LMS", perf: "Regional performance tools" };

export function ImportPage() {
  const app = useApp();
  const [payloads, setPayloads] = useState<Payloads | null>(null);
  const [answers, setAnswers] = useState<Record<string, DecisionAnswer>>({});
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);

  const connected = PULLABLE.filter((id) => app.connectors[id]?.connected);
  const plan = useMemo(
    () => (payloads ? resolveImport(payloads, app.people, data, AS_OF, answers) : null),
    [payloads, app.people, answers],
  );

  const pull = () => {
    setPulling(true);
    setTimeout(() => {
      setPayloads(generatePayloads(data, { sf: connected.includes("sf"), lms: connected.includes("lms"), perf: connected.includes("perf") }));
      setAnswers({});
      setPulling(false);
      requestAnimationFrame(() => document.getElementById("check")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }, 450);
  };

  const discard = () => { setPayloads(null); setAnswers({}); };

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    const r = await saveImport(plan);
    setSaving(false);
    setPayloads(null);
    setAnswers({});
    toast(`Saved to database: ${r.added.length} new, ${r.updated.length} updated.`, { label: "View database", run: () => navigate("db/view") });
  };

  return (
    <div class="import">
      <Note>
        <p>
          <b>Prototype connectors.</b> Each returns a sample payload shaped like the real system's API, with the same mess:
          inconsistent names, unit codes, date formats and rating scales. In production the same flow runs through an integration
          service inside the Client's network; credentials never sit in a browser.
        </p>
      </Note>

      <section class="section" aria-labelledby="sys-h">
        <div class="section-head">
          <div>
            <h2 class="section-title" id="sys-h"><span class="section-n">1</span>Source systems</h2>
            <p class="section-sub">Whatever an API can give is pulled. Whatever it cannot give is entered manually. Payroll is never touched.</p>
          </div>
          <div class="row gap-12">
            {connected.length === 0 && <span class="small muted">Connect at least one system first.</span>}
            <Button variant="primary" onClick={pull} disabled={connected.length === 0 || pulling}>
              {pulling ? "Pulling…" : "Pull all connected"}
            </Button>
          </div>
        </div>
        <div class="panel connectors">
          {data.CONNECTORS.map((c) => <ConnectorRow key={c.id} c={c} />)}
        </div>
        {app.importHistory.length > 0 && <History />}
      </section>

      {plan && (
        <CheckBeforeSaving
          plan={plan} answers={answers} saving={saving}
          onAnswer={(key, a) => setAnswers({ ...answers, [key]: a })}
          onUndo={(key) => { const n = { ...answers }; delete n[key]; setAnswers(n); }}
          onSave={save} onDiscard={discard}
        />
      )}
    </div>
  );
}

// ---------- Section 1 ----------

function ConnectorRow({ c }: { c: Connector }) {
  const app = useApp();
  const st = app.connectors[c.id];
  const [open, setOpen] = useState<"config" | "map" | null>(null);
  const [testing, setTesting] = useState(false);
  const pullable = PULLABLE.includes(c.id);

  const test = () => {
    setTesting(true);
    setTimeout(async () => { await connect(c.id); setTesting(false); setOpen(null); }, 700);
  };

  let status;
  if (c.status === "locked") status = <Chip tone="rust">Off-limits</Chip>;
  else if (c.status === "none") status = <Chip tone="muted">No API</Chip>;
  else if (st?.connected) status = <Chip tone="teal">Connected</Chip>;
  else status = <Chip>Not connected</Chip>;

  return (
    <div class={cx("conn", c.status === "locked" && "is-locked")}>
      <div class="conn-main">
        <div class="conn-name">
          <div class="conn-title">{c.n}</div>
          <div class="conn-role">{c.role}</div>
        </div>
        <div class="conn-api">{c.api}</div>
        <div class="conn-status">{status}</div>
        <div class="conn-known">
          {c.known && <span><span class="muted">Known issue: </span>{c.known}</span>}
          {c.status === "locked" && <span>{c.note}</span>}
          {c.status === "none" && <span class="muted conn-note">{c.note}</span>}
          {st?.lastSaved && <div class="xs muted">Last saved {fmtStamp(st.lastSaved)}</div>}
        </div>
        <div class="conn-actions">
          {c.map && (
            <button type="button" class="link-btn small" aria-expanded={open === "map"} onClick={() => setOpen(open === "map" ? null : "map")}>
              Field mapping
            </button>
          )}
          {pullable && !st?.connected && (
            <Button size="sm" onClick={() => setOpen(open === "config" ? null : "config")} aria-expanded={open === "config"}>Connect</Button>
          )}
          {c.status === "none" && <a class="btn btn-sm" href={href("db/add")}>Enter manually</a>}
        </div>
      </div>

      {c.units && (
        <div class="conn-units" aria-label="Per-unit access">
          {c.units.map((u) => (
            <span key={u.u} class={cx("unit-chip", u.ok ? "is-api" : "is-manual")} title={`${u.api} · scale ${u.scale}`}>
              <b>{u.u}</b> {u.ok ? `API · ${u.scale}` : "Manual"}
            </span>
          ))}
        </div>
      )}

      {open === "config" && (
        <div class="conn-config">
          <div class="config-grid">
            <div class="field"><label for={`ep-${c.id}`}>Endpoint</label><input id={`ep-${c.id}`} class="input" readOnly value={c.base ?? (c.id === "perf" ? "4 unit endpoints (RU-1, RU-2, RU-3, RU-5)" : "")} /></div>
            <div class="field"><label for={`au-${c.id}`}>Authentication</label><input id={`au-${c.id}`} class="input" readOnly value={c.auth ?? "Per-unit API keys"} /></div>
            <div class="field"><span class="label">Credentials</span><p class="config-cred">Held by the integration service</p></div>
          </div>
          <div class="row gap-8">
            <Button variant="primary" size="sm" onClick={test} disabled={testing}>{testing ? "Testing connection…" : "Test and connect"}</Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {open === "map" && c.map && (
        <div class="conn-map">
          <table class="tbl tbl-compact">
            <thead><tr><th>{c.id === "perf" ? "Source fields" : "Source field"}</th><th>Becomes in Meridian</th></tr></thead>
            <tbody>{c.map.map(([a, b]) => <tr key={a}><td><code>{a}</code></td><td>{b}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function History() {
  const { importHistory } = useApp();
  return (
    <div class="history">
      <h3 class="h3">Import history</h3>
      <table class="tbl tbl-compact">
        <thead><tr><th>Saved</th><th>Systems</th><th class="r">New</th><th class="r">Updated</th><th class="r">Left for review</th><th class="r">Not imported</th></tr></thead>
        <tbody>
          {importHistory.map((h) => (
            <tr key={h.time}>
              <td class="nowrap">{fmtStamp(h.time)}</td>
              <td>{h.systems.map((s) => SYSTEM_NAME[s]).join(", ")}</td>
              <td class="r num">{h.added}</td><td class="r num">{h.updated}</td><td class="r num">{h.review}</td><td class="r num">{h.notImported}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Section 2 ----------

interface CheckProps {
  plan: ImportPlan; answers: Record<string, DecisionAnswer>; saving: boolean;
  onAnswer: (key: string, a: DecisionAnswer) => void; onUndo: (key: string) => void;
  onSave: () => void; onDiscard: () => void;
}

function CheckBeforeSaving({ plan, saving, onAnswer, onUndo, onSave, onDiscard }: CheckProps) {
  const app = useApp();
  const [tab, setTab] = useState(plan.decisions.length ? "decide" : "new");
  const nNew = plan.newPeople.length, nUpd = plan.updates.length;
  const nothing = nNew === 0 && nUpd === 0;

  return (
    <section class="section check" id="check" aria-labelledby="check-h">
      <div class="section-head">
        <div>
          <h2 class="section-title" id="check-h"><span class="section-n">2</span>Check before saving</h2>
          <p class="section-sub">Nothing is written until you save. Pulled from {plan.systems.map((s) => SYSTEM_NAME[s]).join(", ")}.</p>
        </div>
      </div>

      <div class="kpis">
        <Kpi n={nNew} label="New people" />
        <Kpi n={nUpd} label="Existing records enriched" />
        <Kpi n={plan.decisions.length} label="Need your decision" tone={plan.decisions.length ? "amber" : undefined} />
        <Kpi n={plan.kpis.duplicatesAvoided} label="Duplicates avoided" sub="SAP SF records matched to someone already here" />
      </div>

      <div class="norm">
        <h3 class="h3">Normalisation notes</h3>
        <ul>{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </div>

      <Tabs
        label="Import preview" idPrefix="imp" value={tab} onChange={setTab}
        tabs={[
          { id: "new", label: "New people", count: nNew },
          { id: "upd", label: "Updates", count: nUpd },
          { id: "decide", label: "Needs your decision", count: plan.decisions.length + plan.decided.length },
          { id: "same", label: "Already up to date", count: plan.upToDate.length },
          { id: "not", label: "Not imported", count: plan.notImported.length },
        ]}
      />
      <TabPanel idPrefix="imp" id={tab}>
        {tab === "new" && <NewPeople plan={plan} seq={app.seq} />}
        {tab === "upd" && <Updates plan={plan} />}
        {tab === "decide" && <Decisions plan={plan} onAnswer={onAnswer} onUndo={onUndo} />}
        {tab === "same" && (plan.upToDate.length
          ? <div class="same-list">{plan.upToDate.map((u) => <span key={u.id} class="chip"><b>{u.id}</b> {u.name}</span>)}</div>
          : <Empty title="No record is already up to date.">Every matched record has at least one change in this pull.</Empty>)}
        {tab === "not" && <NotImportedTab plan={plan} />}
      </TabPanel>

      <div class="savebar" role="region" aria-label="Save import">
        <div class="savebar-text">
          {plan.decisions.length > 0
            ? <span><b>{plan.decisions.length} {plan.decisions.length === 1 ? "record waits" : "records wait"} for your decision</b> and {plan.decisions.length === 1 ? "is" : "are"} left out of this save.</span>
            : nothing ? <span>Nothing new to save: every record already matches.</span>
            : <span>All decisions made. Saving writes {nNew} new and {nUpd} updated records.</span>}
        </div>
        <div class="row gap-8">
          <Button variant="ghost" onClick={onDiscard}>Discard</Button>
          <Button variant="primary" onClick={onSave} disabled={saving || nothing}>
            {saving ? "Saving…" : `Save to database: ${nNew} new, ${nUpd} updated`}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Kpi({ n, label, sub, tone }: { n: number; label: string; sub?: string; tone?: "amber" }) {
  return (
    <div class={cx("kpi", tone && `kpi-${tone}`)}>
      <div class="kpi-n">{fmtInt(n)}</div>
      <div class="kpi-label">{label}</div>
      {sub && <div class="kpi-sub">{sub}</div>}
    </div>
  );
}

function NewPeople({ plan, seq }: { plan: ImportPlan; seq: number }) {
  if (!plan.newPeople.length) return <Empty title="No new people in this pull.">Everyone in the source systems is already in the database.</Empty>;
  return (
    <table class="tbl">
      <thead><tr><th>ID on save</th><th>Person</th><th>Job title and role profile</th><th>Unit</th><th>Linked from</th></tr></thead>
      <tbody>
        {plan.newPeople.map((p, i) => {
          const role = matchRole(p.title, data);
          return (
            <tr key={p.key}>
              <td class="nowrap num muted">{mrdId(seq + i + 1)}</td>
              <td>
                <div class="row gap-8"><Avatar name={p.name} size={28} /><b>{p.name}</b></div>
                {p.notes.map((n) => <div key={n} class="xs note-line">{n}</div>)}
              </td>
              <td>{p.title}<div class="xs muted">{role ? `${role.roleProfile} · ${familyById(role.family)?.name}` : "No role-profile rule matches yet; goes to review"}</div></td>
              <td class="nowrap">{p.unit}</td>
              <td class="small">{p.sources.join(" · ")}<div class="xs muted">KTP: enter manually</div></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Updates({ plan }: { plan: ImportPlan }) {
  if (!plan.updates.length) return <Empty title="No updates in this pull.">Every matched record already holds what the systems give.</Empty>;
  return (
    <table class="tbl">
      <thead><tr><th>Person</th><th>What changes</th></tr></thead>
      <tbody>
        {plan.updates.map((u) => (
          <tr key={u.id}>
            <td class="upd-person">
              <button type="button" class="person-link" onClick={() => openPerson(u.id)}>
                <Avatar name={u.name} size={28} />
                <span><b>{u.name}</b><span class="xs muted block">{u.id}</span></span>
              </button>
            </td>
            <td>
              <ul class="changes">{u.changes.map((c) => <li key={c}>{c}</li>)}</ul>
              {u.notes.map((n) => <div key={n} class="xs muted">{n}</div>)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Decisions({ plan, onAnswer, onUndo }: { plan: ImportPlan; onAnswer: (k: string, a: DecisionAnswer) => void; onUndo: (k: string) => void }) {
  if (!plan.decisions.length && !plan.decided.length) return <Empty title="No decisions needed.">Every incoming record matched with confidence or is clearly new.</Empty>;
  return (
    <div class="stack">
      {plan.decisions.map((d) => <DecisionCard key={d.key} d={d} onAnswer={onAnswer} />)}
      {plan.decided.map((d) => (
        <div key={d.key} class="decided">
          <Chip tone="teal">Decided</Chip>
          <span>{d.answer === "merge" ? `Same person: SAP SF ${d.key.slice(3)} merges into ${d.candidateId} ${byId(d.candidateId)?.name ?? ""}.` : `Different people: SAP SF ${d.key.slice(3)} is added as a new person.`}</span>
          <button type="button" class="link-btn small" onClick={() => onUndo(d.key)}>Undo</button>
        </div>
      ))}
    </div>
  );
}

function DecisionCard({ d, onAnswer }: { d: PendingDecision; onAnswer: (k: string, a: DecisionAnswer) => void }) {
  const cand = byId(d.candidateId);
  return (
    <div class="decision panel">
      <div class="decision-head">
        <div>
          <b>Is this the same person?</b>
          <p class="small muted">Name similarity {d.score.toFixed(2)} with the same date of birth. Between 0.80 and 0.95 a person decides; Meridian never merges on its own.</p>
        </div>
      </div>
      <table class="tbl cmp">
        <thead><tr><th>Field</th><th>In the database · {d.candidateId}</th><th>From SAP SF · {d.sf.userId}</th></tr></thead>
        <tbody>
          {d.diffs.map((f) => (
            <tr key={f.field} class={f.differs ? "differs" : ""}>
              <td class="muted">{f.field}</td><td>{f.ours}</td><td>{f.theirs}{f.differs && <span class="sr-only"> (differs)</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div class="row gap-8 decision-actions">
        <Button variant="primary" onClick={() => onAnswer(d.key, "merge")}>Same person: merge</Button>
        <Button onClick={() => onAnswer(d.key, "new")}>Different people: add as new</Button>
        {cand && <button type="button" class="link-btn small" onClick={() => openPerson(cand.id)}>Open {cand.id}</button>}
      </div>
    </div>
  );
}

function NotImportedTab({ plan }: { plan: ImportPlan }) {
  if (!plan.notImported.length) return <Empty title="Everything pulled was matched.">No record was left out.</Empty>;
  return (
    <table class="tbl">
      <thead><tr><th>System</th><th>Record</th><th>Why it was not imported</th></tr></thead>
      <tbody>{plan.notImported.map((n, i) => <tr key={i}><td class="nowrap">{n.system}</td><td><b>{n.name}</b></td><td>{n.reason}</td></tr>)}</tbody>
    </table>
  );
}
