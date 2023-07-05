<script lang="ts">
  import type { SubtitleFormat } from '$lib/player/subtitle';

  export let format: SubtitleFormat | undefined = undefined;
  export let enabled = false;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  on:click
  class="subtitle-label relative cursor-pointer opacity-75 hover:opacity-100 w-auto font-normal"
  class:enabled
>
  <slot />
  {#if format}
    <span class="subtitle-format-badge relative bottom-2 font-normal">
      {format.toUpperCase()}
    </span>
  {/if}
</div>

<style lang="postcss">
  .subtitle-label {
    @apply rounded px-4 py-2 cursor-pointer;
    &:hover {
      background-color: rgba(64, 64, 64, 0.6);
    }

    &.enabled {
      color: #18c9ff;
      font-weight: bolder;
      /* background-color: rgba(24, 201, 255, 0.6); */
    }
  }

  .subtitle-format-badge {
    @apply tracking-tighter rounded-full;
    color: #101010;
    font-size: 9px;
    font-weight: 600;
    padding: 1px 4px;
    background-color: #18c9ff;
  }
</style>
