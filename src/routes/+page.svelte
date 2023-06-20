<script lang="ts">
  import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
  import { open } from '@tauri-apps/api/dialog';
  import { appWindow } from '@tauri-apps/api/window';

  import { onMount, tick } from 'svelte';
  import { createTooltip } from '@grail-ui/svelte';
  import { Slider } from 'fluent-svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  import { Player } from '$lib/player/player';
  import { toDurationString, type Nullable } from '$lib/util';

  import Icon from '$lib/components/Icon.svelte';
  import PlayButton from '$lib/components/buttons/PlayButton.svelte';
  import SkipNextButton from '$lib/components/buttons/SkipNextButton.svelte';
  import PauseButton from '$lib/components/buttons/PauseButton.svelte';
  import VolumeOffButton from '$lib/components/buttons/VolumeOffButton.svelte';
  import VolumeOnButton from '$lib/components/buttons/VolumeOnButton.svelte';
  import FullscreenButton from '$lib/components/buttons/FullscreenButton.svelte';
  import FullscreenExitButton from '$lib/components/buttons/FullscreenExitButton.svelte';
  import Tooltipped from '$lib/components/Tooltipped.svelte';
  import { writable } from 'svelte/store';
  import SubtitleOffButton from '$lib/components/buttons/SubtitleOffButton.svelte';
  import SubtitleOnButton from '$lib/components/buttons/SubtitleOnButton.svelte';
  import ContextMenu from '$lib/components/ContextMenu.svelte';
  import SubtitleLabel from '$lib/components/labels/SubtitleLabel.svelte';
  import type { EmbeddedSubtitleMeta, ExternalSubtitleMeta } from '$lib/player/subtitle';

  const SEEK_AUTODROP_DELAY_MS = 600;
  const CONTROLS_HIDE_TIMEOUT_MS = 1000;

  let src: string = '';
  let mediaElement: HTMLMediaElement;
  let player: Player = new Player();

  let playbackDuration = writable(-1);
  let displayDuration = writable('0:00');
  let playbackTime = writable(0);
  let displayTime = writable('0:00');
  let paused = writable(false);
  let ended = writable(false);
  let muted = writable(false);
  let volume = writable(100);
  let subtitles = writable({
    external: [] as ExternalSubtitleMeta[],
    embedded: [] as EmbeddedSubtitleMeta[]
  });
  let subtitleId = writable(-1);

  let slider: HTMLDivElement;
  let sliderThumb: HTMLDivElement;
  let sliderInput: HTMLInputElement;
  let sliderFrozen = false;
  let sliderDragging = false;
  let sliderFreezingController: Nullable<AbortController> = null;
  let sliderAutoDropTimeout: Nullable<number> = null;

  let controlsHidden = true;
  // TODO: unhide controls on paused and interactions
  let controlsHideTimeout: Nullable<number> = null;

  $: volumeSliderValue = $volume;
  $: subtitleOn = $subtitleId >= 0;

  let fullscreen = false;

  function setFullscreen() {
    appWindow.setFullscreen(true).then(() => {
      fullscreen = true;
    });
  }

  function exitFullscreen() {
    appWindow.setFullscreen(false).then(() => {
      fullscreen = false;
    });
  }

  async function openFile() {
    const path = (await open({
      multiple: false
    })) as string;

    if (!path) return;
    player.useSource(path);
  }

  function seek() {
    if (!sliderFrozen) return;
    if (!sliderAutoDropTimeout) return;
    freezeSlider();

    const seekTime = +sliderInput.value;
    $displayTime = toDurationString(Math.round(seekTime));

    if (!mediaElement.seeking) {
      player.seek(seekTime);
    }
  }

  function trySeek() {
    if (sliderDragging) {
      freezeSlider();
      seek();
    }
  }

  function freezeSlider() {
    if (sliderAutoDropTimeout) clearTimeout(sliderAutoDropTimeout!);
    sliderFrozen = true;
    sliderAutoDropTimeout = setTimeout(() => {
      sliderAutoDropTimeout = null;
      sliderFrozen = false;
    }, SEEK_AUTODROP_DELAY_MS);
  }

  function unfreezeSlider() {
    if (sliderAutoDropTimeout) clearTimeout(sliderAutoDropTimeout!);
    sliderFrozen = false;
  }

  onMount(async () => {
    invoke('get_args').then(console.log);

    player.bind(mediaElement);
    player.bindDuration(playbackDuration);
    player.bindDurationString(displayDuration);
    player.bindTime(playbackTime);
    player.bindTimeString(displayTime);
    player.bindPaused(paused);
    player.bindEnded(ended);
    player.bindVolume(volume);
    player.bindMuted(muted);
    player.bindSubtitles(subtitles);

    window['player'] = player;
    window['setFullscreen'] = setFullscreen;
    window['exitFullscreen'] = () => {
      appWindow.setFullscreen(false);
    };

    await tick();
    slider.addEventListener('mousedown', () => {
      sliderDragging = true;

      if (sliderFreezingController) {
        sliderFreezingController.abort();
        sliderFreezingController = null;
      }

      freezeSlider();
      seek();
    });
    window.addEventListener('mousemove', trySeek);
    window.addEventListener('mousemove', async () => {
      if (controlsHideTimeout) clearTimeout(controlsHideTimeout);
      controlsHidden = false;
      controlsHideTimeout = setTimeout(() => {
        controlsHidden = true;
      }, CONTROLS_HIDE_TIMEOUT_MS);
    });
    window.addEventListener('mouseup', () => {
      sliderDragging = false;

      if (!sliderFrozen) return;
      if (sliderAutoDropTimeout) return;

      const seekTime = +sliderInput.value;
      player.seek(seekTime);

      sliderFreezingController = new AbortController();
      mediaElement.addEventListener(
        'seeked',
        () => {
          unfreezeSlider();
        },
        {
          signal: sliderFreezingController.signal
        }
      );
    });
  });

  $: if (sliderFrozen) {
    player.freezeTimeUpdate();
  } else {
    player.unfreezeTimeUpdate();
  }

  $: hasSubtitles = $subtitles.external.length > 0 || $subtitles.embedded.length > 0;
