export type ServerExportFramework = "nextjs" | "nuxt" | "sveltekit";
export type ServerExportHostingTarget =
  | "vercel-nextjs-node"
  | "aws-ecs-nextjs-node"
  | "cloudflare-nuxt-module"
  | "netlify-sveltekit-edge"
  | "docker-sveltekit-node"
  | "gcp-cloud-run-sveltekit-node"
  | "kubernetes-sveltekit-node"
  | "azure-container-apps-sveltekit-node"
  | "render-sveltekit-node"
  | "digitalocean-app-platform-sveltekit-node"
  | "railway-sveltekit-node"
  | "fly-sveltekit-node";

export interface ServerExportDeploymentRecipe {
  framework: ServerExportFramework;
  label: string;
  routeFile: string;
  runtime: "node" | "edge-compatible";
  supportsStreaming: boolean;
  maxDurationSeconds: number;
  requiredEnv: readonly string[];
  headers: Readonly<Record<string, string>>;
  configSnippet: string;
  checklist: readonly string[];
}

export interface ServerExportDeploymentReadiness {
  framework: ServerExportFramework;
  ready: boolean;
  missingEnv: string[];
  warnings: string[];
}

export interface ServerExportHostingConfigFile {
  path: string;
  content: string;
}

export interface ServerExportHostingTargetRecipe {
  target: ServerExportHostingTarget;
  framework: ServerExportFramework;
  host:
    | "vercel"
    | "aws"
    | "cloudflare"
    | "netlify"
    | "docker"
    | "gcp"
    | "kubernetes"
    | "azure"
    | "render"
    | "digitalocean"
    | "railway"
    | "fly";
  label: string;
  runtime: "node" | "edge-compatible";
  streamingMode: "full" | "limited";
  requiredEnv: readonly string[];
  buildCommand: string;
  deployCommand: string;
  outputPath: string;
  configFiles: readonly ServerExportHostingConfigFile[];
  checklist: readonly string[];
}

export interface ServerExportHostingTargetReadiness {
  target: ServerExportHostingTarget;
  framework: ServerExportFramework;
  ready: boolean;
  missingEnv: string[];
  missingConfigFiles: string[];
  warnings: string[];
}

const deploymentRecipes = {
  nextjs: {
    framework: "nextjs",
    label: "Next.js App Router route handler",
    routeFile: "app/api/tickets/export/route.ts",
    runtime: "node",
    supportsStreaming: true,
    maxDurationSeconds: 60,
    requiredEnv: ["TICKET_EXPORT_TOKEN_SECRET"],
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "x-accel-buffering": "no",
    },
    configSnippet: [
      'export const runtime = "nodejs";',
      'export const dynamic = "force-dynamic";',
      "export const maxDuration = 60;",
    ].join("\n"),
    checklist: [
      "Keep export routes dynamic so filtered server data is never statically cached.",
      "Use the Node.js runtime for large streaming exports and database drivers.",
      "Pass deployment headers into createServerCsvResponse or createStreamingServerCsvResponse.",
      "Authenticate and authorize before constructing the CSV response body.",
    ],
  },
  nuxt: {
    framework: "nuxt",
    label: "Nuxt Nitro server route",
    routeFile: "server/api/tickets/export.get.ts",
    runtime: "node",
    supportsStreaming: true,
    maxDurationSeconds: 60,
    requiredEnv: ["NUXT_TICKET_EXPORT_TOKEN_SECRET"],
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "x-accel-buffering": "no",
    },
    configSnippet: [
      "export default defineNuxtConfig({",
      "  routeRules: {",
      '    "/api/tickets/export": { cache: false },',
      "  },",
      "});",
    ].join("\n"),
    checklist: [
      "Disable Nitro route caching for export endpoints.",
      "Deploy the route on a Node preset when database access or long streams are required.",
      "Forward cache-control and buffering headers from the route response.",
      "Validate query and column allowlists before reading rows.",
    ],
  },
  sveltekit: {
    framework: "sveltekit",
    label: "SvelteKit +server endpoint",
    routeFile: "src/routes/api/tickets/export/+server.ts",
    runtime: "node",
    supportsStreaming: true,
    maxDurationSeconds: 60,
    requiredEnv: ["TICKET_EXPORT_TOKEN_SECRET"],
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "x-accel-buffering": "no",
    },
    configSnippet: [
      "import { error } from \"@sveltejs/kit\";",
      "",
      "export const prerender = false;",
      "export const trailingSlash = \"never\";",
    ].join("\n"),
    checklist: [
      "Keep the endpoint out of prerendered routes.",
      "Choose an adapter/runtime that supports Web Response streams for large exports.",
      "Return private no-store headers with every export response.",
      "Run account-scope checks before creating the streaming response.",
    ],
  },
} as const satisfies Record<ServerExportFramework, ServerExportDeploymentRecipe>;

