import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { ticketApiPlugin } from "../shared-server/src/ticket-api-server";

export default defineConfig({ plugins: [svelte(), ticketApiPlugin("SVL", { valueBase: 1_350, valueStep: 89, openedMonth: "2026-08" })] });
