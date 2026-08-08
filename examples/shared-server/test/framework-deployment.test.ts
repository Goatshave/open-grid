import { describe, expect, test } from "vitest";
import { createExportFile } from "@open-grid/core";
import { createServerCsvResponse, createStreamingServerCsvResponse, type ServerCsvExportColumn } from "../src";
import {
  checkServerExportDeploymentReadiness,
  checkServerExportHostingTargetReadiness,
  createServerExportDeploymentHeaders,
  getServerExportDeploymentRecipe,
  getServerExportDeploymentRecipes,
  getServerExportHostingTargetRecipe,
  getServerExportHostingTargetRecipes,
  getServerExportHostingTargetRecipesForFramework,
  mergeServerExportDeploymentHeaders,
} from "../src/framework-deployment-examples/shared";

interface DeploymentTicket {
  id: string;
  account: string;
}

const columns: ServerCsvExportColumn<DeploymentTicket>[] = [
  { id: "id", header: "Ticket" },
  { id: "account", header: "Account" },
];

const rows: DeploymentTicket[] = [
  { id: "FW-001", account: "Acme Labs" },
  { id: "FW-002", account: "Northwind" },
];

describe("server framework export deployment recipes", () => {
  test("documents concrete deployment settings for each supported framework", () => {
    const recipes = getServerExportDeploymentRecipes();

    expect(recipes.map((recipe) => recipe.framework)).toEqual(["nextjs", "nuxt", "sveltekit"]);
    expect(recipes.every((recipe) => recipe.supportsStreaming)).toBe(true);
    expect(recipes.every((recipe) => recipe.headers["cache-control"]?.includes("no-store") === true)).toBe(true);
    expect(recipes.every((recipe) => recipe.checklist.length >= 4)).toBe(true);
    expect(getServerExportDeploymentRecipe("nextjs").configSnippet).toContain('dynamic = "force-dynamic"');
    expect(getServerExportDeploymentRecipe("nuxt").configSnippet).toContain("routeRules");
    expect(getServerExportDeploymentRecipe("sveltekit").configSnippet).toContain("prerender = false");
  });

  test("creates deployment headers that can be passed into buffered export responses", async () => {
    const recipe = getServerExportDeploymentRecipe("nextjs");
    const response = createServerCsvResponse(
      createExportFile("Ticket,Account\nFW-001,Acme Labs", {
        filename: "deployment",
        format: "csv",
      }),
      {
        headers: createServerExportDeploymentHeaders(recipe),
      },
    );

    expect(response.headers.get("content-disposition")).toBe('attachment; filename="deployment.csv"');
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    await expect(response.text()).resolves.toBe("Ticket,Account\nFW-001,Acme Labs");
  });

  test("merges deployment headers onto streaming export responses without replacing CSV metadata", async () => {
    const recipe = getServerExportDeploymentRecipe("sveltekit");
    const response = mergeServerExportDeploymentHeaders(
      createStreamingServerCsvResponse({
        rows,
        columns,
        filename: "streamed-deployment",
        chunkSize: 1,
      }),
      recipe,
    );
    const text = await response.text();

    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="streamed-deployment.csv"');
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(text).toBe("Ticket,Account\nFW-001,Acme Labs\nFW-002,Northwind");
  });

  test("reports missing deployment environment before marking export routes ready", () => {
    const recipe = getServerExportDeploymentRecipe("nuxt");
    const missing = checkServerExportDeploymentReadiness(recipe, {});
    const ready = checkServerExportDeploymentReadiness(recipe, {
      NUXT_TICKET_EXPORT_TOKEN_SECRET: "test-secret",
    });

    expect(missing).toEqual({
      framework: "nuxt",
      ready: false,
      missingEnv: ["NUXT_TICKET_EXPORT_TOKEN_SECRET"],
      warnings: [],
    });
    expect(ready).toEqual({
      framework: "nuxt",
      ready: true,
      missingEnv: [],
      warnings: [],
    });
  });

  test("warns when streaming deployment headers do not disable proxy buffering", () => {
    const recipe = {
      ...getServerExportDeploymentRecipe("nextjs"),
      headers: {
        "cache-control": "private, no-store, max-age=0",
        "x-accel-buffering": "yes",
      },
    };

    expect(
      checkServerExportDeploymentReadiness(recipe, {
        TICKET_EXPORT_TOKEN_SECRET: "test-secret",
      }),
    ).toEqual({
      framework: "nextjs",
      ready: false,
      missingEnv: [],
      warnings: ['Streaming exports should set x-accel-buffering to "no" when the host supports it.'],
    });
  });

  test("documents concrete hosting target recipes for server export routes", () => {
    const recipes = getServerExportHostingTargetRecipes();

    expect(recipes.map((recipe) => recipe.target)).toEqual([
      "vercel-nextjs-node",
      "aws-ecs-nextjs-node",
      "cloudflare-nuxt-module",
      "netlify-sveltekit-edge",
      "docker-sveltekit-node",
      "gcp-cloud-run-sveltekit-node",
      "kubernetes-sveltekit-node",
      "azure-container-apps-sveltekit-node",
      "render-sveltekit-node",
      "digitalocean-app-platform-sveltekit-node",
      "railway-sveltekit-node",
      "fly-sveltekit-node",
    ]);
    expect(getServerExportHostingTargetRecipesForFramework("nextjs").map((recipe) => recipe.host)).toEqual(["vercel", "aws"]);
    expect(getServerExportHostingTargetRecipesForFramework("nuxt").map((recipe) => recipe.host)).toEqual(["cloudflare"]);
    expect(getServerExportHostingTargetRecipesForFramework("sveltekit").map((recipe) => recipe.host)).toEqual([
      "netlify",
      "docker",
      "gcp",
      "kubernetes",
      "azure",
      "render",
      "digitalocean",
      "railway",
      "fly",
    ]);
    expect(getServerExportHostingTargetRecipe("vercel-nextjs-node").configFiles[0]?.content).toContain('runtime = "nodejs"');
    expect(getServerExportHostingTargetRecipe("aws-ecs-nextjs-node").configFiles.map((file) => file.path)).toEqual([
      "next.config.mjs",
      "Dockerfile",
      "ecs/task-definition.json",
      "ecs/service.json",
      "app/api/tickets/export/route.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("aws-ecs-nextjs-node").deployCommand).toContain("aws ecs update-service");
    expect(getServerExportHostingTargetRecipe("aws-ecs-nextjs-node").configFiles[0]?.content).toContain('output: "standalone"');
    expect(getServerExportHostingTargetRecipe("aws-ecs-nextjs-node").configFiles[2]?.content).toContain('"secrets"');
    expect(getServerExportHostingTargetRecipe("aws-ecs-nextjs-node").configFiles[3]?.content).toContain('"containerPort": 3000');
    expect(getServerExportHostingTargetRecipe("cloudflare-nuxt-module").configFiles.map((file) => file.path)).toEqual(["nuxt.config.ts", "wrangler.toml"]);
    expect(getServerExportHostingTargetRecipe("cloudflare-nuxt-module").configFiles[0]?.content).toContain('preset: "cloudflare_module"');
    expect(getServerExportHostingTargetRecipe("netlify-sveltekit-edge").configFiles[0]?.content).toContain("adapter({ edge: true })");
    expect(getServerExportHostingTargetRecipe("docker-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("docker-sveltekit-node").configFiles[0]?.content).toContain('@sveltejs/adapter-node');
    expect(getServerExportHostingTargetRecipe("docker-sveltekit-node").configFiles[1]?.content).toContain('CMD ["node", "build"]');
    expect(getServerExportHostingTargetRecipe("gcp-cloud-run-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      "cloudrun/service.yaml",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("gcp-cloud-run-sveltekit-node").deployCommand).toContain("gcloud run deploy");
    expect(getServerExportHostingTargetRecipe("gcp-cloud-run-sveltekit-node").configFiles[2]?.content).toContain(
      "serving.knative.dev/v1",
    );
    expect(getServerExportHostingTargetRecipe("gcp-cloud-run-sveltekit-node").configFiles[2]?.content).toContain("secretKeyRef");
    expect(getServerExportHostingTargetRecipe("kubernetes-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      "k8s/deployment.yaml",
      "k8s/service.yaml",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("kubernetes-sveltekit-node").deployCommand).toContain("kubectl apply");
    expect(getServerExportHostingTargetRecipe("kubernetes-sveltekit-node").configFiles[2]?.content).toContain("secretKeyRef");
    expect(getServerExportHostingTargetRecipe("kubernetes-sveltekit-node").configFiles[3]?.content).toContain("targetPort: 3000");
    expect(getServerExportHostingTargetRecipe("azure-container-apps-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      "azure/containerapp.yaml",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("azure-container-apps-sveltekit-node").deployCommand).toContain("az containerapp update");
    expect(getServerExportHostingTargetRecipe("azure-container-apps-sveltekit-node").configFiles[2]?.content).toContain(
      "Microsoft.App/containerApps",
    );
    expect(getServerExportHostingTargetRecipe("azure-container-apps-sveltekit-node").configFiles[2]?.content).toContain("secretRef");
    expect(getServerExportHostingTargetRecipe("azure-container-apps-sveltekit-node").configFiles[2]?.content).toContain("targetPort: 3000");
    expect(getServerExportHostingTargetRecipe("render-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      "render.yaml",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("render-sveltekit-node").deployCommand).toContain("Render Blueprint");
    expect(getServerExportHostingTargetRecipe("render-sveltekit-node").configFiles[2]?.content).toContain("runtime: docker");
    expect(getServerExportHostingTargetRecipe("render-sveltekit-node").configFiles[2]?.content).toContain("dockerfilePath: Dockerfile");
    expect(getServerExportHostingTargetRecipe("render-sveltekit-node").configFiles[2]?.content).toContain(
      "healthCheckPath: /api/tickets/export?account=Acme",
    );
    expect(getServerExportHostingTargetRecipe("render-sveltekit-node").configFiles[2]?.content).toContain("sync: false");
    expect(getServerExportHostingTargetRecipe("digitalocean-app-platform-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      ".do/app.yaml",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("digitalocean-app-platform-sveltekit-node").deployCommand).toContain("doctl apps update");
    expect(getServerExportHostingTargetRecipe("digitalocean-app-platform-sveltekit-node").configFiles[2]?.content).toContain(
      "dockerfile_path: Dockerfile",
    );
    expect(getServerExportHostingTargetRecipe("digitalocean-app-platform-sveltekit-node").configFiles[2]?.content).toContain(
      "http_port: 3000",
    );
    expect(getServerExportHostingTargetRecipe("digitalocean-app-platform-sveltekit-node").configFiles[2]?.content).toContain(
      "type: SECRET",
    );
    expect(getServerExportHostingTargetRecipe("digitalocean-app-platform-sveltekit-node").configFiles[2]?.content).toContain(
      "http_path: /api/tickets/export?account=Acme",
    );
    expect(getServerExportHostingTargetRecipe("railway-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      "railway.json",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("railway-sveltekit-node").deployCommand).toBe("railway up");
    expect(getServerExportHostingTargetRecipe("railway-sveltekit-node").configFiles[2]?.content).toContain(
      '"$schema": "https://railway.com/railway.schema.json"',
    );
    expect(getServerExportHostingTargetRecipe("railway-sveltekit-node").configFiles[2]?.content).toContain('"builder": "DOCKERFILE"');
    expect(getServerExportHostingTargetRecipe("railway-sveltekit-node").configFiles[2]?.content).toContain(
      '"healthcheckPath": "/api/tickets/export?account=Acme"',
    );
    expect(getServerExportHostingTargetRecipe("fly-sveltekit-node").configFiles.map((file) => file.path)).toEqual([
      "svelte.config.js",
      "Dockerfile",
      "fly.toml",
      "src/routes/api/tickets/export/+server.ts",
    ]);
    expect(getServerExportHostingTargetRecipe("fly-sveltekit-node").deployCommand).toBe("fly deploy");
    expect(getServerExportHostingTargetRecipe("fly-sveltekit-node").configFiles[2]?.content).toContain("[http_service]");
  });

  test("checks hosting target env and config readiness separately from framework defaults", () => {
    const vercel = getServerExportHostingTargetRecipe("vercel-nextjs-node");
    const aws = getServerExportHostingTargetRecipe("aws-ecs-nextjs-node");
    const cloudflare = getServerExportHostingTargetRecipe("cloudflare-nuxt-module");
    const docker = getServerExportHostingTargetRecipe("docker-sveltekit-node");
    const cloudRun = getServerExportHostingTargetRecipe("gcp-cloud-run-sveltekit-node");
    const kubernetes = getServerExportHostingTargetRecipe("kubernetes-sveltekit-node");
    const azure = getServerExportHostingTargetRecipe("azure-container-apps-sveltekit-node");
    const render = getServerExportHostingTargetRecipe("render-sveltekit-node");
    const digitalOcean = getServerExportHostingTargetRecipe("digitalocean-app-platform-sveltekit-node");
    const railway = getServerExportHostingTargetRecipe("railway-sveltekit-node");
    const fly = getServerExportHostingTargetRecipe("fly-sveltekit-node");

    expect(checkServerExportHostingTargetReadiness(vercel, {}, [])).toEqual({
      target: "vercel-nextjs-node",
      framework: "nextjs",
      ready: false,
      missingEnv: ["TICKET_EXPORT_TOKEN_SECRET"],
      missingConfigFiles: ["app/api/tickets/export/route.ts"],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        vercel,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["app/api/tickets/export/route.ts"],
      ),
    ).toEqual({
      target: "vercel-nextjs-node",
      framework: "nextjs",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        aws,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["next.config.mjs", "Dockerfile", "ecs/task-definition.json", "ecs/service.json", "app/api/tickets/export/route.ts"],
      ),
    ).toEqual({
      target: "aws-ecs-nextjs-node",
      framework: "nextjs",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        cloudflare,
        {
          NUXT_TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["nuxt.config.ts", "wrangler.toml"],
      ),
    ).toEqual({
      target: "cloudflare-nuxt-module",
      framework: "nuxt",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: ["This hosting target needs production load tests before using large streaming exports."],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        docker,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["./svelte.config.js", " Dockerfile ", "./src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "docker-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
        warnings: [],
      });
    expect(
      checkServerExportHostingTargetReadiness(
        cloudRun,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["svelte.config.js", "Dockerfile", "cloudrun/service.yaml", "src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "gcp-cloud-run-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        kubernetes,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["svelte.config.js", "Dockerfile", "k8s/deployment.yaml", "k8s/service.yaml", "src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "kubernetes-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        azure,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["svelte.config.js", "Dockerfile", "azure/containerapp.yaml", "src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "azure-container-apps-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        render,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["svelte.config.js", "Dockerfile", "render.yaml", "src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "render-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        digitalOcean,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["svelte.config.js", "Dockerfile", ".do/app.yaml", "src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "digitalocean-app-platform-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        fly,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["svelte.config.js", "Dockerfile", "fly.toml", "src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "fly-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
    expect(
      checkServerExportHostingTargetReadiness(
        railway,
        {
          TICKET_EXPORT_TOKEN_SECRET: "test-secret",
        },
        ["svelte.config.js", "Dockerfile", "railway.json", "src/routes/api/tickets/export/+server.ts"],
      ),
    ).toEqual({
      target: "railway-sveltekit-node",
      framework: "sveltekit",
      ready: true,
      missingEnv: [],
      missingConfigFiles: [],
      warnings: [],
    });
  });
});
