<script lang="ts">
  import { getContext } from 'svelte';
  import Tooltipped from '../Tooltipped.svelte';
  import VolumeOffButton from '../buttons/VolumeOffButton.svelte';
  import VolumeOnButton from '../buttons/VolumeOnButton.svelte';
  import type { Player } from '$lib/player/player';
  import { writable } from 'svelte/store';
  import { Slider } from 'fluent-svelte';

  const muted = writable(false);
  const volume = writable(100);

  const player = getContext('player') as Player;
  player.bindMuted(muted);
  player.bindVolume(volume);

  $: volumeSliderValue = $volume;
  const showControls = getContext('showControls') as () => void;

  volume.subscribe((_) => {
    showControls();
  });
</script>

<Tooltipped id="volume-button">
  {#if $muted}
    <VolumeOffButton on:click={player.unmute.bind(player)} />
  {:else}
    <VolumeOnButton on:click={player.mute.bind(player)} />
  {/if}
  <svelte:fragment slot="tooltip">
    {#if $muted}
      Unmute (M)
    {:else}
      Mute (M)
    {/if}
  </svelte:fragment>
</Tooltipped>

<div id="volume-slider" class="w-32">
  <!-- TODO: rip off the source, make custom slider -->
  <Slider
    class="slider cursor-pointer"
    min={0}
    max={100}
    step={1}
    bind:value={volumeSliderValue}
    on:change={() => player.setVolume(volumeSliderValue)}
  >
    <svelte:fragment slot="tooltip" let:value>
      <span class="tooltip">{value}%</span>
    </svelte:fragment>
  </Slider>
</div>

<style lang="postcss">
  .tooltip {
    @apply text-sm font-semibold;
    font-family: 'Inter';
  }
</style>
