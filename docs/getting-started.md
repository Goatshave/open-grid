# Getting started

Open Grid separates its framework-agnostic engine, framework adapters, styled UI renderers, virtualization primitives, and theme tokens. Most applications should start with the maintained UI package for their framework.

## Install

::: code-group

```bash [React]
npm install @open-grid/react-ui @open-grid/theme react react-dom
```

```bash [Vue]
npm install @open-grid/vue-ui @open-grid/theme vue
```

```bash [Svelte]
npm install @open-grid/svelte-ui @open-grid/theme svelte
```

:::

## Choose a rendering layer

- Use `@open-grid/react-ui`, `@open-grid/vue-ui`, or `@open-grid/svelte-ui` for the maintained product-ready grid surface.
- Use `@open-grid/react`, `@open-grid/vue`, or `@open-grid/svelte` with `@open-grid/primitives` for a custom renderer.
- Use `@open-grid/core` directly for framework-independent state and row-model workflows.

## Compatibility

Open Grid is TypeScript-first and publishes ESM packages with bundled type
declarations. Modern JavaScript applications can use the same runtime APIs with
`import`, but CommonJS `require()`, UMD bundles, and a maintained vanilla-JavaScript
UI renderer are not part of the 0.1 support contract.

| Integration | Supported range | Release validation |
| --- | --- | --- |
| React | `>=18.2.0 <20` | React 18.3.1 and 19.2.8 |
| Vue | `>=3.4.0 <4` | Vue 3.4.38 and 3.5.41 |
| Svelte | `>=4.2.20 <6` | Svelte 4.2.20 and 5.56.8 |
| TypeScript | Type declarations included | TypeScript 5.7 and 5.9 workspace builds |
| JavaScript | Modern ESM | Same compiled runtime APIs without static typing |

`@open-grid/core` and `@open-grid/virtual` do not require React, Vue, or Svelte.
Use them directly from TypeScript or JavaScript when a product owns its rendering
layer. Framework adapters declare their host framework as a peer dependency, so the
application controls that framework version and Open Grid does not bundle a second
copy.

## Add styles

The maintained UI packages require the shared theme and renderer styles.

::: code-group

```ts [React]
import "@open-grid/theme/css";
import "@open-grid/react-ui/css";
```

```ts [Vue]
import "@open-grid/theme/css";
import "@open-grid/vue-ui/css";
```

```ts [Svelte]
import "@open-grid/theme/css";
import "@open-grid/svelte-ui/css";
```

:::

Continue with the [React](./react-ui), [Vue](./vue-ui), or [Svelte](./svelte-ui) guide for typed columns, controlled state, virtualization, editing, grouping, and server-owned workflows.