const hostingTargetRecipes = {
  "vercel-nextjs-node": {
    target: "vercel-nextjs-node",
    framework: "nextjs",
    host: "vercel",
    label: "Vercel Next.js Node.js route handler",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.nextjs.requiredEnv,
    buildCommand: "next build",
    deployCommand: "vercel deploy --prod",
    outputPath: ".next",
    configFiles: [
      {
        path: "app/api/tickets/export/route.ts",
        content: deploymentRecipes.nextjs.configSnippet,
      },
    ],
    checklist: [
      "Keep the route handler on the Node.js runtime for long exports and database drivers.",
      "Set the route segment max duration to match the project plan before load testing.",
      "Configure every required environment variable in the Vercel project before promotion.",
      "Use the shared private/no-store deployment headers on buffered and streaming responses.",
    ],
  },
  "aws-ecs-nextjs-node": {
    target: "aws-ecs-nextjs-node",
    framework: "nextjs",
    host: "aws",
    label: "AWS ECS Next.js standalone Node.js export service",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.nextjs.requiredEnv,
    buildCommand: "docker build -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/open-grid-nextjs-export:latest .",
    deployCommand:
      "aws ecs register-task-definition --cli-input-json file://ecs/task-definition.json && aws ecs update-service --cluster open-grid --service open-grid-nextjs-export --force-new-deployment",
    outputPath: ".next/standalone",
    configFiles: [
      {
        path: "next.config.mjs",
        content: [
          "const nextConfig = {",
          '  output: "standalone",',
          "};",
          "",
          "export default nextConfig;",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV PORT=3000",
          "ENV HOSTNAME=0.0.0.0",
          "COPY --from=build /app/.next/standalone ./",
          "COPY --from=build /app/.next/static ./.next/static",
          "COPY --from=build /app/public ./public",
          "EXPOSE 3000",
          'CMD ["node", "server.js"]',
        ].join("\n"),
      },
      {
        path: "ecs/task-definition.json",
        content: [
          "{",
          '  "family": "open-grid-nextjs-export",',
          '  "networkMode": "awsvpc",',
          '  "requiresCompatibilities": ["FARGATE"],',
          '  "cpu": "512",',
          '  "memory": "1024",',
          '  "containerDefinitions": [',
          "    {",
          '      "name": "web",',
          '      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/open-grid-nextjs-export:latest",',
          '      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],',
          '      "environment": [{ "name": "NODE_ENV", "value": "production" }],',
          '      "secrets": [',
          '        { "name": "TICKET_EXPORT_TOKEN_SECRET", "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/open-grid/ticket-export-token-secret" }',
          "      ]",
          "    }",
          "  ]",
          "}",
        ].join("\n"),
      },
      {
        path: "ecs/service.json",
        content: [
          "{",
          '  "cluster": "open-grid",',
          '  "serviceName": "open-grid-nextjs-export",',
          '  "taskDefinition": "open-grid-nextjs-export",',
          '  "desiredCount": 2,',
          '  "launchType": "FARGATE",',
          '  "loadBalancers": [',
          "    {",
          '      "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/open-grid-export/abc123",',
          '      "containerName": "web",',
          '      "containerPort": 3000',
          "    }",
          "  ]",
          "}",
        ].join("\n"),
      },
      {
        path: "app/api/tickets/export/route.ts",
        content: deploymentRecipes.nextjs.configSnippet,
      },
    ],
    checklist: [
      "Use standalone output so the ECS image contains only the built Next.js server needed for the export route.",
      "Provide required export secrets through SSM Parameter Store or Secrets Manager references in the task definition.",
      "Disable buffering on any proxy or load balancer layer that sits in front of long streaming export responses.",
      "Run load tests through the real ECS service and target group before promoting large CSV exports.",
    ],
  },
  "cloudflare-nuxt-module": {
    target: "cloudflare-nuxt-module",
    framework: "nuxt",
    host: "cloudflare",
    label: "Cloudflare Workers Nuxt Nitro module preset",
    runtime: "edge-compatible",
    streamingMode: "limited",
    requiredEnv: deploymentRecipes.nuxt.requiredEnv,
    buildCommand: "NITRO_PRESET=cloudflare_module nuxt build",
    deployCommand: "wrangler deploy",
    outputPath: ".output",
    configFiles: [
      {
        path: "nuxt.config.ts",
        content: [
          "export default defineNuxtConfig({",
          "  nitro: {",
          '    preset: "cloudflare_module",',
          "  },",
          "  routeRules: {",
          '    "/api/tickets/export": { cache: false },',
          "  },",
          "});",
        ].join("\n"),
      },
      {
        path: "wrangler.toml",
        content: ['name = "open-grid-nuxt-export"', 'main = ".output/server/index.mjs"', 'compatibility_date = "2026-07-01"'].join("\n"),
      },
    ],
    checklist: [
      "Keep the route cache disabled so filtered export results are not reused across accounts.",
      "Use the Cloudflare module preset only for exports that fit Workers CPU and body-size limits.",
      "Store required secrets with Wrangler instead of committing them to the app manifest.",
      "Load-test streamed responses on the target Worker before using large production exports.",
    ],
  },
  "netlify-sveltekit-edge": {
    target: "netlify-sveltekit-edge",
    framework: "sveltekit",
    host: "netlify",
    label: "Netlify SvelteKit edge export endpoint",
    runtime: "edge-compatible",
    streamingMode: "limited",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "vite build",
    deployCommand: "netlify deploy --prod",
    outputPath: ".svelte-kit",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-netlify";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter({ edge: true }),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use the edge adapter only for export queries that do not require Node-only database drivers.",
      "Configure required environment variables in the Netlify site before enabling the route.",
      "Keep the endpoint out of prerendering and return private no-store headers.",
      "Route large or long-running exports to a Node function if edge limits are too restrictive.",
    ],
  },
  "docker-sveltekit-node": {
    target: "docker-sveltekit-node",
    framework: "sveltekit",
    host: "docker",
    label: "Docker SvelteKit adapter-node export endpoint",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "vite build",
    deployCommand: "docker build -t open-grid-sveltekit-export . && docker run --env-file .env -p 3000:3000 open-grid-sveltekit-export",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use adapter-node when export routes need Node-only database drivers or long streaming responses.",
      "Set required environment variables through the container runtime rather than baking secrets into the image.",
      "Keep reverse proxies in front of the container from buffering streaming CSV responses.",
      "Run the built image with production-like row counts before promoting the export route.",
    ],
  },
  "gcp-cloud-run-sveltekit-node": {
    target: "gcp-cloud-run-sveltekit-node",
    framework: "sveltekit",
    host: "gcp",
    label: "Google Cloud Run SvelteKit adapter-node export service",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "docker build -t us-docker.pkg.dev/open-grid/export/open-grid-sveltekit-export:latest .",
    deployCommand:
      "gcloud run deploy open-grid-sveltekit-export --image us-docker.pkg.dev/open-grid/export/open-grid-sveltekit-export:latest --region us-central1 --platform managed",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV PORT=3000",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: "cloudrun/service.yaml",
        content: [
          "apiVersion: serving.knative.dev/v1",
          "kind: Service",
          "metadata:",
          "  name: open-grid-sveltekit-export",
          "spec:",
          "  template:",
          "    metadata:",
          "      annotations:",
          '        autoscaling.knative.dev/minScale: "1"',
          "    spec:",
          "      containers:",
          "        - image: us-docker.pkg.dev/open-grid/export/open-grid-sveltekit-export:latest",
          "          ports:",
          "            - containerPort: 3000",
          "          env:",
          "            - name: NODE_ENV",
          "              value: production",
          "            - name: TICKET_EXPORT_TOKEN_SECRET",
          "              valueFrom:",
          "                secretKeyRef:",
          "                  name: ticket-export-token-secret",
          "                  key: latest",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use adapter-node in the container when export routes need Node database drivers or full streaming responses.",
      "Expose required export secrets through Cloud Run service secret references instead of static environment values.",
      "Keep a minimum instance warm when long export streams should avoid cold-start delay.",
      "Load-test streamed CSV responses through the deployed Cloud Run service before enabling large exports.",
    ],
  },
  "kubernetes-sveltekit-node": {
    target: "kubernetes-sveltekit-node",
    framework: "sveltekit",
    host: "kubernetes",
    label: "Kubernetes SvelteKit adapter-node export deployment",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "docker build -t registry.example.com/open-grid-sveltekit-export:latest .",
    deployCommand: "kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV PORT=3000",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: "k8s/deployment.yaml",
        content: [
          "apiVersion: apps/v1",
          "kind: Deployment",
          "metadata:",
          "  name: open-grid-sveltekit-export",
          "spec:",
          "  replicas: 2",
          "  selector:",
          "    matchLabels:",
          "      app: open-grid-sveltekit-export",
          "  template:",
          "    metadata:",
          "      labels:",
          "        app: open-grid-sveltekit-export",
          "    spec:",
          "      containers:",
          "        - name: web",
          "          image: registry.example.com/open-grid-sveltekit-export:latest",
          "          ports:",
          "            - containerPort: 3000",
          "          env:",
          "            - name: NODE_ENV",
          "              value: production",
          "            - name: PORT",
          "              value: \"3000\"",
          "            - name: TICKET_EXPORT_TOKEN_SECRET",
          "              valueFrom:",
          "                secretKeyRef:",
          "                  name: ticket-export-secrets",
          "                  key: token-secret",
          "          readinessProbe:",
          "            httpGet:",
          "              path: /api/tickets/export?account=Acme",
          "              port: 3000",
          "            initialDelaySeconds: 5",
          "            periodSeconds: 15",
        ].join("\n"),
      },
      {
        path: "k8s/service.yaml",
        content: [
          "apiVersion: v1",
          "kind: Service",
          "metadata:",
          "  name: open-grid-sveltekit-export",
          "spec:",
          "  type: ClusterIP",
          "  selector:",
          "    app: open-grid-sveltekit-export",
          "  ports:",
          "    - name: http",
          "      port: 80",
          "      targetPort: 3000",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use adapter-node when export routes need Node-only database drivers or full streaming responses.",
      "Provide required secrets through Kubernetes Secret references instead of ConfigMaps or image layers.",
      "Disable response buffering on the ingress controller used in front of the service.",
      "Load-test the service through the real ingress path with production-like CSV row counts.",
    ],
  },
  "azure-container-apps-sveltekit-node": {
    target: "azure-container-apps-sveltekit-node",
    framework: "sveltekit",
    host: "azure",
    label: "Azure Container Apps SvelteKit adapter-node export service",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "docker build -t opengrid.azurecr.io/open-grid-sveltekit-export:latest .",
    deployCommand:
      "az containerapp update --name open-grid-sveltekit-export --resource-group open-grid --image opengrid.azurecr.io/open-grid-sveltekit-export:latest",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV PORT=3000",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: "azure/containerapp.yaml",
        content: [
          "type: Microsoft.App/containerApps",
          "name: open-grid-sveltekit-export",
          "location: eastus",
          "properties:",
          "  managedEnvironmentId: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/open-grid/providers/Microsoft.App/managedEnvironments/open-grid-env",
          "  configuration:",
          "    ingress:",
          "      external: true",
          "      targetPort: 3000",
          "      transport: auto",
          "    secrets:",
          "      - name: ticket-export-token-secret",
          "        keyVaultUrl: https://open-grid-vault.vault.azure.net/secrets/ticket-export-token-secret",
          "        identity: system",
          "  template:",
          "    scale:",
          "      minReplicas: 1",
          "      maxReplicas: 5",
          "    containers:",
          "      - name: web",
          "        image: opengrid.azurecr.io/open-grid-sveltekit-export:latest",
          "        env:",
          "          - name: NODE_ENV",
          "            value: production",
          "          - name: PORT",
          "            value: \"3000\"",
          "          - name: TICKET_EXPORT_TOKEN_SECRET",
          "            secretRef: ticket-export-token-secret",
          "        probes:",
          "          - type: Readiness",
          "            httpGet:",
          "              path: /api/tickets/export?account=Acme",
          "              port: 3000",
          "            initialDelaySeconds: 5",
          "            periodSeconds: 15",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use adapter-node when export routes need Node database drivers or full streaming responses.",
      "Store required export secrets in Key Vault or Container Apps secrets instead of image layers.",
      "Keep at least one replica warm when large CSV streams should avoid cold-start delay.",
      "Load-test streamed CSV responses through Container Apps ingress before enabling large exports.",
    ],
  },
  "render-sveltekit-node": {
    target: "render-sveltekit-node",
    framework: "sveltekit",
    host: "render",
    label: "Render SvelteKit adapter-node Docker web service",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "docker build -t open-grid-sveltekit-export .",
    deployCommand: "Sync render.yaml as a Render Blueprint and deploy the open-grid-sveltekit-export web service",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV HOST=0.0.0.0",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: "render.yaml",
        content: [
          "services:",
          "  - type: web",
          "    name: open-grid-sveltekit-export",
          "    runtime: docker",
          "    plan: starter",
          "    region: oregon",
          "    dockerfilePath: Dockerfile",
          "    autoDeployTrigger: commit",
          "    healthCheckPath: /api/tickets/export?account=Acme",
          "    maxShutdownDelaySeconds: 120",
          "    envVars:",
          "      - key: TICKET_EXPORT_TOKEN_SECRET",
          "        sync: false",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use runtime: docker so Render builds the adapter-node service from the committed Dockerfile.",
      "Set required export secrets through Render environment variables instead of committing values to render.yaml.",
      "Keep the health check path lightweight enough for deploy verification while still exercising the export route.",
      "Load-test streamed CSV responses through the Render web service before enabling large exports.",
    ],
  },
  "digitalocean-app-platform-sveltekit-node": {
    target: "digitalocean-app-platform-sveltekit-node",
    framework: "sveltekit",
    host: "digitalocean",
    label: "DigitalOcean App Platform SvelteKit adapter-node Docker service",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "docker build -t open-grid-sveltekit-export .",
    deployCommand: "doctl apps update <app-id> --spec .do/app.yaml",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV HOST=0.0.0.0",
          "ENV PORT=3000",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: ".do/app.yaml",
        content: [
          "name: open-grid-sveltekit-export",
          "region: nyc",
          "services:",
          "  - name: web",
          "    github:",
          "      repo: Goatshave/open-grid",
          "      branch: main",
          "      deploy_on_push: true",
          "    source_dir: /",
          "    dockerfile_path: Dockerfile",
          "    http_port: 3000",
          "    instance_count: 1",
          "    instance_size_slug: apps-s-1vcpu-1gb",
          "    envs:",
          "      - key: TICKET_EXPORT_TOKEN_SECRET",
          "        value: REPLACE_WITH_DIGITALOCEAN_SECRET",
          "        scope: RUN_TIME",
          "        type: SECRET",
          "    health_check:",
          "      initial_delay_seconds: 10",
          "      period_seconds: 15",
          "      timeout_seconds: 5",
          "      success_threshold: 1",
          "      failure_threshold: 5",
          "      http_path: /api/tickets/export?account=Acme",
          "      port: 3000",
          "ingress:",
          "  rules:",
          "    - match:",
          "        path:",
          "          prefix: /",
          "      component:",
          "        name: web",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use dockerfile_path so App Platform builds the adapter-node service from the committed Dockerfile.",
      "Replace the placeholder secret value through App Platform or doctl before submitting the app spec.",
      "Keep http_port aligned with the SvelteKit adapter-node PORT value used by the container.",
      "Load-test streamed CSV responses through App Platform ingress before enabling large exports.",
    ],
  },
  "railway-sveltekit-node": {
    target: "railway-sveltekit-node",
    framework: "sveltekit",
    host: "railway",
    label: "Railway SvelteKit adapter-node export service",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "vite build",
    deployCommand: "railway up",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV PORT=3000",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: "railway.json",
        content: [
          "{",
          '  "$schema": "https://railway.com/railway.schema.json",',
          '  "build": {',
          '    "builder": "DOCKERFILE",',
          '    "dockerfilePath": "Dockerfile"',
          "  },",
          '  "deploy": {',
          '    "startCommand": "node build",',
          '    "healthcheckPath": "/api/tickets/export?account=Acme",',
          '    "healthcheckTimeout": 30,',
          '    "restartPolicyType": "ON_FAILURE",',
          '    "restartPolicyMaxRetries": 3',
          "  }",
          "}",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use adapter-node when export routes need Node database drivers or full streaming responses.",
      "Set required export secrets in Railway variables instead of committing them to railway.json.",
      "Use a Dockerfile build so Node and package-manager versions stay consistent across local and Railway builds.",
      "Load-test streamed CSV responses through the public Railway service before enabling large exports.",
    ],
  },
  "fly-sveltekit-node": {
    target: "fly-sveltekit-node",
    framework: "sveltekit",
    host: "fly",
    label: "Fly.io SvelteKit adapter-node export machine",
    runtime: "node",
    streamingMode: "full",
    requiredEnv: deploymentRecipes.sveltekit.requiredEnv,
    buildCommand: "vite build",
    deployCommand: "fly deploy",
    outputPath: "build",
    configFiles: [
      {
        path: "svelte.config.js",
        content: [
          'import adapter from "@sveltejs/adapter-node";',
          "",
          "export default {",
          "  kit: {",
          "    adapter: adapter(),",
          "  },",
          "};",
        ].join("\n"),
      },
      {
        path: "Dockerfile",
        content: [
          "FROM node:22-slim AS build",
          "WORKDIR /app",
          "COPY package.json pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --frozen-lockfile",
          "COPY . .",
          "RUN pnpm build",
          "",
          "FROM node:22-slim AS runtime",
          "WORKDIR /app",
          "ENV NODE_ENV=production",
          "ENV PORT=3000",
          "COPY --from=build /app/build ./build",
          "COPY --from=build /app/package.json /app/pnpm-lock.yaml ./",
          "RUN corepack enable && pnpm install --prod --frozen-lockfile",
          "EXPOSE 3000",
          'CMD ["node", "build"]',
        ].join("\n"),
      },
      {
        path: "fly.toml",
        content: [
          'app = "open-grid-sveltekit-export"',
          'primary_region = "iad"',
          "",
          "[build]",
          '  dockerfile = "Dockerfile"',
          "",
          "[env]",
          '  NODE_ENV = "production"',
          '  PORT = "3000"',
          "",
          "[http_service]",
          "  internal_port = 3000",
          "  force_https = true",
          '  auto_stop_machines = "stop"',
          "  auto_start_machines = true",
          "  min_machines_running = 1",
        ].join("\n"),
      },
      {
        path: "src/routes/api/tickets/export/+server.ts",
        content: deploymentRecipes.sveltekit.configSnippet,
      },
    ],
    checklist: [
      "Use adapter-node on Fly Machines when export routes need Node database drivers or full streaming responses.",
      "Set required secrets with the Fly CLI instead of placing them in fly.toml.",
      "Keep at least one machine warm for export routes that should avoid cold-start stream gaps.",
      "Validate proxy buffering and response streaming with production-like CSV row counts before rollout.",
    ],
  },
} as const satisfies Record<ServerExportHostingTarget, ServerExportHostingTargetRecipe>;

