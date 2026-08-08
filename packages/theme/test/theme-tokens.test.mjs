import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createOpenGridThemeCssText,
  createOpenGridThemeStyle,
  openGridThemeTokens,
} from "../dist/tokens.js";

const themeSource = await readFile(new URL("../src/index.css", import.meta.url), "utf8");

test("keeps the typed token map aligned with every declared CSS custom property", () => {
  const declaredProperties = [...themeSource.matchAll(/(--og-[a-z0-9-]+):/gu)].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(Object.values(openGridThemeTokens))].sort(),
    [...new Set(declaredProperties)].sort(),
  );
});

test("maps product theme keys to stable CSS custom properties", () => {
  assert.deepEqual(
    createOpenGridThemeStyle({
      accent: " #155eef ",
      focus: "#0e9384",
      rowHeight: "36px",
    }),
    {
      "--og-accent": "#155eef",
      "--og-focus": "#0e9384",
      "--og-row-height": "36px",
    },
  );
  assert.equal(openGridThemeTokens.surfaceSelected, "--og-surface-selected");
});

test("serializes product themes for string-only style attributes", () => {
  assert.equal(
    createOpenGridThemeCssText({ accent: "#155eef", radiusLarge: "6px" }),
    "--og-accent: #155eef; --og-radius-lg: 6px",
  );
});

test("rejects unknown, empty, and declaration-breaking values", () => {
  assert.throws(
    () => createOpenGridThemeStyle({ typoAccent: "red" }),
    /Unknown Open Grid theme token: typoAccent/,
  );
  assert.throws(
    () => createOpenGridThemeStyle({ accent: " " }),
    /theme token accent must be a non-empty string/,
  );
  assert.throws(
    () => createOpenGridThemeCssText({ accent: "red; color: transparent" }),
    /cannot contain CSS declaration delimiters/,
  );
});
