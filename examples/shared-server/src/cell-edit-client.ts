import { createServerMutationCoordinator, type CellEditEvent, type ServerMutationContext, type ServerMutationFailure } from "@open-grid/core";

export interface ExampleCellEditInput {
  rowId: string;
  columnId: string;
  value: string | number;
}

/** Product adapter for the reference UIs; storage and transport remain external. */
export function createExampleCellEditController<TData, TResult = void>(options: {
  getMode: (event: CellEditEvent<TData>) => "edit" | "paste" | null;
  save: (input: ExampleCellEditInput, context: ServerMutationContext<string, TResult>) => Promise<TResult>;
  apply: (input: ExampleCellEditInput, result?: TResult) => void;
  finish: (input: ExampleCellEditInput, mode: "edit" | "paste") => void;
  status: (message: string, phase: "pending" | "committed" | "error") => void;
  classifyError?: (error: unknown) => ServerMutationFailure;
}) {
  const keyFor = (input: ExampleCellEditInput) => JSON.stringify([input.rowId, input.columnId]);
  const saves = createServerMutationCoordinator<string, ExampleCellEditInput, TResult>({
    getKey: keyFor, mutate: options.save,
    ...(options.classifyError ? { classifyError: options.classifyError } : {}),
  });
  const intents = new Map<string, number>();
  let intent = 0;
  let editorEpoch = 0;
  let statusMutation = 0;

  type PendingEdit = { input: ExampleCellEditInput; mode: "edit" | "paste"; epoch: number; token: number };
  const pendingEdits = new Map<string, PendingEdit>();
  const observe = (key: string, edit: PendingEdit, pending: ReturnType<typeof saves.run>) => pending.then((result) => {
    if (!saves.isCurrent(key, result.mutationId) || intents.get(key) !== edit.token) return result;
    const { input, mode, epoch } = edit;
    const label = mode === "paste" ? "Server paste" : "Server edit";
    if (result.status === "success") {
      options.apply(input, result.data);
      if (editorEpoch === epoch) options.finish(input, mode);
      if (statusMutation === result.mutationId) options.status(`${label}: saved ${input.rowId} ${input.columnId} = ${input.value}`, "committed");
    } else if (result.status !== "cancelled" && statusMutation === result.mutationId) {
      options.status(`${label}: failed ${input.rowId} ${input.columnId}`, "error");
    }
    return result;
  });

  return {
    invalidateEditor: () => { editorEpoch++; },
    dispose: () => saves.dispose(),
    getStates: saves.getStates,
    subscribe: saves.subscribe,
    retryFailed: () => Promise.all([...pendingEdits].flatMap(([key, edit]) => {
      if (intents.get(key) !== edit.token) return [];
      const pending = saves.retry(key);
      if (!pending) return [];
      statusMutation = saves.getState(key).mutationId!;
      options.status(`Server ${edit.mode}: saving ${edit.input.rowId} ${edit.input.columnId}`, "pending");
      return [observe(key, { ...edit, epoch: -1 }, pending)];
    })),
    discardSettled: () => {
      for (const key of pendingEdits.keys()) {
        if (saves.reset(key)) { pendingEdits.delete(key); intents.delete(key); }
      }
      editorEpoch++;
    },
    handle(event: CellEditEvent<TData>) {
      if (event.phase !== "commit") { editorEpoch++; return; }
      if (event.defaultPrevented) return;
      const input = { rowId: event.row.id, columnId: event.column.id,
        value: typeof event.value === "number" ? event.value : String(event.value ?? "") };
      const key = keyFor(input);
      const mode = options.getMode(event);
      const previous = pendingEdits.get(key);
      if (previous && intents.get(key) === previous.token && previous.input.value === input.value) {
        // Blur/Enter while an identical intent is pending or failed is not a new write.
        event.preventDefault();
        if (saves.getState(key).status === "success") options.finish(input, mode ?? previous.mode);
        return;
      }
      const token = ++intent;
      intents.set(key, token);
      if (!mode) { options.apply(input); return; }
      event.preventDefault();
      const edit = { input, mode, epoch: editorEpoch, token };
      pendingEdits.set(key, edit);
      const label = mode === "paste" ? "Server paste" : "Server edit";
      options.status(`${label}: saving ${input.rowId} ${input.columnId}`, "pending");
      const pending = saves.run(input);
      statusMutation = saves.getState(key).mutationId!;
      void observe(key, edit, pending);
    },
  };
}
