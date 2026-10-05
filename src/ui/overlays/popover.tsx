// One popover at a time. Any [data-prov] opens its PROV entry; callers can open custom content (fit breakdowns).
// Stays inside the viewport, closes on outside click or Esc, and returns focus to the trigger (brief §9).
import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { data } from "../../data";
import { Mark } from "../kit";

interface Pop { anchor: HTMLElement; title: string; body: ComponentChildren; wide?: boolean }
let current: Pop | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function openPopover(anchor: HTMLElement, title: string, body: ComponentChildren, wide = false) {
  if (current?.anchor === anchor) { closePopover(); return; }
  current = { anchor, title, body, wide };
  emit();
}

export function closePopover(restoreFocus = true) {
  const a = current?.anchor;
  current = null;
  emit();
  if (restoreFocus && a && document.contains(a)) a.focus();
}

export function ProvBody({ k }: { k: string }) {
  const p = data.PROV[k];
  if (!p) return <p>No provenance recorded.</p>;
  return (
    <div class="prov-body">
      <p class="prov-ev"><Mark ev={p.ev} label /></p>
      <dl>
        <dt>Rests on</dt><dd>{p.rests}</dd>
        <dt>How it is calculated</dt><dd>{p.how}</dd>
      </dl>
    </div>
  );
}

/** Delegated handler: any element with data-prov opens its popover. */
export function installProvHandler() {
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-prov]");
    if (!el) return;
    const k = el.dataset.prov!;
    openPopover(el, data.PROV[k]?.t ?? "Provenance", <ProvBody k={k} />);
  });
}

export function PopoverHost() {
  const [, setTick] = useState(0);
  const force = () => setTick((t) => t + 1);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => { subs.add(force); return () => { subs.delete(force); }; }, []);

  useLayoutEffect(() => {
    if (!current || !ref.current) { setPos(null); return; }
    const place = () => {
      if (!current || !ref.current) return;
      const a = current.anchor.getBoundingClientRect();
      const r = ref.current.getBoundingClientRect();
      const m = 12;
      let left = Math.min(Math.max(m, a.left), innerWidth - r.width - m);
      let top = a.bottom + 8;
      if (top + r.height > innerHeight - m) top = Math.max(m, a.top - r.height - 8);
      left = Math.max(m, left);
      setPos({ top, left });
    };
    place();
    ref.current.focus();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => { removeEventListener("resize", place); removeEventListener("scroll", place, true); };
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || current?.anchor.contains(t)) return;
      closePopover(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closePopover(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [current]);

  if (!current) return null;
  return (
    <div
      ref={ref} class={`popover${current.wide ? " popover-wide" : ""}`} role="dialog" aria-label={current.title} tabIndex={-1}
      style={pos ? { top: `${pos.top}px`, left: `${pos.left}px` } : { top: "0px", left: "0px", visibility: "hidden" }}
    >
      <div class="popover-head">
        <h3>{current.title}</h3>
        <button type="button" class="icon-btn" aria-label="Close" onClick={() => closePopover()}>×</button>
      </div>
      {current.body}
    </div>
  );
}
