import { createServerTreeChildrenRouteResponse } from "../../../../../shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Response {
  return createServerTreeChildrenRouteResponse(request);
}
