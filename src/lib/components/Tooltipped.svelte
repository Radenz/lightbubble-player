<script lang="ts">
  import { createTooltip, type TooltipConfig } from '@grail-ui/svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';

  export let id: string | undefined = undefined;
  export let disabled = false;

  const config: TooltipConfig = {
    openDelay: 50,
    closeDelay: 50,
    positioning: {
      fitViewport: true,
      strategy: 'fixed'
    }
  };

  const { open, useTooltip, useTooltipTrigger, triggerAttrs, tooltipAttrs, arrowAttrs } =
    createTooltip(config);
</script>

<div {id} use:useTooltipTrigger {...$triggerAttrs}>
  <slot />
</div>

{#if $open && !disabled}
  <!-- TODO: opt-out padding -->
  <div
    class="tooltip px-4 py-2 rounded text-sm text-white font-medium"
    transition:fade={{ duration: 250, easing: cubicOut }}
    use:useTooltip
    {...$tooltipAttrs}
  >
    <slot name="tooltip" />
    <div {...$arrowAttrs} />
  </div>
{/if}

<style>
  .tooltip {
    font-family: 'Inter';
    background-color: rgba(16, 16, 16, 0.6);
    backdrop-filter: blur(4px);
    z-index: 9999;
  }
</style>
