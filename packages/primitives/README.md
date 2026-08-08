# @open-grid/primitives

Unstyled DOM prop helpers and interaction utilities for Open Grid renderers.

Use this package when building framework UI layers that need shared accessibility attributes and renderer-neutral DOM behavior.

## Install

```bash
npm install @open-grid/primitives
```

Most applications should consume these contracts through `@open-grid/react-ui`, `@open-grid/vue-ui`, or `@open-grid/svelte-ui`. Direct use is intended for custom renderer authors who need the same accessibility, interaction, preference, clipboard, download, and measurement behavior.

Versioned grid-preference helpers serialize, parse, read, write, and remove durable column visibility, sizing, order, pinning, and density preferences. Product-provided valid column ids remove stale or unknown fields, malformed values are normalized safely, transient query and interaction state is never serialized, and unavailable or denied browser storage degrades to a no-op.

Header drag end action helpers keep drag-to-group-panel and column-reorder decisions aligned across React, Vue, and Svelte renderers, including shared action type guards.

Pointer drag movement helpers keep drag-threshold state updates shared while renderers retain pointer listener lifecycles.

Pointer listener target helpers keep default browser listener targets and SSR-safe no-op cleanup shared while renderers retain pointer session state.

Pointer capture target helpers keep pointer capture event target extraction, structural target guarding, and failure handling shared while preserving renderer-owned pointer lifecycles.

Measured block-size target helpers keep ResizeObserver row-height fallback handling structural while renderers retain actual observer lifecycles.

Measured element target guards keep renderer measurement callbacks on shared structural row/column element contracts.

ResizeObserver dataset target guards keep row/column measurement id lookup structural while renderers retain observer lifecycle and element registration.

ResizeObserver constructor helpers keep browser support detection and observer creation shared while renderers retain lifecycle timing and state updates.

Cell editor focus helpers keep autofocus and selectable-editor text selection shared while renderers retain lifecycle timing.

Cell editor event value helpers keep React/Vue direct editor structural target value handling aligned while Svelte retains declarative value binding.

Cell edit validation message helpers keep invalid edit message fallback handling shared through a structural validation event contract.

Browser text IO environment helpers keep clipboard and export-download default browser adapters shared while preserving renderer-owned user-trigger timing.

Grid shortcut target helpers keep interactive-control isolation and keyboard event target/currentTarget extraction shared across React, Vue, and Svelte renderers.

Row-selection toggle guards keep preventable click and keyboard row-selection decisions shared across React, Vue, and Svelte renderers.

Prevented-event default reflection helpers keep core event `preventDefault()` decisions aligned when renderers need to reflect them onto source DOM events.

Column resize default-prevention guards keep start and apply decisions shared while renderers retain pointer and keyboard event wiring.

Virtual row, body, inline-size, group indentation, and pinned-column offset style helpers keep row virtualization positioning, total-height output, canvas widths, spacer widths, virtualized header-row widths, grouped-row padding, and sticky pinned offsets aligned across object-style and text-style renderer bindings.

Header action menu descriptor helpers keep default item labels, disabled states, ordering, and grouping availability shared across renderers.

Row and column id/index lookup helpers keep renderer-owned collections searchable through the same primitive helpers.

Header action menu item type guards keep action, custom, label, and separator narrowing shared while custom item helpers also share user-prop fallback behavior.

Header action menu keyboard action type guards keep close, focus, and tab-close branching shared while renderers retain scheduling and DOM focus timing.

Header action menu active-element helpers keep owner-document and fallback-document focus lookup shared while renderers retain menu scheduling.

Header action menu focus target helpers keep keyboard event menu-container extraction and structural target shape validation shared across renderers.

Header action menu trigger focus helpers keep direct/id-based structural trigger focus restoration shared while renderers retain scheduling timing.

Header action menu structural item focus helpers filter focusable menu items and report whether a menu focus target was available while preserving renderer-owned scheduling.