export function getServerExportDeploymentRecipe(framework: ServerExportFramework): ServerExportDeploymentRecipe {
  return deploymentRecipes[framework];
}

export function getServerExportDeploymentRecipes(): ServerExportDeploymentRecipe[] {
  return Object.values(deploymentRecipes);
}

export function getServerExportHostingTargetRecipe(target: ServerExportHostingTarget): ServerExportHostingTargetRecipe {
  return hostingTargetRecipes[target];
}

export function getServerExportHostingTargetRecipes(): ServerExportHostingTargetRecipe[] {
  return Object.values(hostingTargetRecipes);
}

export function getServerExportHostingTargetRecipesForFramework(framework: ServerExportFramework): ServerExportHostingTargetRecipe[] {
  return getServerExportHostingTargetRecipes().filter((recipe) => recipe.framework === framework);
}

export function createServerExportDeploymentHeaders(recipe: ServerExportDeploymentRecipe): Headers {
  return new Headers(recipe.headers);
}

export function mergeServerExportDeploymentHeaders(response: Response, recipe: ServerExportDeploymentRecipe): Response {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(recipe.headers)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function checkServerExportDeploymentReadiness(
  recipe: ServerExportDeploymentRecipe,
  env: Record<string, string | undefined>,
): ServerExportDeploymentReadiness {
  const missingEnv = recipe.requiredEnv.filter((key) => !env[key]);
  const warnings: string[] = [];

  if (!recipe.headers["cache-control"]?.includes("no-store")) {
    warnings.push("Export responses should use no-store caching.");
  }

  if (recipe.supportsStreaming && recipe.headers["x-accel-buffering"] !== "no") {
    warnings.push('Streaming exports should set x-accel-buffering to "no" when the host supports it.');
  }

  if (recipe.maxDurationSeconds < 30) {
    warnings.push("Large exports may exceed short serverless function timeouts.");
  }

  return {
    framework: recipe.framework,
    ready: missingEnv.length === 0 && warnings.length === 0,
    missingEnv,
    warnings,
  };
}

export function checkServerExportHostingTargetReadiness(
  recipe: ServerExportHostingTargetRecipe,
  env: Record<string, string | undefined>,
  availableConfigFiles: readonly string[],
): ServerExportHostingTargetReadiness {
  const availableFiles = new Set(availableConfigFiles.map(normalizeHostingConfigFilePath));
  const missingEnv = recipe.requiredEnv.filter((key) => !env[key]);
  const missingConfigFiles = recipe.configFiles.map((file) => file.path).filter((path) => !availableFiles.has(normalizeHostingConfigFilePath(path)));
  const warnings: string[] = [];

  if (recipe.streamingMode === "limited") {
    warnings.push("This hosting target needs production load tests before using large streaming exports.");
  }

  return {
    target: recipe.target,
    framework: recipe.framework,
    ready: missingEnv.length === 0 && missingConfigFiles.length === 0,
    missingEnv,
    missingConfigFiles,
    warnings,
  };
}

function normalizeHostingConfigFilePath(path: string): string {
  return path.trim().replace(/^\.\/+/, "");
}
