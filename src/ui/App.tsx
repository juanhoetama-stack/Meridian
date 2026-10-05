import { useEffect } from "preact/hooks";
import { useApp } from "../store/state";
import { useRoute, type Page } from "./lib/router";
import { Sidebar } from "./shell/Sidebar";
import { TopBar } from "./shell/TopBar";
import { PopoverHost } from "./overlays/popover";
import { ToastHost } from "./overlays/toast";
import { ImportPage } from "./pages/ImportPage";
import { Placeholder } from "./pages/Placeholder";
import { PersonDrawer } from "./profile/PersonDrawer";

export const META: Record<Page, { title: string; purpose: string }> = {
  "db/import": { title: "Import from systems", purpose: "Pull what the systems can give, check every change, then save. One record per person." },
  "db/add": { title: "Add manually", purpose: "Enter what no system gives through an API: KTP image, certificates, legacy assessments, RU-4 and RU-6 appraisals." },
  "db/view": { title: "View database", purpose: "Everyone in the database, what each claim rests on, and where the hierarchy places them." },
  "h/build": { title: "Build hierarchy", purpose: "Turn a plain instruction into a capability hierarchy. Every step shows the rule it used." },
  "h/view": { title: "View hierarchy", purpose: "Where the exposure sits, and where the people whose work is going away can go." },
};

export function App() {
  const app = useApp();
  const route = useRoute();
  const meta = META[route.page];

  useEffect(() => { document.title = `${meta.title} · Meridian`; }, [route.page]);
  useEffect(() => { document.querySelector<HTMLElement>(".main")?.scrollTo?.(0, 0); }, [route.page]);

  if (!app.ready) return <div class="boot" role="status">Opening the workforce database…</div>;

  return (
    <div class="shell">
      <a class="skip" href="#main">Skip to content</a>
      <Sidebar page={route.page} />
      <main class="main" id="main" tabIndex={-1}>
        <div class="content">
          <TopBar title={meta.title} purpose={meta.purpose} />
          {route.page === "db/import" ? <ImportPage /> : <Placeholder page={route.page} />}
        </div>
      </main>
      <PersonDrawer />
      <PopoverHost />
      <ToastHost />
    </div>
  );
}