</script>

<!-- TODO: consider radix-svelte & shadcn-svelte for more robust components (possible BREAKING CHANGES) -->

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<!-- svelte-ignore a11y-media-has-caption -->
<video autoplay bind:this={mediaElement} {src} />
<div
  id="controls"
  class="text-white absolute flex flex-col items-stretch w-full bottom-0 px-6 py-4 opacity-100 duration-150"
  transition:fade
  class:invisible={controlsHidden}
  hidden={controlsHidden}
>
  <div id="slider">
    <Slider
      class="slider cursor-pointer"
      min={0}
      max={$playbackDuration}
      step={0.001}
      value={$playbackTime}
      on:change={sliderFrozen ? seek : null}
      bind:containerElement={slider}
      bind:inputElement={sliderInput}
      bind:thumbElement={sliderThumb}
    >
      <svelte:fragment slot="tooltip" let:value>
        <span class="volume-slider-tooltip">
          {toDurationString(Math.round(value))}
        </span>
      </svelte:fragment>
    </Slider>
  </div>
  <div id="controls-bar" class="w-full flex justify-between">
    <div id="controls-left" class="flex gap-4">
      <Tooltipped id="play-button">
        {#if $paused || $ended}
          <PlayButton on:click={player.play.bind(player)} />
        {:else}
          <PauseButton on:click={player.pause.bind(player)} />
        {/if}
        <svelte:fragment slot="tooltip">
          {#if $paused || $ended}
            Play (Space)
          {:else}
            Pause (Space)
          {/if}
        </svelte:fragment>
      </Tooltipped>
      <div id="skip-button">
        <!-- TODO: add reactivity to playlist -->
        <SkipNextButton />
      </div>
      <!-- TODO: resize based on displayTime & displayDuration text length -->
      <div id="time" class="w-20 flex justify-between items-center">
        <span style="flex-basis: 45%;">{$displayTime}</span>
        <span class="text-center" style="flex-basis: 10%;">/</span>
        <span class="text-right" style="flex-basis: 45%;">{$displayDuration}</span>
      </div>
    </div>
    <div id="controls-right" class="flex items-center gap-4">
      <!-- TODO: don't hide controls if menu is opened -->
      <ContextMenu id="subtitle-button" let:isOpen>
        <!-- TODO: turn off subtitles on click -->
        <Tooltipped id="subtitle-button" disabled={isOpen}>
          {#if subtitleOn}
            <SubtitleOffButton on:click={null} />
          {:else}
            <SubtitleOnButton on:click={null} />
          {/if}
          <svelte:fragment slot="tooltip">
            {#if !subtitleOn}
              Subtitle (C)
            {:else}
              Turn Off Subtitle (C)
            {/if}
          </svelte:fragment>
        </Tooltipped>
        <svelte:fragment slot="menu">
          <div>
            {#if hasSubtitles}
              {#if $subtitles.external.length > 0}
                <div>
                  <div class="context-menu-header">External</div>
                  {#each $subtitles.external as subtitle}
                    <SubtitleLabel format={subtitle.ext}>{subtitle.basename}</SubtitleLabel>
                  {/each}
                </div>
              {/if}
              {#if $subtitles.embedded.length > 0}
                <div>
                  <div class="context-menu-header dense">Embedded</div>
                  {#each $subtitles.embedded as _, index}
                    <SubtitleLabel>Track {index + 1}</SubtitleLabel>
                  {/each}
                </div>
              {/if}
            {:else}
              No subtitles detected
            {/if}
          </div>
        </svelte:fragment>
      </ContextMenu>
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
            <span class="volume-slider-tooltip">{value}%</span>
          </svelte:fragment>
        </Slider>
      </div>
      <Tooltipped id="fullscreen-button">
        {#if !fullscreen}
          <FullscreenButton on:click={setFullscreen} />
        {:else}
          <FullscreenExitButton on:click={exitFullscreen} />
        {/if}
        <svelte:fragment slot="tooltip">
          {#if fullscreen}
            Exit Fullscreen (F)
          {:else}
            Fullscreen (F)
          {/if}
        </svelte:fragment>
      </Tooltipped>
    </div>
  </div>
</div>

<button on:click={openFile} class="text-white">OPEN FILE</button>

<style lang="postcss">
  video {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    /* border: 2px solid red; */
    /* border-radius: 4px; */
  }

  button {
    position: absolute;
    top: 0;
    left: 0;
  }

  #time {
    box-sizing: border-box;
    color: white;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
  }

  #controls {
    /* position: absolute;
		box-sizing: border-box;
		display: flex;
		flex-direction: row;
		gap: 16px;
		padding: 2px 16px;
		align-items: center;
		justify-content: space-around;
		width: 100vw;
		bottom: 0; */
    background-color: rgba(0, 0, 0, 0.8);

    &[hidden] {
      opacity: 0;
    }
  }

  /* #slider {
    flex: 1;
    box-sizing: border-box;
  } */

  .context-menu-header {
    @apply text-xs font-light opacity-80 pb-1 my-3 relative;

    &.dense {
      @apply mb-1;
    }

    &::after {
      content: '';
      border-top: 1px solid rgba(128, 128, 128, 0.4);
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
    }
  }

  .volume-slider-tooltip {
    @apply text-sm font-semibold;
    font-family: 'Inter';
  }
</style>
