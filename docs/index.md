---
layout: home

hero:
  name: Open Grid
  text: Production data grids across frameworks
  tagline: One framework-agnostic engine with maintained React, Vue, and Svelte renderers, server workflows, and measurable performance contracts.
  image:
    src: /logo.svg
    alt: Open Grid mark
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Choose a package
      link: /packages

features:
  - title: Framework-ready
    details: Maintained styled UI and headless adapters for React, Vue, and Svelte share the same typed core.
    link: /packages
  - title: Large-data foundation
    details: Row and column virtualization, server-owned workflows, and a six-profile benchmark contract scale through one million rows.
    link: /performance
  - title: Product-owned design
    details: CSS variables, typed tokens, unstyled primitives, and composition hooks keep the product visual system in your control.
    link: /architecture
  - title: Open by default
    details: MIT licensed, package-level documentation, reproducible tests, and public release gates are part of the repository.
    link: https://github.com/Goatshave/open-grid
---

## Pick your renderer

| Product stack | Maintained package | Guide |
| --- | --- | --- |
| React 18.2 or 19 | `@open-grid/react-ui` | [React UI](./react-ui) |
| Vue 3.4 or later Vue 3 | `@open-grid/vue-ui` | [Vue UI](./vue-ui) |
| Svelte 4 or 5 | `@open-grid/svelte-ui` | [Svelte UI](./svelte-ui) |

Use the headless adapters and `@open-grid/primitives` when your application needs a fully custom renderer.
