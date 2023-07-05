<script lang="ts">
  import type { AudioTrack, NamedAudioTrack } from '$lib/player/audio';
  import type { Player } from '$lib/player/player';
  import { createEventDispatcher, getContext } from 'svelte';

  const dispatch = createEventDispatcher();

  const player = getContext('player') as Player;
  const audioTracks = player.audioTracks;

  function choose(track: NamedAudioTrack) {
    player.chooseAudioTrack(track.id);
    dispatch('choose', track.name);
  }
</script>

<div class="flex items-stretch flex-col gap-1">
  <div class="context-menu-header">Audio Track</div>
  {#if audioTracks}
    {#each audioTracks as audioTrack, index (index)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        on:click={() => {
          choose(audioTrack);
        }}
        class="setting-option"
      >
        <span>{audioTrack.name}</span>
      </div>
    {/each}
  {:else}
    None
  {/if}
</div>

<style lang="postcss">
  .setting-option {
    @apply rounded px-4 py-2 cursor-pointer;
    &:hover {
      background-color: rgba(64, 64, 64, 0.6);
    }
  }

  .context-menu-header {
    @apply rounded px-4 opacity-80 my-3 relative;

    &::after {
      @apply mx-3;
      content: '';
      border-top: 1px solid rgba(128, 128, 128, 0.4);
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: calc(100% - 24px);
    }
  }
</style>
