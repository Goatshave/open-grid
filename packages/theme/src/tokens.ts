export const openGridThemeTokens = {
  fontFamily: "--og-font-family",
  fontSize: "--og-font-size",
  fontWeightMedium: "--og-font-weight-medium",
  fontWeightSemibold: "--og-font-weight-semibold",
  borderColor: "--og-border-color",
  border: "--og-border",
  borderSubtle: "--og-border-subtle",
  borderStrong: "--og-border-strong",
  surface: "--og-surface",
  surfaceRaised: "--og-surface-raised",
  surfaceMuted: "--og-surface-muted",
  surfaceSubtle: "--og-surface-subtle",
  surfaceHover: "--og-surface-hover",
  surfaceSelected: "--og-surface-selected",
  text: "--og-text",
  textMuted: "--og-text-muted",
  textSubtle: "--og-text-subtle",
  accent: "--og-accent",
  accentHover: "--og-accent-hover",
  accentSoft: "--og-accent-soft",
  focus: "--og-focus",
  danger: "--og-danger",
  dangerSoft: "--og-danger-soft",
  rowHeight: "--og-row-height",
  headerHeight: "--og-header-height",
  controlHeight: "--og-control-height",
  radiusSmall: "--og-radius-sm",
  radius: "--og-radius",
  radiusLarge: "--og-radius-lg",
  shadowSmall: "--og-shadow-sm",
  shadowMedium: "--og-shadow-md",
  shadowPinnedLeft: "--og-shadow-pinned-left",
  shadowPinnedRight: "--og-shadow-pinned-right",
  transition: "--og-transition",
} as const;

export type OpenGridThemeToken = keyof typeof openGridThemeTokens;
export type OpenGridTheme = Partial<Record<OpenGridThemeToken, string>>;
export type OpenGridThemeCustomProperty = (typeof openGridThemeTokens)[OpenGridThemeToken];
export type OpenGridThemeStyle = Partial<Record<OpenGridThemeCustomProperty, string>>;

const themeTokenNames = new Set<string>(Object.keys(openGridThemeTokens));

function getValidatedThemeEntries(theme: OpenGridTheme): Array<[OpenGridThemeCustomProperty, string]> {
  const entries: Array<[OpenGridThemeCustomProperty, string]> = [];

  for (const [token, rawValue] of Object.entries(theme)) {
    if (!themeTokenNames.has(token)) {
      throw new TypeError(`Unknown Open Grid theme token: ${token}`);
    }
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      throw new TypeError(`Open Grid theme token ${token} must be a non-empty string`);
    }

    entries.push([openGridThemeTokens[token as OpenGridThemeToken], rawValue.trim()]);
  }

  return entries;
}

export function createOpenGridThemeStyle(theme: OpenGridTheme): OpenGridThemeStyle {
  return Object.fromEntries(getValidatedThemeEntries(theme)) as OpenGridThemeStyle;
}

export function createOpenGridThemeCssText(theme: OpenGridTheme): string {
  return getValidatedThemeEntries(theme)
    .map(([property, value]) => {
      if (/[;{}]/u.test(value)) {
        throw new TypeError(`Open Grid theme token ${property} cannot contain CSS declaration delimiters`);
      }
      return `${property}: ${value}`;
    })
    .join("; ");
}
