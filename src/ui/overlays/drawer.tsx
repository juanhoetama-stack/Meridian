// Side drawer: role=dialog, focus moves in and is trapped, Esc closes, focus returns (SRS PR-1).
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

export function Drawer({ open, label, onClose, children }: { open: boolean; label: string; onClose: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement;
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus() ?? ref.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".popover")) { e.preventDefault(); onClose(); }
      if (e.key === "Tab" && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')]
          .filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const r = returnTo.current;
      if (r && document.contains(r)) r.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div class="drawer-layer">
      <div class="drawer-scrim" onClick={onClose} />
      <div ref={ref} class="drawer" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
