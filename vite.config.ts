import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained dist/index.html: JS, CSS and fonts (base64 woff2) inlined.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: "es2020",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
  },
  test: {
    include: ["tests/engine/**/*.test.ts"],
    environment: "node",
  },
});
