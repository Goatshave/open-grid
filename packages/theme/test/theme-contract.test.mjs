import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const themeSource = await readFile(new URL("../src/index.css", import.meta.url), "utf8");

test("exposes the stable base and semantic theme token contract", () => {
  for (const token of [
    "--og-font-family",
    "--og-border-color",
    "--og-border-subtle",
    "--og-border-strong",
    "--og-surface",
    "--og-surface-raised",
    "--og-surface-muted",
    "--og-surface-subtle",
    "--og-surface-hover",
    "--og-surface-selected",
    "--og-text",
    "--og-text-muted",
    "--og-text-subtle",
    "--og-accent",
    "--og-accent-hover",
    "--og-accent-soft",
    "--og-focus",
    "--og-danger",
    "--og-danger-soft",
    "--og-control-height",
    "--og-radius-lg",
    "--og-shadow-md",
    "--og-transition",
  ]) {
    assert.match(themeSource, new RegExp(`${token}:`), `missing theme token ${token}`);
  }

  assert.match(themeSource, /--og-border:\s*var\(--og-border-color\)/);
});

test("lets styled grids inherit root overrides while preserving standalone semantic defaults", () => {
  assert.match(themeSource, /:where\(\.og-grid, \[data-open-grid\]:not\(\.og-grid \[data-open-grid\]\)\)/);
  assert.match(themeSource, /:where\(\s*\[data-og-theme="dark"\],/);
  assert.match(themeSource, /\.og-grid\[data-og-theme="dark"\]/);
  assert.match(themeSource, /\[data-open-grid\]\[data-og-theme="dark"\]/);
  assert.match(themeSource, /\[data-og-theme="dark"\]\s+\.og-grid/);
  assert.match(themeSource, /\[data-og-theme="dark"\]\s+\[data-open-grid\]:not\(\.og-grid \[data-open-grid\]\)/);
  assert.match(themeSource, /color-scheme:\s*dark/);
  assert.match(themeSource, /--og-surface:\s*#171c25/);
  assert.match(themeSource, /--og-text:\s*#edf1f7/);
});
