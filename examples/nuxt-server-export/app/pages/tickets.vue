<script setup lang="ts">
import { createNuxtTicketsPage } from "@open-grid/example-shared-server/framework-app-examples/nuxt/pages/tickets";

useHead({
  title: "Open Grid Nuxt Server Export",
  meta: [{ name: "description", content: "Runnable Nuxt server export integration for Open Grid." }],
});

const route = useRoute();
const model = computed(() => createNuxtTicketsPage(new URL(route.fullPath, "http://open-grid.local")));
</script>

<template>
  <main class="export-app">
    <header class="app-header">
      <div>
        <p class="framework-label">Nuxt Nitro</p>
        <h1>{{ model.title }}</h1>
        <p>Server-owned filtering with buffered and streaming CSV routes.</p>
      </div>
      <span class="result-count" role="status">
        {{ model.filteredCount }} {{ model.filteredCount === 1 ? "ticket" : "tickets" }}
      </span>
    </header>

    <form class="filter-bar" method="get" action="/tickets">
      <label>
        Account
        <input name="account" :value="model.activeFilters.account" placeholder="Acme Labs" />
      </label>
      <label>
        Status
        <select name="status" :value="model.activeFilters.status">
          <option value="">All statuses</option>
          <option value="Backlog">Backlog</option>
          <option value="Open">Open</option>
          <option value="Waiting">Waiting</option>
          <option value="Resolved">Resolved</option>
        </select>
      </label>
      <label>
        Sort
        <select name="sort" :value="model.activeFilters.sort">
          <option value="">Ticket id</option>
          <option value="value-desc">Value, high to low</option>
        </select>
      </label>
      <button type="submit">Apply filters</button>
      <a class="secondary-action" href="/tickets">Reset</a>
    </form>

    <div class="table-shell">
      <table>
        <thead>
          <tr><th>Ticket</th><th>Account</th><th>Status</th><th class="numeric">Value</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in model.rows" :key="row.id">
            <td class="ticket-id">{{ row.id }}</td>
            <td>{{ row.account }}</td>
            <td><span class="status-label">{{ row.status }}</span></td>
            <td class="numeric">${{ row.value.toLocaleString("en-US") }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="export-actions" aria-label="Server export actions">
      <span>Exports preserve the active account, status, and sort query.</span>
      <div>
        <a download :href="model.exportHref">Download CSV</a>
        <a download :href="model.streamingExportHref">Stream CSV</a>
      </div>
    </footer>
  </main>
</template>
