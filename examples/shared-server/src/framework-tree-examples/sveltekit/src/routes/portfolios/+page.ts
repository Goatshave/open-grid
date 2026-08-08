import { createServerTreePageModel } from "../../../../shared";

interface SvelteKitLoadEvent {
  url: URL;
}

export function load({ url }: SvelteKitLoadEvent) {
  return createServerTreePageModel({
    framework: "SvelteKit",
    searchParams: url.searchParams,
    childrenPath: "/api/portfolios/children",
  });
}
