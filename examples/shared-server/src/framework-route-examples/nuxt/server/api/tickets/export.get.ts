import { createTicketExportRouteResponse } from "../../../../shared";

interface NuxtRouteEvent {
  request?: Request;
  url?: string;
  node?: {
    req?: {
      url?: string;
      headers?: {
        host?: string;
      };
    };
  };
}

function defineEventHandler<TEvent, TResult>(handler: (event: TEvent) => TResult): (event: TEvent) => TResult {
  return handler;
}

export default defineEventHandler((event: NuxtRouteEvent): Response | Promise<Response> => {
  const url = getEventUrl(event);

  return createTicketExportRouteResponse(url.searchParams, "nuxt-server-tickets");
});

function getEventUrl(event: NuxtRouteEvent): URL {
  if (event.request) {
    return new URL(event.request.url);
  }

  const path = event.url ?? event.node?.req?.url ?? "/api/tickets/export";
  const host = event.node?.req?.headers?.host ?? "localhost";

  return new URL(path, `http://${host}`);
}
