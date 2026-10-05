// Hash routing (brief §3): #/db/import, #/db/add, #/db/view, #/h/build, #/h/view. Default #/h/view.
import { useEffect, useState } from "preact/hooks";

export type Page = "db/import" | "db/add" | "db/view" | "h/build" | "h/view";
export const PAGES: Page[] = ["db/import", "db/add", "db/view", "h/build", "h/view"];
export interface Route { page: Page; query: URLSearchParams }

export function parseHash(hash: string): Route | null {
  const m = /^#\/([^?]*)(?:\?(.*))?$/.exec(hash);
  if (!m || !PAGES.includes(m[1] as Page)) return null;
  return { page: m[1] as Page, query: new URLSearchParams(m[2] ?? "") };
}

export function href(page: Page, query?: Record<string, string>): string {
  const q = query ? new URLSearchParams(query).toString() : "";
  return `#/${page}${q ? "?" + q : ""}`;
}

export function navigate(page: Page, query?: Record<string, string>) {
  location.hash = href(page, query);
}

export function useRoute(): Route {
  const read = () => {
    const r = parseHash(location.hash);
    if (!r) { history.replaceState(null, "", href("h/view")); return parseHash(href("h/view"))!; }
    return r;
  };
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}
