// Person profile drawer. Phase 4 ships the frame; the full evidence profile lands in Phase 6.
import { byId, openPerson, useApp } from "../../store/state";
import { Drawer } from "../overlays/drawer";
import { Avatar } from "../kit";

export function PersonDrawer() {
  const { drawer } = useApp();
  const p = drawer ? byId(drawer) : undefined;
  return (
    <Drawer open={!!p} label={p ? `Profile of ${p.name}` : "Profile"} onClose={() => openPerson(null)}>
      {p && (
        <div class="pd">
          <div class="pd-head">
            <Avatar name={p.name} photo={p.photo} size={48} />
            <div class="grow">
              <h2 class="pd-name">{p.name}</h2>
              <div class="muted small">{p.id} · {p.unit} · {p.title}</div>
            </div>
            <button type="button" class="icon-btn" aria-label="Close profile" data-autofocus onClick={() => openPerson(null)}>×</button>
          </div>
          <p class="muted small">Full profile (evidence, fits and data lineage) is built in Phase 6.</p>
        </div>
      )}
    </Drawer>
  );
}
