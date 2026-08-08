# @open-grid/theme

CSS variables and base theme for Open Grid.

Use this package when applying the default Open Grid styling tokens to a styled UI package.

## Install

```bash
npm install @open-grid/theme
```

## Usage

```ts
import "@open-grid/theme/css";
```

Import the theme before a framework UI package's CSS. Override the exposed `--og-*` custom properties on the styled `.og-grid` root to integrate Open Grid with an existing design system. The semantic `[data-open-grid]` scroller inherits those values, so toolbar controls and grid content use one token set.

## Typed Tokens

Use the optional `@open-grid/theme/tokens` entry point when product code owns theme values. It rejects unknown or empty token values at runtime and keeps CSS custom-property names out of application code:

```ts
import { createOpenGridThemeStyle } from "@open-grid/theme/tokens";

const lightGridTheme = createOpenGridThemeStyle({
  accent: "#155eef",
  focus: "#0e9384",
  surfaceSelected: "#eff4ff",
  rowHeight: "36px",
});
```

Pass the result to React's or Vue's grid-root `style` prop. React applications should cast the framework-neutral object to `CSSProperties`; Vue accepts it directly. Svelte's `style` prop is string-only, so use `createOpenGridThemeCssText`:

```ts
import { createOpenGridThemeCssText } from "@open-grid/theme/tokens";

const darkGridTheme = createOpenGridThemeCssText({
  accent: "#84adff",
  focus: "#5fe9d0",
  surfaceSelected: "#102a56",
});
```

Define separate light and dark token sets when colors need different contrast. Apply the selected values to the styled grid root while keeping `data-og-theme` on the grid or product ancestor for the remaining bundled defaults. Use product CSS such as `.billing-workspace .og-grid { --og-accent: ...; }` when themes are static.

## Customize

Apply CSS overrides to the styled grid root:

```css
.billing-workspace .og-grid {
  --og-font-family: Inter, sans-serif;
  --og-accent: #7c3aed;
  --og-focus: #0f766e;
  --og-surface-selected: #f1edff;
  --og-row-height: 36px;
  --og-header-height: 40px;
  --og-radius-lg: 4px;
  --og-shadow-md: 0 12px 28px rgb(16 24 40 / 18%);
}
```

The contract includes semantic surface, border, text, accent, danger, sizing, radius, shadow, and motion tokens. Existing base tokens such as `--og-surface`, `--og-border-color`, `--og-text`, and `--og-accent` remain supported; newer tokens let product themes distinguish raised, subtle, hover, selected, strong-border, and status states without overriding internal selectors.

## Dark Theme

Set `data-og-theme="dark"` on the grid or an ancestor. Dark tokens apply to the marked element itself and to styled or semantic grid descendants, including controls that are siblings of the semantic `[data-open-grid]` scroller. The bundled values remain fully overridable:

```html
<section data-og-theme="dark">
  <div data-open-grid><!-- framework DataGrid output --></div>
</section>
```

The theme sets `color-scheme` for native controls but does not define the surrounding application shell. Product applications remain responsible for applying matching page, toolbar, and panel colors and for choosing or persisting the active theme. A standalone unstyled `[data-open-grid]` still receives the base theme directly; inside a styled `.og-grid`, it inherits root overrides instead of redeclaring defaults.

See the [project README](https://github.com/Goatshave/open-grid#readme) for framework UI installation and examples.
