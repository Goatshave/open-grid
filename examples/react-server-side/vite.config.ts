import { defineConfig } from "vite";
import { ticketApiPlugin } from "../shared-server/src/ticket-api-server";

export default defineConfig({ plugins: [ticketApiPlugin("TCK", { valueBase: 1_500, valueStep: 83, openedMonth: "2026-06" })] });
