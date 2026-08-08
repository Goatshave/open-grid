import { describe, expect, test } from "vitest";
import { createChunkedServerCsvExport, createServerCsvResponse, createStreamingServerCsvResponse } from "../src/index";

interface Row {
  id: string;
  account: string;
  value: number;
}

const rows: Row[] = [
  { id: "TCK-001", account: "Acme Labs", value: 100 },
  { id: "TCK-002", account: 'North "Quoted"', value: 200 },
  { id: "TCK-003", account: "Blue\nRiver", value: 300 },
];

describe("shared server CSV export helpers", () => {
  test("chunks server-owned rows into a core ExportFile", async () => {
    const chunks: Array<{ chunkIndex: number; rowCount: number }> = [];
    const result = await createChunkedServerCsvExport({
      rows,
      columns: [
        { id: "id", header: "Ticket" },
        { id: "account", header: "Account" },
        { id: "value", header: "Value", value: (row) => `$${row.value}` },
      ],
      filename: "server-tickets",
      chunkSize: 2,
      onChunk: (chunk) => {
        chunks.push(chunk);
      },
    });

    expect(result.file.filename).toBe("server-tickets.csv");
    expect(result.file.mimeType).toBe("text/csv;charset=utf-8");
    expect(result.rowCount).toBe(3);
    expect(result.chunkCount).toBe(2);
    expect(chunks).toEqual([
      { chunkIndex: 1, rowCount: 2 },
      { chunkIndex: 2, rowCount: 3 },
    ]);
    expect(result.file.text).toBe(
      'Ticket,Account,Value\nTCK-001,Acme Labs,$100\nTCK-002,"North ""Quoted""",$200\nTCK-003,"Blue\nRiver",$300',
    );
  });

  test("creates a route-handler friendly CSV response", async () => {
    const result = await createChunkedServerCsvExport({
      rows: rows.slice(0, 1),
      columns: [
        { id: "id", header: "Ticket" },
        { id: "account", header: "Account" },
      ],
      filename: 'tickets "daily"',
    });
    const response = createServerCsvResponse(result.file, { status: 202 });

    expect(response.status).toBe(202);
    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="tickets -daily-.csv"');
    expect(await response.text()).toBe("Ticket,Account\nTCK-001,Acme Labs");
  });

  test("streams CSV rows in pull-sized chunks without buffering the full export", async () => {
    const chunks: Array<{ chunkIndex: number; rowCount: number }> = [];
    const response = createStreamingServerCsvResponse(
      {
        rows,
        columns: [
          { id: "id", header: "Ticket" },
          { id: "account", header: "Account" },
        ],
        filename: "streamed-tickets",
        chunkSize: 2,
        includeByteOrderMark: true,
        onChunk: (chunk) => {
          chunks.push(chunk);
        },
      },
      { status: 203 },
    );
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8", { ignoreBOM: true });

    expect(reader).toBeDefined();
    expect(response.status).toBe(203);
    expect(response.headers.get("content-type")).toBe("text/csv;charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="streamed-tickets.csv"');

    const first = await reader!.read();
    const second = await reader!.read();
    const third = await reader!.read();
    const fourth = await reader!.read();

    expect(decoder.decode(first.value)).toBe("\uFEFFTicket,Account");
    expect(decoder.decode(second.value)).toBe('\nTCK-001,Acme Labs\nTCK-002,"North ""Quoted"""');
    expect(decoder.decode(third.value)).toBe('\nTCK-003,"Blue\nRiver"');
    expect(fourth.done).toBe(true);
    expect(chunks).toEqual([
      { chunkIndex: 1, rowCount: 2 },
      { chunkIndex: 2, rowCount: 3 },
    ]);
  });

  test("cancels the underlying server row iterator when a streaming response is abandoned", async () => {
    let cancelled = false;
    const rowsWithCancel: AsyncIterable<Row> = {
      [Symbol.asyncIterator]() {
        const iterator = rows[Symbol.iterator]();

        return {
          next: async () => iterator.next(),
          return: async () => {
            cancelled = true;
            return { done: true, value: undefined };
          },
        };
      },
    };
    const response = createStreamingServerCsvResponse({
      rows: rowsWithCancel,
      columns: [
        { id: "id", header: "Ticket" },
        { id: "account", header: "Account" },
      ],
      filename: "cancelled-tickets",
      chunkSize: 1,
    });
    const reader = response.body?.getReader();

    expect(reader).toBeDefined();
    await reader!.read();
    await reader!.cancel();

    expect(cancelled).toBe(true);
  });
});
