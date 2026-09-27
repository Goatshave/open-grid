<script lang="ts">
  interface RendererDescriptor {
    type: "open-grid:svelte-renderer";
    component: unknown;
    context: unknown;
    props?: Record<string, unknown>;
  }

  type RendererComponent = any;

  export let value: unknown;

  const isRendererDescriptor = (candidate: unknown): candidate is RendererDescriptor =>
    typeof candidate === "object"
    && candidate !== null
    && (candidate as { type?: unknown }).type === "open-grid:svelte-renderer"
    && "component" in candidate;

  $: descriptor = isRendererDescriptor(value) ? value : null;
  $: component = descriptor?.component as RendererComponent;
</script>

{#if descriptor && component}
  <svelte:component this={component} {...descriptor.props} context={descriptor.context} />
{:else}
  {String(value ?? "")}
{/if}
