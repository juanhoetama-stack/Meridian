// Small, token-driven building blocks. One visual language for marks, evidence and status.
import type { ButtonHTMLAttributes, ComponentChildren } from "preact";
import type { EvMark, Tier } from "../../engine/types";
import { cx } from "../lib/format";

const EV_LABEL: Record<EvMark, string> = { m: "Measured", i: "Inferred", a: "Assumed" };
export const TIER_LABEL: Record<Tier, string> = { V: "Verified", S: "Supported", I: "Inferred" };

/** ● Measured, ◐ Inferred, ○ Assumed, drawn in CSS (brief §9). */
export function Mark({ ev, label = false }: { ev: EvMark; label?: boolean }) {
  return (
    <span class="mark-wrap">
      <span class={`mark mark-${ev}`} role="img" aria-label={EV_LABEL[ev]} title={EV_LABEL[ev]} />
      {label && <span class="mark-label">{EV_LABEL[ev]}</span>}
    </span>
  );
}

/** Three-bar strength signal: 3 = Verified, 2 = Supported, 1 = Inferred, always with a text label. */
export function Strength({ tier, label = true }: { tier: Tier; label?: boolean }) {
  const n = tier === "V" ? 3 : tier === "S" ? 2 : 1;
  return (
    <span class={`strength strength-${tier}`}>
      <span class="bars" aria-hidden="true">
        {[1, 2, 3].map((i) => <i key={i} class={i <= n ? "on" : ""} />)}
      </span>
      {label ? <span class="strength-label">{TIER_LABEL[tier]}</span> : <span class="sr-only">{TIER_LABEL[tier]}</span>}
    </span>
  );
}

export function EvidenceBar({ V, S, I }: { V: number; S: number; I: number }) {
  const total = V + S + I;
  if (!total) return <span class="faint">No skills</span>;
  return (
    <span class="evbar" aria-label={`${V} verified, ${S} supported, ${I} inferred`}>
      <span class="evbar-track" aria-hidden="true">
        {V > 0 && <i class="v" style={{ flexGrow: V }} />}
        {S > 0 && <i class="s" style={{ flexGrow: S }} />}
        {I > 0 && <i class="i" style={{ flexGrow: I }} />}
      </span>
      <span class="evbar-nums" aria-hidden="true"><b class="t-v">{V}</b>·<b class="t-s">{S}</b>·<b class="t-i">{I}</b></span>
    </span>
  );
}

type Tone = "neutral" | "navy" | "teal" | "rust" | "amber" | "muted";
export function Chip({ tone = "neutral", children, title }: { tone?: Tone; children: ComponentChildren; title?: string }) {
  return <span class={`chip chip-${tone}`} title={title}>{children}</span>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "secondary", size = "md", class: klass, ...rest }: BtnProps) {
  return <button type="button" {...rest} class={cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", klass as string)} />;
}

export interface TabDef { id: string; label: ComponentChildren; count?: number }
export function Tabs({ tabs, value, onChange, label, idPrefix }: { tabs: TabDef[]; value: string; onChange: (id: string) => void; label: string; idPrefix: string }) {
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = tabs.length - 1;
    if (j >= 0) {
      e.preventDefault();
      onChange(tabs[j].id);
      requestAnimationFrame(() => document.getElementById(`${idPrefix}-tab-${tabs[j].id}`)?.focus());
    }
  };
  return (
    <div class="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => (
        <button
          key={t.id} type="button" role="tab" id={`${idPrefix}-tab-${t.id}`} aria-selected={t.id === value}
          aria-controls={`${idPrefix}-panel-${t.id}`} tabIndex={t.id === value ? 0 : -1}
          class={cx("tab", t.id === value && "is-active")} onClick={() => onChange(t.id)}
        >
          {t.label}{t.count !== undefined && <span class="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ idPrefix, id, children }: { idPrefix: string; id: string; children: ComponentChildren }) {
  return <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0} class="tabpanel">{children}</div>;
}

/** A number whose provenance opens on click (data-prov → data.PROV). */
export function Prov({ k, children, class: klass }: { k: string; children: ComponentChildren; class?: string }) {
  return <button type="button" class={cx("prov", klass)} data-prov={k} aria-haspopup="dialog">{children}</button>;
}

export function Avatar({ name, photo, size = 32 }: { name: string; photo?: string | null; size?: number }) {
  const ini = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  const text = ini.length ? (ini[0][0] + (ini.length > 1 ? ini[ini.length - 1][0] : "")).toUpperCase() : "?";
  return photo
    ? <img class="avatar" src={photo} alt="" width={size} height={size} />
    : <span class="avatar" style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px` }} aria-hidden="true">{text}</span>;
}

export function Empty({ title, children }: { title: string; children?: ComponentChildren }) {
  return <div class="empty"><p class="empty-title">{title}</p>{children && <div class="empty-body">{children}</div>}</div>;
}

export function Note({ tone = "navy", children }: { tone?: "navy" | "amber" | "rust"; children: ComponentChildren }) {
  return <div class={`note note-${tone}`}>{children}</div>;
}
