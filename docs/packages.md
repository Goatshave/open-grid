# Packages

Open Grid publishes ten focused packages at the same version. Start with a maintained UI package unless your product needs to own the entire renderer.

The 0.1 framework contract supports React 18.2 through 19, Vue 3.4 and later
Vue 3 releases, and Svelte 4.2.20 through 5. All packages are ESM and
TypeScript-first; the framework-independent packages also work in modern
JavaScript projects.

<a id="core"></a>
## `@open-grid/core`

Framework-agnostic grid state, typed columns, row models, sorting, filtering, grouping, tree data, pagination, selection, editing, and export contracts.

<a id="react"></a>
## `@open-grid/react`

Thin React adapter for controlled and uncontrolled core state. Pair it with `@open-grid/primitives` for custom rendering.

<a id="react-ui"></a>
## `@open-grid/react-ui`

Maintained styled React renderer. See the [React UI guide](./react-ui).

<a id="vue"></a>
## `@open-grid/vue`

Vue adapter exposing the shared core through reactive framework contracts.

<a id="vue-ui"></a>
## `@open-grid/vue-ui`

Maintained styled Vue renderer. See the [Vue UI guide](./vue-ui).

<a id="svelte"></a>
## `@open-grid/svelte`

Svelte store adapter for the shared framework-agnostic engine.

<a id="svelte-ui"></a>
## `@open-grid/svelte-ui`

Maintained styled Svelte renderer. See the [Svelte UI guide](./svelte-ui).

<a id="virtual"></a>
## `@open-grid/virtual`

Framework-independent row and column virtualization calculations and measurement caches.

<a id="primitives"></a>
## `@open-grid/primitives`

Unstyled DOM props, interaction guards, layout helpers, and renderer-shared accessibility contracts.

<a id="theme"></a>
## `@open-grid/theme`

Default CSS theme, CSS custom properties, and typed light/dark product token adapters.
