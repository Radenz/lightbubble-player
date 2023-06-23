<script lang="ts">
  import { createPopover, type PopoverConfig } from '@grail-ui/svelte/popover';
  import { createEventDispatcher, getContext } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import InvisibleScrim from './misc/InvisibleScrim.svelte';
  import type { Writable } from 'svelte/store';
  import type { Nullable } from '$lib/util';

  export let id: string;
  export let pad = true;

  let height: number = window.innerHeight;

  const config: PopoverConfig = {
    positioning: {
      fitViewport: true,
      strategy: 'fixed'
    }
  };
  const dispatch = createEventDispatcher();
  const openContextMenu = getContext('openContextMenu') as Writable<Nullable<string>>;

  const { usePopoverTrigger, triggerAttrs, usePopover, popoverAttrs, closeButtonAttrs, open } =
    createPopover(config);

  $: if ($open) {
    dispatch('open');
    $openContextMenu = id;
  } else {
    dispatch('close');
    $openContextMenu = null;
  }

  export function show() {
    $open = true;
  }

  export function hide() {
    $open = false;
  }

  $: maxHeight = `${height / 2}px`;
</script>

<svelte:window bind:innerHeight={height} />

<div {id} use:usePopoverTrigger {...$triggerAttrs}>
  <slot isOpen={$open} />
</div>

{#if $open}
  <InvisibleScrim />
  <div
    class="menu min-w-[160px] rounded text-sm text-white font-medium overflow-y-scroll"
    class:px-4={pad}
    class:py-2={pad}
    style:--max-height={maxHeight}
    transition:fade={{ duration: 250, easing: cubicOut }}
    use:usePopover
    {...$popoverAttrs}
  >
    <slot name="menu" />
  </div>
{/if}

<style lang="postcss">
  .menu {
    max-height: var(--max-height) !important;
    font-family: 'Inter';
    /* background-color: #474747; */
    background-color: rgba(16, 16, 16, 0.6);
    backdrop-filter: blur(4px);
    z-index: 9999;
  }

  .menu::-webkit-scrollbar {
    @apply cursor-pointer appearance-none rounded-r-full;
    width: 8px;
  }

  .menu::-webkit-scrollbar-track {
    @apply cursor-pointer rounded-r-full;
    background-color: rgba(16, 16, 16, 0.6);
  }

  .menu::-webkit-scrollbar-thumb {
    @apply cursor-pointer rounded-full;
    background-color: rgba(128, 128, 128, 0.8);
  }

  .menu:focus {
    outline: none;
  }
</style>
