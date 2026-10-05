// Post-build guard: one file, no external references, under the size budget (SRS T-21, NF-1, NF-2).
import { readdirSync, readFileSync, statSync } from "node:fs";

const files = readdirSync("dist");
const fail = (msg) => { console.error(`check-build: ${msg}`); process.exit(1); };

if (files.length !== 1 || files[0] !== "index.html") fail(`expected only dist/index.html, found: ${files.join(", ")}`);
const html = readFileSync("dist/index.html", "utf8");
const external = html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+|url\(\s*["']?https?:\/\/[^)]+/gi);
if (external) fail(`external references found: ${external.slice(0, 3).join(" | ")}`);
const kb = statSync("dist/index.html").size / 1024;
if (kb >= 1024) fail(`dist/index.html is ${kb.toFixed(0)} KB (budget < 1024 KB)`);
console.log(`check-build: ok · dist/index.html ${kb.toFixed(0)} KB`);
