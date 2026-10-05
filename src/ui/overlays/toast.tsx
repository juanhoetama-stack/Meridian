import { dismissToast, useApp } from "../../store/state";

export function ToastHost() {
  const { toast } = useApp();
  return (
    <div class="toast-host" role="status" aria-live="polite">
      {toast && (
        <div class="toast" key={toast.id}>
          <span>{toast.text}</span>
          {toast.action && (
            <button type="button" class="toast-action" onClick={() => { toast.action!.run(); dismissToast(); }}>{toast.action.label}</button>
          )}
          <button type="button" class="icon-btn" aria-label="Dismiss" onClick={dismissToast}>×</button>
        </div>
      )}
    </div>
  );
}
