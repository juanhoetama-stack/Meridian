// Person profile drawer (brief §8.4). Every level, score and path shows what it rests on.
import { useMemo, useRef, useState } from "preact/hooks";
import { data, familyById, skillName, unitById } from "../../data";
import { duplicateIndex, profileView, type ProfileView } from "../../engine/profile";
import { age, fmtDate, fmtService } from "../../engine/dates";
import { KKNI, LEVEL_NAMES } from "../../engine/levels";
import { AS_OF } from "../../config";
import { byId, currentVersion, deletePerson, openPerson, setKtp, toast, useApp } from "../../store/state";
import { Drawer } from "../overlays/drawer";
import { Avatar, Button, Chip, EvidenceBar, Strength } from "../kit";
import { FitButton, gapLine } from "./FitBreakdown";
import { compressImage, KTP_MAX } from "../lib/images";
import { href } from "../lib/router";
import { fmtDay, fmtStamp, cx } from "../lib/format";

export function PersonDrawer() {
  const app = useApp();
  const p = app.drawer ? byId(app.drawer) : undefined;
  const v = currentVersion();
  const view = useMemo(() => (p ? profileView(p, v, data, AS_OF, duplicateIndex(app.people)) : null), [p, v, app.people]);
  return (
    <Drawer open={!!view} label={p ? `Profile of ${p.name}` : "Profile"} onClose={() => openPerson(null)}>
      {view && <Profile key={view.person.id} view={view} />}
    </Drawer>
  );
}

