import { getServerExportDeploymentRecipe, type ServerExportFramework } from "../framework-deployment-examples/shared";

export interface StandaloneServerExportAppFile {
  path: string;
  content: string;
}

export interface StandaloneServerExportAppManifest {
  framework: ServerExportFramework;
  name: string;
  packageJson: {
    name: string;
    private: true;
    type: "module";
    scripts: Record<"dev" | "build" | "start", string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  commands: {
    install: string;
    dev: string;
    build: string;
    start: string;
  };
  requiredEnv: readonly string[];
  files: StandaloneServerExportAppFile[];
}

export interface StandaloneServerExportAppValidation {
  framework: ServerExportFramework;
  ready: boolean;
  missingFiles: string[];
  missingScripts: string[];
  missingDependencies: string[];
}

const sharedPackageVersion = "workspace:*";

export function getStandaloneServerExportAppManifest(framework: ServerExportFramework): StandaloneServerExportAppManifest {
  const deployment = getServerExportDeploymentRecipe(framework);

  if (framework === "nextjs") {
    const packageJson = createPackageJson("open-grid-nextjs-server-export", {
      dependencies: {
        "@open-grid/example-shared-server": sharedPackageVersion,
        next: "^15.0.0",
        react: "^18.3.1",
        "react-dom": "^18.3.1",
      },
      devDependencies: {
        "@types/node": "^22.10.0",
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        typescript: "^5.7.2",
      },
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
    });

    return {
      framework,
      name: packageJson.name,
      packageJson,
      commands: createCommands("pnpm"),
      requiredEnv: deployment.requiredEnv,
      files: [
        jsonFile("package.json", packageJson),
        textFile("next.config.ts", "const nextConfig = {};\n\nexport default nextConfig;\n"),
        textFile("tsconfig.json", createTypeScriptConfig(["next-env.d.ts", "**/*.ts", "**/*.tsx"])),
        textFile("app/tickets/page.ts", createNextPageSource()),
        textFile("app/api/tickets/export/route.ts", createNextRouteSource(deployment.configSnippet)),
        textFile(".env.example", createEnvExample(deployment.requiredEnv)),
      ],
    };
  }

  if (framework === "nuxt") {
    const packageJson = createPackageJson("open-grid-nuxt-server-export", {
      dependencies: {
        "@open-grid/example-shared-server": sharedPackageVersion,
        nuxt: "^3.15.0",
        vue: "^3.5.0",
      },
      devDependencies: {
        typescript: "^5.7.2",
      },
      scripts: {
        dev: "nuxt dev",
        build: "nuxt build",
        start: "node .output/server/index.mjs",
      },
    });

    return {
      framework,
      name: packageJson.name,
      packageJson,
      commands: createCommands("pnpm"),
      requiredEnv: deployment.requiredEnv,
      files: [
        jsonFile("package.json", packageJson),
        textFile("nuxt.config.ts", deployment.configSnippet),
        textFile("pages/tickets.ts", createNuxtPageSource()),
        textFile("server/api/tickets/export.get.ts", createNuxtRouteSource()),
        textFile(".env.example", createEnvExample(deployment.requiredEnv)),
      ],
    };
  }

  const packageJson = createPackageJson("open-grid-sveltekit-server-export", {
    dependencies: {
      "@open-grid/example-shared-server": sharedPackageVersion,
      "@sveltejs/adapter-node": "^5.2.0",
      "@sveltejs/kit": "^2.15.0",
      svelte: "^5.0.0",
    },
    devDependencies: {
      "@sveltejs/vite-plugin-svelte": "^5.0.0",
      typescript: "^5.7.2",
      vite: "^6.0.0",
    },
    scripts: {
      dev: "vite dev",
      build: "vite build",
      start: "node build/index.js",
    },
  });

  return {
    framework,
    name: packageJson.name,
    packageJson,
    commands: createCommands("pnpm"),
    requiredEnv: deployment.requiredEnv,
    files: [
      jsonFile("package.json", packageJson),
      textFile("svelte.config.js", createSvelteConfigSource()),
      textFile("src/routes/tickets/+page.ts", createSvelteKitPageSource()),
      textFile("src/routes/api/tickets/export/+server.ts", createSvelteKitRouteSource(deployment.configSnippet)),
      textFile(".env.example", createEnvExample(deployment.requiredEnv)),
    ],
  };
}

export function getStandaloneServerExportAppManifests(): StandaloneServerExportAppManifest[] {
  return (["nextjs", "nuxt", "sveltekit"] as const).map((framework) => getStandaloneServerExportAppManifest(framework));
}

export function validateStandaloneServerExportAppManifest(manifest: StandaloneServerExportAppManifest): StandaloneServerExportAppValidation {
  const requiredFiles = getRequiredStandaloneFiles(manifest.framework);
  const filePaths = new Set(manifest.files.map((file) => file.path));
  const missingFiles = requiredFiles.filter((file) => !filePaths.has(file));
  const requiredScripts = ["dev", "build", "start"] as const;
  const missingScripts = requiredScripts.filter((script) => !manifest.packageJson.scripts[script]);
  const missingDependencies = ["@open-grid/example-shared-server"].filter((dependency) => !(dependency in manifest.packageJson.dependencies));

  return {
    framework: manifest.framework,
    ready: missingFiles.length === 0 && missingScripts.length === 0 && missingDependencies.length === 0,
    missingFiles,
    missingScripts,
    missingDependencies,
  };
}

export function getStandaloneServerExportAppFile(manifest: StandaloneServerExportAppManifest, path: string): StandaloneServerExportAppFile | undefined {
  return manifest.files.find((file) => file.path === path);
}

function getRequiredStandaloneFiles(framework: ServerExportFramework): string[] {
  if (framework === "nextjs") {
    return ["package.json", "next.config.ts", "tsconfig.json", "app/tickets/page.ts", "app/api/tickets/export/route.ts", ".env.example"];
  }

  if (framework === "nuxt") {
    return ["package.json", "nuxt.config.ts", "pages/tickets.ts", "server/api/tickets/export.get.ts", ".env.example"];
  }

  return ["package.json", "svelte.config.js", "src/routes/tickets/+page.ts", "src/routes/api/tickets/export/+server.ts", ".env.example"];
}

function createPackageJson(
  name: string,
  options: Pick<StandaloneServerExportAppManifest["packageJson"], "dependencies" | "devDependencies" | "scripts">,
): StandaloneServerExportAppManifest["packageJson"] {
  return {
    name,
    private: true,
    type: "module",
    scripts: options.scripts,
    dependencies: options.dependencies,
    devDependencies: options.devDependencies,
  };
}

function createCommands(packageManager: "pnpm") {
  return {
    install: `${packageManager} install`,
    dev: `${packageManager} dev`,
    build: `${packageManager} build`,
    start: `${packageManager} start`,
  };
}

function jsonFile(path: string, value: unknown): StandaloneServerExportAppFile {
  return textFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function textFile(path: string, content: string): StandaloneServerExportAppFile {
  return { path, content };
}

function createEnvExample(requiredEnv: readonly string[]): string {
  return requiredEnv.map((key) => `${key}=replace-me`).join("\n") + "\n";
}

function createTypeScriptConfig(include: string[]): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        strict: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "preserve",
        noEmit: true,
      },
      include,
    },
    null,
    2,
  )}\n`;
}

function createNextPageSource(): string {
  return [
    'import nextTicketsPage from "@open-grid/example-shared-server/framework-app-examples/nextjs/app/tickets/page";',
    "",
    "export default nextTicketsPage;",
    "",
  ].join("\n");
}

function createNextRouteSource(configSnippet: string): string {
  return [
    configSnippet,
    'export { GET } from "@open-grid/example-shared-server/framework-app-examples/nextjs/app/api/tickets/export/route";',
    "",
  ].join("\n");
}

function createNuxtPageSource(): string {
  return [
    'export { createNuxtTicketsPage } from "@open-grid/example-shared-server/framework-app-examples/nuxt/pages/tickets";',
    "",
    "export default createNuxtTicketsPage;",
    "",
  ].join("\n");
}

function createNuxtRouteSource(): string {
  return [
    'export { default } from "@open-grid/example-shared-server/framework-app-examples/nuxt/server/api/tickets/export.get";',
    "",
  ].join("\n");
}

function createSvelteConfigSource(): string {
  return [
    'import adapter from "@sveltejs/adapter-node";',
    "",
    "const config = {",
    "  kit: { adapter: adapter() },",
    "};",
    "",
    "export default config;",
    "",
  ].join("\n");
}

function createSvelteKitPageSource(): string {
  return [
    'export { load } from "@open-grid/example-shared-server/framework-app-examples/sveltekit/src/routes/tickets/+page";',
    "",
  ].join("\n");
}

function createSvelteKitRouteSource(configSnippet: string): string {
  return [
    configSnippet,
    'export { GET } from "@open-grid/example-shared-server/framework-app-examples/sveltekit/src/routes/api/tickets/export/+server";',
    "",
  ].join("\n");
}
