<script lang="ts">
  import { subtitleDisplay } from '$lib/store/player';

  let width = window.innerWidth;
  $: boxWidth = `${width * 0.6}px`;
</script>

<svelte:window bind:innerWidth={width} />

<!-- TODO: make position adjustable -->
{#if $subtitleDisplay}
  <div id="subtitle-display" style:width={boxWidth}>
    <span>
      {$subtitleDisplay}
    </span>
  </div>
{/if}

<style lang="postcss">
  /* TODO: adjust bottom position based on controlsHidden */
  #subtitle-display {
    @apply text-white text-lg p-4
      fixed w-60 z-[9000] left-1/2 -translate-x-1/2 bottom-24
      text-center;

    & > span {
      @apply bg-black bg-opacity-50 px-2 py-1 box-decoration-clone;
      -webkit-box-decoration-break: clone;
    }
  }
</style>
