import { Empty } from "../kit";
import type { Page } from "../lib/router";

export function Placeholder({ page }: { page: Page }) {
  return (
    <Empty title="This page is built in a later phase.">
      The route {`#/${page}`} is wired; its content comes after the Import page checkpoint.
    </Empty>
  );
}
