// Image drop zone: drag-drop or click, keyboard operable (Enter/Space), compressed on arrival.
import { useRef, useState } from "preact/hooks";
import { compressImage } from "../lib/images";
import { cx } from "../lib/format";

interface Props {
  id: string;
  label: string;
  hint: string;
  maxPx: number;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  blur?: boolean;          // KTP images are blurred by default
}

export function DropZone({ id, label, hint, maxPx, value, onChange, blur }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  const take = async (file?: File | null) => {
    if (!file) return;
    try { setError(null); onChange(await compressImage(file, maxPx)); setShown(false); }
    catch (e) { setError((e as Error).message); }
  };

  if (value) {
    return (
      <div class="dz-filled">
        <img src={value} alt={blur && !shown ? `${label}, blurred` : label} class={cx("dz-img", blur && !shown && "is-blurred")} />
        <div class="dz-meta">
          <span class="small"><b>{label}</b> added</span>
          <div class="row gap-12">
            {blur && <button type="button" class="link-btn small" onClick={() => setShown(!shown)}>{shown ? "Hide" : "Show"}</button>}
            <button type="button" class="link-btn small" onClick={() => onChange(null)}>Remove</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        id={id} role="button" tabIndex={0} aria-label={`${label}: drop an image or press Enter to choose a file`}
        class={cx("dz", over && "is-over")}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer?.files?.[0]); }}
      >
        <span class="dz-title">{label}</span>
        <span class="dz-hint">{hint}</span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take((e.target as HTMLInputElement).files?.[0])} />
      {error && <div class="field-error" role="alert">{error}</div>}
    </div>
  );
}
