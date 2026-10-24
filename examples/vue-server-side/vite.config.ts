import { defineConfig } from "vite";
import { ticketApiPlugin } from "../shared-server/src/ticket-api-server";

export default defineConfig({ plugins: [ticketApiPlugin("VUE", { valueBase: 1_200, valueStep: 97, openedMonth: "2026-07" })] });
