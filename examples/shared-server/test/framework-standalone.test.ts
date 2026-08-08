import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import {
  getStandaloneServerExportAppFile,
  getStandaloneServerExportAppManifest,
  getStandaloneServerExportAppManifests,
  validateStandaloneServerExportAppManifest,
  type StandaloneServerExportAppManifest,
} from "../src/framework-standalone-examples/shared";

describe("standalone server framework export app manifests", () => {
  test("defines runnable app scaffolds for Next.js, Nuxt, and SvelteKit", () => {
    const manifests = getStandaloneServerExportAppManifests();

    expect(manifests.map((manifest) => manifest.framework)).toEqual(["nextjs", "nuxt", "sveltekit"]);

    for (const manifest of manifests) {
      const validation = validateStandaloneServerExportAppManifest(manifest);
      const packageFile = getRequiredFile(manifest, "package.json");

      expect(validation).toEqual({
        framework: manifest.framework,
        ready: true,
        missingFiles: [],
        missingScripts: [],
        missingDependencies: [],
      });
      expect(manifest.commands).toEqual({
        install: "pnpm install",
        dev: "pnpm dev",
        build: "pnpm build",
        start: "pnpm start",
      });
      expect(JSON.parse(packageFile.content)).toEqual(manifest.packageJson);
      expect(manifest.packageJson.dependencies["@open-grid/example-shared-server"]).toBe("workspace:*");
      expect(manifest.requiredEnv.length).toBeGreaterThan(0);
    }
  });

  test("wires standalone source files to exported shared-server app and route examples", async () => {
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      exports: Record<string, unknown>;
    };
    const exportedSubpaths = new Set(Object.keys(packageJson.exports));
    const manifests = getStandaloneServerExportAppManifests();

    expect(exportedSubpaths.has("./framework-standalone-examples/shared")).toBe(true);
    expect(exportedSubpaths.has("./framework-deployment-examples/shared")).toBe(true);

    for (const manifest of manifests) {
      const sourceFiles = manifest.files.filter((file) => file.content.includes("@open-grid/example-shared-server/"));

      for (const file of sourceFiles) {
        const importedSubpaths = Array.from(file.content.matchAll(/@open-grid\/example-shared-server\/([^"]+)/g), (match) => `./${match[1]}`);

        expect(importedSubpaths.length, `${manifest.framework}:${file.path}`).toBeGreaterThan(0);
        for (const subpath of importedSubpaths) {
          expect(exportedSubpaths.has(subpath), `${manifest.framework}:${file.path}:${subpath}`).toBe(true);
        }
      }
    }
  });

  test("includes framework-specific config and route files", () => {
    const next = getStandaloneServerExportAppManifest("nextjs");
    const nuxt = getStandaloneServerExportAppManifest("nuxt");
    const sveltekit = getStandaloneServerExportAppManifest("sveltekit");

    expect(getRequiredFile(next, "app/api/tickets/export/route.ts").content).toContain('dynamic = "force-dynamic"');
    expect(getRequiredFile(next, "app/tickets/page.ts").content).toContain("framework-app-examples/nextjs/app/tickets/page");
    expect(getRequiredFile(nuxt, "nuxt.config.ts").content).toContain("routeRules");
    expect(getRequiredFile(nuxt, "server/api/tickets/export.get.ts").content).toContain("framework-app-examples/nuxt/server/api/tickets/export.get");
    expect(getRequiredFile(sveltekit, "svelte.config.js").content).toContain("@sveltejs/adapter-node");
    expect(getRequiredFile(sveltekit, "src/routes/api/tickets/export/+server.ts").content).toContain("prerender = false");
  });

  test("reports incomplete standalone app manifests", () => {
    const manifest = getStandaloneServerExportAppManifest("nextjs");
    const incomplete: StandaloneServerExportAppManifest = {
      ...manifest,
      packageJson: {
        ...manifest.packageJson,
        scripts: {
          ...manifest.packageJson.scripts,
          build: "",
        },
        dependencies: {},
      },
      files: manifest.files.filter((file) => file.path !== "app/api/tickets/export/route.ts"),
    };

    expect(validateStandaloneServerExportAppManifest(incomplete)).toEqual({
      framework: "nextjs",
      ready: false,
      missingFiles: ["app/api/tickets/export/route.ts"],
      missingScripts: ["build"],
      missingDependencies: ["@open-grid/example-shared-server"],
    });
  });
});

function getRequiredFile(manifest: StandaloneServerExportAppManifest, path: string) {
  const file = getStandaloneServerExportAppFile(manifest, path);

  if (!file) {
    throw new Error(`Missing ${manifest.framework} standalone file: ${path}`);
  }

  return file;
}
