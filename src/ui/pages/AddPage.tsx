// 2 · Add manually (brief §8.2): what no system gives through an API.
import type { ComponentChildren, JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import type { CertType, EduLevel, Person, Prof, Tier, UnitId } from "../../engine/types";
import { data, familyById, skillKey, unitById } from "../../data";
import { matchRole } from "../../engine/roles";
import { normName } from "../../engine/names";
import { certStatus, fmtService } from "../../engine/dates";
import { AS_OF } from "../../config";
import { addPerson, nextId, openPerson, toast, useApp } from "../../store/state";
import { Button, Strength } from "../kit";
import { DropZone } from "../kit/DropZone";
import { KTP_MAX, PHOTO_MAX } from "../lib/images";
import { navigate } from "../lib/router";
import { cx } from "../lib/format";

interface SkillRow { skill: string; prof: Prof; src: string }
interface CertRow { type: CertType | ""; name: string; number: string; valid: string }
interface Form {
  name: string; pob: string; dob: string; photo: string | null; ktp: string | null;
  eduLevel: EduLevel | ""; eduMajor: string; title: string; unit: UnitId | ""; start: string;
  skills: SkillRow[]; certs: CertRow[];
}

const emptySkill = (): SkillRow => ({ skill: "", prof: "Working", src: "Supervisor attestation" });
const emptyCert = (): CertRow => ({ type: "", name: "", number: "", valid: "" });
const EMPTY: Form = {
  name: "", pob: "", dob: "", photo: null, ktp: null, eduLevel: "", eduMajor: "", title: "", unit: "", start: "",
  skills: [emptySkill()], certs: [],
};

type Errors = Record<string, string>;

function validate(f: Form): Errors {
  const e: Errors = {};
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!f.name.trim()) e.name = "Enter the full name exactly as written on the KTP.";
  if (!f.pob.trim()) e.pob = "Enter the place of birth as written on the KTP.";
  if (!f.dob) e.dob = "Enter the date of birth.";
  else if (!iso.test(f.dob)) e.dob = "Use a full date, for example 1985-04-17.";
  else if (f.dob > AS_OF) e.dob = "The date of birth can't be in the future.";
  if (!f.title.trim()) e.title = "Enter the job title as it appears on the SK.";
  if (!f.unit) e.unit = "Choose the regional unit.";
  if (!f.start) e.start = "Enter the start date.";
  else if (f.dob && f.start <= f.dob) e.start = `The start date must be after the date of birth (${f.dob}).`;
  else if (f.start > AS_OF) e.start = "The start date can't be in the future.";
  f.skills.forEach((s, i) => {
    if (!s.skill.trim() && i > 0) e[`skill${i}`] = "Name the skill, or remove this row.";
  });
  f.certs.forEach((c, i) => {
    const any = c.type || c.name || c.number || c.valid;
    if (!any) return;
    if (!c.type) e[`certType${i}`] = "Choose the certificate type.";
    if (!c.number.trim()) e[`certNo${i}`] = "Enter the certificate number.";
  });
  return e;
}

/** Live strength: certificate-sourced skills count as inferred without a valid certificate of that type below. */
function liveTier(src: string, certs: CertRow[]): { tier: Tier; note?: string } {
  const base = data.SOURCES[src] ?? "I";
  const type = src === "SKTTK certificate" ? "SKTTK" : src === "BNSP certificate" ? "BNSP" : null;
  if (!type) return { tier: base };
  const ok = certs.some((c) => c.type === type && c.number.trim() && certStatus(c.valid || undefined, AS_OF) !== "expired");
  return ok ? { tier: base } : { tier: "I", note: `Counts as inferred until a valid ${type} certificate is added below.` };
}

