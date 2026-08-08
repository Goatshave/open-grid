import { createServerTreeChildrenRouteResponse } from "../../../../../../shared";

interface SvelteKitRequestEvent {
  request: Request;
}

export const prerender = false;

export function GET({ request }: SvelteKitRequestEvent): Response {
  return createServerTreeChildrenRouteResponse(request);
}
