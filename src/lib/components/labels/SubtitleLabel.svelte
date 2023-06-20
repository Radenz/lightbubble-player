<script lang="ts">
  import type { SubtitleFormat } from '$lib/player/subtitle';

  export let format: SubtitleFormat | undefined = undefined;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  on:click
  class="subtitle-label ml-4 mr-6 relative cursor-pointer opacity-75 hover:opacity-100 w-auto font-normal"
>
  <slot />
  {#if format}
    <span class="subtitle-format-badge absolute -top-1/2 font-normal">
      {format.toUpperCase()}
    </span>
  {/if}
</div>

<style lang="postcss">
  .subtitle-label {
    @apply my-1 table;
  }

  .subtitle-format-badge {
    @apply tracking-wide;
    font-size: 9px;
    font-weight: 400;
    left: calc(100% + 4px);
  }
</style>