export function AddPage() {
  const app = useApp();
  const [f, setF] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [dupAck, setDupAck] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const errors = useMemo(() => validate(f), [f]);
  const show = (k: string) => (submitted || touched[k]) && errors[k];
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });
  const blur = (k: string) => () => setTouched({ ...touched, [k]: true });

  const titles = useMemo(() => [...new Set(app.people.map((p) => p.title))].sort(), [app.people]);
  const role = f.title.trim() ? matchRole(f.title, data) : null;
  const dupKey = f.name.trim() && f.dob ? `${normName(f.name)}|${f.dob}` : "";
  const dups = dupKey ? app.people.filter((p) => `${normName(p.name)}|${p.dob}` === dupKey) : [];
  const service = f.start && !errors.start ? fmtService(f.start, AS_OF) : null;

  const save = async (ev: Event) => {
    ev.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(".is-invalid, [aria-invalid='true']")?.focus());
      return;
    }
    if (dups.length && dupAck !== dupKey) { setDupAck(dupKey); return; }
    setSaving(true);
    const draft: Omit<Person, "id" | "created"> = {
      name: f.name.trim().replace(/\s+/g, " "), pob: f.pob.trim(), dob: f.dob,
      edu: { level: (f.eduLevel || "SMA") as EduLevel, major: f.eduMajor.trim() },
      title: f.title.trim(), unit: f.unit as UnitId, start: f.start,
      skills: f.skills.filter((s) => s.skill.trim()).map((s) => ({ skill: skillKey(s.skill) ?? s.skill.trim(), prof: s.prof, src: s.src, date: AS_OF.slice(0, 7) })),
      certs: f.certs.filter((c) => c.type && c.number.trim()).map((c) => ({ type: c.type as CertType, name: c.name.trim(), number: c.number.trim(), valid: c.valid || undefined })),
      photo: f.photo, ktp: f.ktp, prov: { identity: "manual" }, seed: false,
    };
    const p = await addPerson(draft);
    setSaving(false);
    setF(EMPTY); setTouched({}); setSubmitted(false); setDupAck(null);
    window.scrollTo?.(0, 0);
    document.querySelector(".main")?.scrollTo?.(0, 0);
    toast(`Employee ${p.id} saved.`, { label: "View record", run: () => { navigate("db/view"); openPerson(p.id); } });
  };

  const field = (k: string, label: string, input: JSX.Element, hint?: ComponentChildren, required = true) => (
    <div class="field">
      <label for={`f-${k}`}>{label}{required && <span class="req" aria-hidden="true"> *</span>}</label>
      {input}
      {show(k) ? <div class="field-error" id={`e-${k}`}>{errors[k]}</div> : hint ? <div class="field-hint">{hint}</div> : null}
    </div>
  );
  const inp = (k: keyof Form & string, type: "text" | "date" = "text", extra: Record<string, unknown> = {}) => (
    <input
      id={`f-${k}`} type={type as "text"} class={cx("input", show(k) && "is-invalid")} value={f[k] as string}
      aria-invalid={show(k) ? "true" : undefined} aria-describedby={show(k) ? `e-${k}` : undefined}
      onInput={(e) => set(k, (e.target as HTMLInputElement).value as never)} onBlur={blur(k)} {...extra}
    />
  );

  return (
    <form class="add" onSubmit={save} noValidate>
      <div class="add-main">
        <section class="panel add-sec" aria-labelledby="sec-id">
          <h2 class="add-h" id="sec-id">Identity <span class="muted add-h-sub">as on the KTP</span></h2>
          <div class="grid-2">
            {field("name", "Full name", inp("name", "text", { autoComplete: "off" }))}
            {field("pob", "Place of birth", inp("pob"))}
            {field("dob", "Date of birth", inp("dob", "date", { max: AS_OF }))}
            <div />
            <div class="field">
              <span class="label">Photo <span class="muted">optional</span></span>
              <DropZone id="f-photo" label="Photo" hint="Drop an image or click. Compressed to 480 px." maxPx={PHOTO_MAX} value={f.photo} onChange={(v) => set("photo", v)} />
            </div>
            <div class="field">
              <span class="label">KTP image</span>
              <DropZone id="f-ktp" label="KTP image" hint="Drop an image or click. Compressed to 900 px, shown blurred." maxPx={KTP_MAX} value={f.ktp} onChange={(v) => set("ktp", v)} blur />
              {!f.ktp && <div class="field-hint">You can save without it; the record is flagged "KTP not on file" until it is added.</div>}
            </div>
          </div>
        </section>

        <section class="panel add-sec" aria-labelledby="sec-emp">
          <h2 class="add-h" id="sec-emp">Employment</h2>
          <div class="grid-2">
            <div class="field">
              <label for="f-edu">Education <span class="muted">optional</span></label>
              <div class="row gap-8">
                <select id="f-edu" class="select edu-level" value={f.eduLevel} onChange={(e) => set("eduLevel", (e.target as HTMLSelectElement).value as EduLevel)}>
                  <option value="">Level</option>
                  {data.EDU_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <input class="input" aria-label="Major" placeholder="Major, e.g. Teknik Elektro" value={f.eduMajor} onInput={(e) => set("eduMajor", (e.target as HTMLInputElement).value)} />
              </div>
            </div>
            {field("title", "Job title", inp("title", "text", { list: "titles", autoComplete: "off" }),
              f.title.trim()
                ? role
                  ? <span>Maps to <b>{role.roleProfile}</b> · {familyById(role.family)?.name}</span>
                  : <span class="t-amber">No role-profile rule matches yet; the record will go to review.</span>
                : "Kept as a label, exactly as on the SK.")}
            <datalist id="titles">{titles.map((t) => <option key={t} value={t} />)}</datalist>
            {field("unit", "Regional unit",
              <select id="f-unit" class={cx("select", show("unit") && "is-invalid")} value={f.unit} aria-invalid={show("unit") ? "true" : undefined}
                onChange={(e) => set("unit", (e.target as HTMLSelectElement).value as UnitId)} onBlur={blur("unit")}>
                <option value="">Choose a unit</option>
                {data.UNITS.map((u) => <option key={u.id} value={u.id}>{u.id} · {u.name}</option>)}
              </select>)}
            {field("start", "Start date", inp("start", "date", { max: AS_OF }), service ? <span>Length of service: <b>{service}</b></span> : "Length of service is always computed from this date.")}
          </div>
        </section>

        <section class="panel add-sec" aria-labelledby="sec-sk">
          <div class="add-h-row">
            <h2 class="add-h" id="sec-sk">Skills</h2>
            <span class="small muted">Strength comes from the evidence source, not from the proficiency claimed.</span>
          </div>
          <datalist id="skills">{Object.values(data.SKILLS).map((s) => <option key={s.n} value={s.n} />)}</datalist>
          <div class="rows">
            <div class="rows-head skill-grid" aria-hidden="true"><span>Skill</span><span>Proficiency</span><span>Evidence source</span><span>Strength</span><span /></div>
            {f.skills.map((s, i) => {
              const lt = liveTier(s.src, f.certs);
              const off = s.skill.trim() && !skillKey(s.skill);
              const upd = (patch: Partial<SkillRow>) => set("skills", f.skills.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div class="skill-grid row-item" key={i}>
                  <div>
                    <input class={cx("input", show(`skill${i}`) && "is-invalid")} list="skills" aria-label={`Skill ${i + 1}`} placeholder="Start typing a skill" value={s.skill} onInput={(e) => upd({ skill: (e.target as HTMLInputElement).value })} />
                    {off && <div class="field-hint t-amber">Not in taxonomy: kept, but it cannot count toward a band.</div>}
                    {show(`skill${i}`) && <div class="field-error">{errors[`skill${i}`]}</div>}
                  </div>
                  <select class="select" aria-label={`Proficiency for skill ${i + 1}`} value={s.prof} onChange={(e) => upd({ prof: (e.target as HTMLSelectElement).value as Prof })}>
                    {data.PROF.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <select class="select" aria-label={`Evidence source for skill ${i + 1}`} value={s.src} onChange={(e) => upd({ src: (e.target as HTMLSelectElement).value })}>
                    {Object.keys(data.SOURCES).map((k) => <option key={k}>{k}</option>)}
                  </select>
                  <div class="strength-cell"><Strength tier={lt.tier} />{lt.note && <div class="field-hint">{lt.note}</div>}</div>
                  <button type="button" class="icon-btn" aria-label={`Remove skill ${i + 1}`} onClick={() => set("skills", f.skills.filter((_, j) => j !== i))}>×</button>
                </div>
              );
            })}
          </div>
          <Button size="sm" variant="ghost" onClick={() => set("skills", [...f.skills, emptySkill()])}>Add a skill</Button>
        </section>

        <section class="panel add-sec" aria-labelledby="sec-cert">
          <div class="add-h-row">
            <h2 class="add-h" id="sec-cert">Certifications</h2>
            <span class="small muted">SKTTK and BNSP certificates turn certificate-sourced skills into verified evidence.</span>
          </div>
          {f.certs.length > 0 && (
            <div class="rows">
              <div class="rows-head cert-grid" aria-hidden="true"><span>Type</span><span>Name or competency unit</span><span>Number</span><span>Valid until</span><span /></div>
              {f.certs.map((c, i) => {
                const upd = (patch: Partial<CertRow>) => set("certs", f.certs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                const st = c.valid ? certStatus(c.valid, AS_OF) : null;
                return (
                  <div class="cert-grid row-item" key={i}>
                    <div>
                      <select class={cx("select", show(`certType${i}`) && "is-invalid")} aria-label={`Certificate ${i + 1} type`} value={c.type} onChange={(e) => upd({ type: (e.target as HTMLSelectElement).value as CertType })}>
                        <option value="">Type</option>
                        {["SKTTK", "BNSP", "K3", "Other"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                      {show(`certType${i}`) && <div class="field-error">{errors[`certType${i}`]}</div>}
                    </div>
                    <input class="input" aria-label={`Certificate ${i + 1} name`} placeholder="e.g. Pemasangan APP tegangan rendah" value={c.name} onInput={(e) => upd({ name: (e.target as HTMLInputElement).value })} />
                    <div>
                      <input class={cx("input", show(`certNo${i}`) && "is-invalid")} aria-label={`Certificate ${i + 1} number`} placeholder="SKTTK-2025-0001" value={c.number} onInput={(e) => upd({ number: (e.target as HTMLInputElement).value })} />
                      {show(`certNo${i}`) && <div class="field-error">{errors[`certNo${i}`]}</div>}
                    </div>
                    <div>
                      <input class="input" type="date" aria-label={`Certificate ${i + 1} valid until`} value={c.valid} onInput={(e) => upd({ valid: (e.target as HTMLInputElement).value })} />
                      {st && st !== "valid" && <div class={cx("field-hint", st === "expired" ? "t-rust" : "t-amber")}>{st === "expired" ? "Expired" : "Expires within 90 days"}</div>}
                    </div>
                    <button type="button" class="icon-btn" aria-label={`Remove certificate ${i + 1}`} onClick={() => set("certs", f.certs.filter((_, j) => j !== i))}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          <Button size="sm" variant="ghost" onClick={() => set("certs", [...f.certs, emptyCert()])}>Add a certificate</Button>
        </section>
      </div>

      <aside class="add-side" aria-label="Save">
        <div class="panel id-box">
          <div class="small muted">Employee ID, generated on save</div>
          <div class="id-value">{nextId()}</div>
          <div class="xs muted">Unique, never reused, even after a delete.</div>
        </div>

        <div class="panel add-check">
          <h3 class="h3">Before you save</h3>
          <ul class="checks">
            <li class={f.title.trim() ? (role ? "ok" : "warn") : ""}>{f.title.trim() ? (role ? `Role profile: ${role.roleProfile}` : "Title goes to the review queue") : "Job title not entered yet"}</li>
            <li class={f.unit ? "ok" : ""}>{f.unit ? `${f.unit} · ${unitById(f.unit)?.name}` : "Unit not chosen yet"}</li>
            <li class={f.ktp ? "ok" : "warn"}>{f.ktp ? "KTP image on file, blurred by default" : "KTP not on file"}</li>
            <li class={dups.length ? "warn" : f.name && f.dob ? "ok" : ""}>{dups.length ? `Same name and date of birth as ${dups.map((d) => d.id).join(", ")}` : f.name && f.dob ? "No record with the same name and date of birth" : "Duplicate check runs on name + date of birth"}</li>
          </ul>
        </div>

        {dups.length > 0 && dupAck === dupKey && (
          <div class="note note-amber" role="alert">
            <p><b>Possible duplicate.</b> {dups.map((d) => `${d.id} ${d.name}`).join(", ")} has the same name and date of birth. Check that record, or press Save employee again to keep both.</p>
            <button type="button" class="link-btn small" onClick={() => { navigate("db/view"); openPerson(dups[0].id); }}>Open {dups[0].id}</button>
          </div>
        )}
        {submitted && Object.keys(errors).length > 0 && (
          <div class="note note-rust" role="alert"><p>{Object.keys(errors).length === 1 ? "One field needs" : `${Object.keys(errors).length} fields need`} attention before saving. Each one says what to fix.</p></div>
        )}

        <Button variant="primary" class="save-btn" disabled={saving} onClick={save as never}>{saving ? "Saving…" : "Save employee"}</Button>
        <p class="xs muted">No salary, payroll or raw NIK is collected here, by design.</p>
      </aside>
    </form>
  );
}
