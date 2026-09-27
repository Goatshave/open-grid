# Localization

The styled React, Vue, and Svelte grids accept the same typed `localization` prop.
Pass only the messages you need to replace; Open Grid fills the remaining values from
the immutable English dictionary.

```ts
import type { GridLocalizationOverrides } from "@open-grid/react-ui";

export const koKR: GridLocalizationOverrides = {
  dataGridLabel: "데이터 표",
  noRows: "행이 없습니다",
  loadingRows: "행을 불러오는 중...",
  searchRowsPlaceholder: "행 검색",
  selectedRows: (count) => `${count}개 행 선택됨`,
  pageStatus: (page, pageCount) => `${pageCount}쪽 중 ${page}쪽`,
  paginationActionLabel: (action) => ({
    first: "첫 페이지",
    previous: "이전 페이지",
    next: "다음 페이지",
    last: "마지막 페이지",
  })[action],
};
```

## Framework usage

React:

```tsx
<DataGrid data={rows} columns={columns} localization={koKR} />
```

Vue:

```ts
h(DataGrid, { options, localization: koKR })
```

Svelte:

```svelte
<DataGrid {options} localization={koKR} />
```

The same contract is exported by `@open-grid/react-ui`, `@open-grid/vue-ui`,
`@open-grid/svelte-ui`, and `@open-grid/primitives`. Primitive-only consumers can
resolve a dictionary once and pass it to localization-aware helpers:

```ts
import { createGridLocalization, getPaginationButtonProps } from "@open-grid/primitives";

const localization = createGridLocalization(koKR);
const nextButton = getPaginationButtonProps({ action: "next" }, localization);
```

## Contract

The dictionary covers default grid and empty-state labels, loading and error states,
filtering, selection, column visibility, density, pagination, resizing, pinning,
header menus, grouping, row expansion, and editor accessibility labels. Dynamic
messages are functions so consumers control grammar and pluralization.

Explicit `ariaLabel`, `emptyState`, `loadingState`, and `errorState` props take
precedence over localization defaults. Localization is instance-scoped and does not
mutate global state, so different grids can use different languages safely during SSR.

`DEFAULT_GRID_LOCALIZATION` contains the complete English contract.
`createGridLocalization(overrides)` returns a frozen resolved dictionary and leaves
the default dictionary unchanged.