function Profile({ view }: { view: ProfileView }) {
  const p = view.person;
  const v = currentVersion();
  const [ktpShown, setKtpShown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ktpInput = useRef<HTMLInputElement>(null);
  const [ktpError, setKtpError] = useState<string | null>(null);
  const unit = unitById(p.unit);
  const fam = view.role ? familyById(view.role.family) : undefined;
  const kkni = v ? v.params.kkni : true;
  const levelsNote = v && v.params.levels < 6 ? ` (shown on a ${v.params.levels}-level scale)` : "";

  const addKtp = async (file?: File | null) => {
    if (!file) return;
    try { setKtpError(null); await setKtp(p.id, await compressImage(file, KTP_MAX)); toast(`KTP image added to ${p.id}.`); }
    catch (e) { setKtpError((e as Error).message); }
  };
  const doDelete = async () => {
    await deletePerson(p.id);
    toast(`Record ${p.id} deleted. Its ID is never reused.`);
  };

  return (
    <article class="pd">
      <header class="pd-head">
        <Avatar name={p.name} photo={p.photo} size={56} />
        <div class="grow">
          <h2 class="pd-name">{p.name}</h2>
          <p class="pd-facts">
            <span>{p.id}</span><span>Age {age(p.dob, AS_OF)}</span><span>Born {p.pob}, {fmtDate(p.dob)}</span>
            <span>{p.unit} {unit?.name}</span><span>{fmtService(p.start, AS_OF)} service</span>
            <span>{p.edu.level}{p.edu.major ? ` ${p.edu.major}` : ""}</span>
          </p>
          <p class="pd-sk">Title on SK: <b>{p.title}</b> <span class="muted">(unchanged)</span></p>
          <div class="pd-chips">
            {p.src?.sf && <Chip tone="navy">SAP SF {p.src.sf}</Chip>}
            {p.src?.lms && <Chip tone="navy">Moodle {p.src.lms}</Chip>}
            {p.src?.perf && <Chip tone="navy">Unit tool {p.src.perf}</Chip>}
            <Chip>Payroll not accessed</Chip>
          </div>
        </div>
        <div class="pd-ktp">
          {p.ktp ? (
            <>
              <img src={p.ktp} alt={ktpShown ? "KTP image" : "KTP image, blurred"} class={cx("ktp-img", !ktpShown && "is-blurred")} />
              <button type="button" class="link-btn xs" onClick={() => setKtpShown(!ktpShown)}>{ktpShown ? "Hide KTP" : "Show KTP"}</button>
            </>
          ) : <div class="ktp-none">KTP not on file</div>}
        </div>
        <button type="button" class="icon-btn pd-close" aria-label="Close profile" data-autofocus onClick={() => openPerson(null)}>×</button>
      </header>

      <section class="trio" aria-label="Grade, domain and skill portfolio">
        <div class="trio-cell">
          <div class="trio-k">Grade</div>
          <div class="trio-v"><span class="serif trio-big">L{view.levelShown}</span> {LEVEL_NAMES[view.level]}{kkni && <span class="muted"> · KKNI {KKNI[view.level]}</span>}</div>
          <div class="row gap-8 wrap">
            {view.confidence === "evidenced" ? <Chip tone="teal">Backed by evidence</Chip> : <Chip tone="amber">Confirm by assessment</Chip>}
            <span class="small muted">Grade and pay unchanged</span>
          </div>
          <p class="trio-cap">{view.levelRule}{levelsNote}</p>
        </div>
        <div class="trio-cell">
          <div class="trio-k">Domain</div>
          {view.role ? (
            <>
              <div class="trio-v">{fam?.name}</div>
              <div class="small">{view.role.subFamily} · {view.role.roleProfile}</div>
              <p class="trio-cap">Band {view.role.band} {data.BANDS[view.role.band]?.n}. Title matched by role-profile rule {view.role.rule + 1}.</p>
            </>
          ) : (
            <>
              <div class="trio-v t-amber">Not mapped yet</div>
              <p class="trio-cap">No role-profile rule matches this title, so the record waits in the review queue.</p>
            </>
          )}
        </div>
        <div class="trio-cell">
          <div class="trio-k">Skill portfolio</div>
          <div class="trio-v">{view.graded.length} {view.graded.length === 1 ? "skill" : "skills"}</div>
          <EvidenceBar {...view.tiers} />
          <p class="trio-cap">{view.tiers.V} verified · {view.tiers.S} supported · {view.tiers.I} inferred. Work is assigned by verified skills, not by the seat.</p>
        </div>
      </section>

      <section class="pd-sec">
        <h3 class="pd-h">Skills</h3>
        {view.graded.length === 0 ? <p class="muted">No skills recorded yet. Add them through an assessment or a learning record.</p> : (
          <table class="tbl skills-tbl">
            <thead><tr><th>Skill</th><th>Proficiency</th><th>Strength</th><th>Source</th></tr></thead>
            <tbody>
              {view.graded.map((g, i) => (
                <tr key={i}>
                  <td>{skillName(g.skill.skill)}{!data.SKILLS[g.skill.skill] && <div class="xs t-amber">Not in taxonomy</div>}</td>
                  <td>{g.skill.prof}</td>
                  <td><Strength tier={g.tier} /></td>
                  <td class="small">{g.skill.src}{g.skill.date && <span class="muted"> · {g.skill.date}</span>}{g.reason && <div class="xs t-rust">{g.reason}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section class="pd-sec">
        <h3 class="pd-h">Certifications</h3>
        {view.certs.length === 0 ? <p class="muted small">None on file. Certificates are entered manually; no system provides them.</p> : (
          <ul class="certs">
            {view.certs.map(({ cert, status }) => (
              <li key={cert.number}>
                <Chip tone={status === "expired" ? "rust" : status === "expiring" ? "amber" : "teal"}>{status === "expired" ? "Expired" : status === "expiring" ? "Expiring" : "Valid"}</Chip>
                <span><b>{cert.type}</b> {cert.name} <span class="muted">· {cert.number} · valid until {cert.valid ? fmtDate(cert.valid) : "no date"}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="pd-sec">
        <h3 class="pd-h">Where this person can go</h3>
        <Paths view={view} />
      </section>

      <section class="pd-sec">
        <h3 class="pd-h">Where this record's data comes from</h3>
        <dl class="lineage">
          <dt>Identity</dt>
          <dd>{p.prov?.identity === "sf" ? <>SAP SuccessFactors {p.src?.sf}{p.prov.synced && <span class="muted"> · synced {fmtDate(p.prov.synced)}</span>}</> : p.seed ? "Sample record, entered manually" : `Manual entry · added ${fmtDay(p.created)}`}</dd>
          <dt>Skills</dt>
          <dd>{(() => { const n = p.skills.filter((s) => s.src === "LMS course passed (2023+)").length; return `${n} of ${p.skills.length} from learning records${p.src?.lms ? ` (Moodle ${p.src.lms})` : ""}; the rest from certificates, work orders, assessments and attestations`; })()}</dd>
          <dt>Ratings</dt>
          <dd>{p.perf?.length ? p.perf.map((r) => <div key={r.id + r.year}>{r.year} · {r.unit} · {String(r.raw)} on {r.scale} · z {r.z >= 0 ? "+" : ""}{r.z.toFixed(2)} <span class="muted">· supporting evidence only</span></div>) : <span class="muted">{["RU-4", "RU-6"].includes(p.unit) ? `${p.unit} has no rating API; appraisals are entered manually` : "No rating imported yet"}</span>}</dd>
          <dt>KTP</dt>
          <dd>
            {p.ktp ? "On file, blurred by default" : <span class="muted">Not on file</span>}
            {" "}<button type="button" class="link-btn small" onClick={() => ktpInput.current?.click()}>{p.ktp ? "Replace KTP image" : "Add KTP image"}</button>
            <input ref={ktpInput} type="file" accept="image/*" hidden onChange={(e) => addKtp((e.target as HTMLInputElement).files?.[0])} />
            {ktpError && <div class="field-error">{ktpError}</div>}
          </dd>
          <dt>Payroll</dt>
          <dd class="muted">Not accessed. Off-limits under the Ministry's data-governance policy.</dd>
        </dl>
      </section>

      <footer class="pd-foot">
        {!confirmDelete ? (
          <Button variant="ghost" size="sm" class="t-rust" onClick={() => setConfirmDelete(true)}>Delete record</Button>
        ) : (
          <div class="confirm-inline" role="group" aria-label="Confirm delete">
            <p>Delete {p.id} {p.name}? This cannot be undone, and the ID {p.id} will never be reused.</p>
            <div class="row gap-8">
              <Button variant="danger" size="sm" onClick={doDelete}>Delete {p.id}</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          </div>
        )}
        {v && <span class="xs muted">Paths from hierarchy v{v.n}, built {fmtStamp(v.built)}</span>}
      </footer>
    </article>
  );
}

const GUARDRAILS = [
  "Second offer first: a development pathway with a named destination band.",
  "Voluntary options only on request: enhanced early retirement or a supported external move.",
  "No viable path after two offers: development pool, grade and pay protected, productive work.",
  "Union observer on every placement panel, with a right of appeal.",
];

function Paths({ view }: { view: ProfileView }) {
  const p = view.person;
  const v = currentVersion();
  const ev = v?.params.evidence ?? "V";
  const k = view.path.kind;
  const retireAge = v?.params.retire ?? 56;

  if (k === "none" || k === "notIn") {
    return <p class="path-msg">Not in hierarchy {v ? `v${v.n}` : ""} yet, because the record was added after it was built. <a href={href("h/build")}>Rebuild the hierarchy</a> to see where this person can go.</p>;
  }
  if (k === "review") return <p class="path-msg">The title "{p.title}" matches no role-profile rule, so this record waits in the review queue. Placement waits until a person confirms the role profile.</p>;
  if (k === "out") return <p class="path-msg">Outside the scope of hierarchy v{v?.n} ({v?.params.scope === "F01" ? "Field Metering only" : ""}). Build with all families to include this record.</p>;
  if (k === "retire") return <p class="path-msg">Retires on schedule: age {age(p.dob, AS_OF)}, reaching the PKB retirement age of {retireAge} within 24 months. Counted in the 650 retirements, not as displaced; knowledge transfer to a crew lead before leaving.</p>;
  if (k === "stay") return <p class="path-msg">Stays as crew lead. At L{view.level} this person runs the exception-based work that remains after automation (about 30% of today's metering work).</p>;
  if (k === "mapped") {
    return <p class="path-msg">Not in the displaced work. {familyById(view.role!.family)?.name} is mapped, not acted on in the first 90 days: a destination, not a source.</p>;
  }

  const fits = view.topFits;
  const best = fits[0];
  return (
    <div class="paths">
      <div class="fit-list">
        {fits.map((f, i) => (
          <div key={f.band} class={cx("fit-row", i === 0 && "is-best")}>
            <FitButton fit={f} evidence={ev} />
            <div>
              <div><b>{f.band}</b> {data.BANDS[f.band].n}{i === 0 && k !== "low" && <span class="chip chip-navy fit-tag">Best path</span>}</div>
              <div class="xs muted">{gapLine(f)}</div>
            </div>
          </div>
        ))}
      </div>
      {view.assignment?.bridge && k !== "low" && <p class="small">Can start on the <b>B1 bridge</b> (installing smart meters while training), because meter installation is held at Working or above.</p>}

      {k === "low" ? (
        <div class="rights low">
          <p><b>Needs choices, never a forced exit.</b> Best fit is {best.pct}%, under the 40% medium threshold.</p>
          <ul>{GUARDRAILS.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      ) : (
        <div class="rights">
          <div class="rights-h">Decision rights for {best.band}</div>
          <ul class="rights-list">
            <li class="yes">Count in planning totals</li>
            <li class="yes">Invite to assessment</li>
            {best.placeNow
              ? <li class="yes">Place now: every gate skill is held on {ev === "S" ? "verified or supported" : "verified"} evidence</li>
              : <li class="no">Place now: not yet. Needs {skillName(best.missingCrit!.skill)} at {best.missingCrit!.prof}, {ev === "S" ? "verified or supported" : "verified"}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
