<script lang="ts">
  import { createPopover, type PopoverConfig } from '@grail-ui/svelte/popover';
  import { createEventDispatcher, getContext } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import InvisibleScrim from './misc/InvisibleScrim.svelte';
  import type { Writable } from 'svelte/store';

  export let id: string;
  export let pad = true;

  const config: PopoverConfig = {
    positioning: {
      fitViewport: true,
      strategy: 'fixed'
    }
  };
  const dispatch = createEventDispatcher();
  const openContextMenus = getContext('openContextMenus') as Writable<string[]>;

  const { usePopoverTrigger, triggerAttrs, usePopover, popoverAttrs, closeButtonAttrs, open } =
    createPopover(config);

  $: if ($open) {
    dispatch('open');
    if (!$openContextMenus.includes(id)) $openContextMenus = [...$openContextMenus, id];
  } else {
    dispatch('close');
    if ($openContextMenus.includes(id))
      $openContextMenus = $openContextMenus.filter((contextMenuId) => contextMenuId !== id);
  }

  export function show() {
    $open = true;
  }

  export function hide() {
    $open = false;
  }
</script>

<div {id} use:usePopoverTrigger {...$triggerAttrs}>
  <slot isOpen={$open} />
</div>

{#if $open}
  <InvisibleScrim />
  <div
    class="menu rounded text-sm text-white font-medium"
    class:px-4={pad}
    class:py-2={pad}
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
    /* background-color: #474747; */
    background-color: rgba(16, 16, 16, 0.6);
    backdrop-filter: blur(4px);
    z-index: 9999;
  }

  .menu:focus {
    outline: none;
  }
</style>
