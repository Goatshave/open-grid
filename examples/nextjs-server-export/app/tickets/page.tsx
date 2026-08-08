import createNextTicketsPage from "@open-grid/example-shared-server/framework-app-examples/nextjs/app/tickets/page";

interface TicketsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const model = await createNextTicketsPage({ searchParams: await searchParams });

  return (
    <main className="export-app">
      <header className="app-header">
        <div>
          <p className="framework-label">Next.js App Router</p>
          <h1>{model.title}</h1>
          <p>Server-owned filtering with buffered and streaming CSV routes.</p>
        </div>
        <span className="result-count" role="status">
          {model.filteredCount} {model.filteredCount === 1 ? "ticket" : "tickets"}
        </span>
      </header>

      <form className="filter-bar" method="get" action="/tickets">
        <label>
          Account
          <input name="account" defaultValue={model.activeFilters.account} placeholder="Acme Labs" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={model.activeFilters.status}>
            <option value="">All statuses</option>
            <option value="Backlog">Backlog</option>
            <option value="Open">Open</option>
            <option value="Waiting">Waiting</option>
            <option value="Resolved">Resolved</option>
          </select>
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={model.activeFilters.sort}>
            <option value="">Ticket id</option>
            <option value="value-desc">Value, high to low</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
        <a className="secondary-action" href="/tickets">Reset</a>
      </form>

      <div className="table-shell">
        <table>
          <thead>
            <tr><th>Ticket</th><th>Account</th><th>Status</th><th className="numeric">Value</th></tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.id}>
                <td className="ticket-id">{row.id}</td>
                <td>{row.account}</td>
                <td><span className="status-label">{row.status}</span></td>
                <td className="numeric">${row.value.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="export-actions" aria-label="Server export actions">
        <span>Exports preserve the active account, status, and sort query.</span>
        <div>
          <a download href={model.exportHref}>Download CSV</a>
          <a download href={model.streamingExportHref}>Stream CSV</a>
        </div>
      </footer>
    </main>
  );
}
