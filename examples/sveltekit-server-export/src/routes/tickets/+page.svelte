<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Open Grid SvelteKit Server Export</title>
  <meta name="description" content="Runnable SvelteKit server export integration for Open Grid." />
</svelte:head>

<main class="export-app">
  <header class="app-header">
    <div>
      <p class="framework-label">SvelteKit adapter-node</p>
      <h1>{data.title}</h1>
      <p>Server-owned filtering with buffered and streaming CSV routes.</p>
    </div>
    <span class="result-count" role="status">
      {data.filteredCount} {data.filteredCount === 1 ? "ticket" : "tickets"}
    </span>
  </header>

  <form class="filter-bar" method="get" action="/tickets">
    <label>
      Account
      <input name="account" value={data.activeFilters.account} placeholder="Acme Labs" />
    </label>
    <label>
      Status
      <select name="status" value={data.activeFilters.status}>
        <option value="">All statuses</option>
        <option value="Backlog">Backlog</option>
        <option value="Open">Open</option>
        <option value="Waiting">Waiting</option>
        <option value="Resolved">Resolved</option>
      </select>
    </label>
    <label>
      Sort
      <select name="sort" value={data.activeFilters.sort}>
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
        {#each data.rows as row (row.id)}
          <tr>
            <td class="ticket-id">{row.id}</td>
            <td>{row.account}</td>
            <td><span class="status-label">{row.status}</span></td>
            <td class="numeric">${row.value.toLocaleString("en-US")}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <footer class="export-actions" aria-label="Server export actions">
    <span>Exports preserve the active account, status, and sort query.</span>
    <div>
      <a download href={data.exportHref}>Download CSV</a>
      <a download href={data.streamingExportHref}>Stream CSV</a>
    </div>
  </footer>
</main>
