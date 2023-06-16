<script lang="ts">
  import { createPopover, type PopoverConfig } from '@grail-ui/svelte/popover';
  import { createEventDispatcher } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';

  export let id: string | undefined = undefined;
  export let isOpen = false;

  const config: PopoverConfig = {
    positioning: {
      fitViewport: true,
      strategy: 'fixed'
    }
  };
  const dispatch = createEventDispatcher();

  const { usePopoverTrigger, triggerAttrs, usePopover, popoverAttrs, closeButtonAttrs, open } =
    createPopover(config);

  $: if (open) {
    dispatch('open');
  }

  $: {
    isOpen = $open;
  }
</script>

<div {id} use:usePopoverTrigger {...$triggerAttrs}>
  <slot {isOpen} />
</div>

{#if $open}
  <div
    class="menu px-4 py-2 rounded text-sm text-white font-medium"
    transition:fade={{ duration: 250, easing: cubicOut }}
    use:usePopover
    {...$popoverAttrs}
  >
    <slot name="menu" />
  </div>
{/if}

<style>
  .menu {
    font-family: 'Inter';
    background-color: #474747;
    z-index: 9999;
  }

  .menu:focus {
    outline: none;
  }
</style>
