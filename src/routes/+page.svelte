<script lang="ts">
  import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
  import { open } from '@tauri-apps/api/dialog';
  import { appWindow } from '@tauri-apps/api/window';

  import { getContext, onMount, setContext, tick } from 'svelte';
  import { Slider } from 'fluent-svelte';
  import { fade } from 'svelte/transition';

  import { Player } from '$lib/player/player';
  import { toDurationString, type Nullable } from '$lib/util';

  import PlayButton from '$lib/components/buttons/PlayButton.svelte';
  import SkipNextButton from '$lib/components/buttons/SkipNextButton.svelte';
  import PauseButton from '$lib/components/buttons/PauseButton.svelte';
  import FullscreenButton from '$lib/components/buttons/FullscreenButton.svelte';
  import FullscreenExitButton from '$lib/components/buttons/FullscreenExitButton.svelte';
  import Tooltipped from '$lib/components/Tooltipped.svelte';
  import { writable, type Writable } from 'svelte/store';
  import VolumeControl from '$lib/components/controls/VolumeControl.svelte';
  import SubtitleControl from '$lib/components/controls/SubtitleControl.svelte';
  import { captureCursor } from '$lib/actions/capture_cursor';
  import SettingsControl from '$lib/components/controls/SettingsControl.svelte';
  import TimeDurationDisplay from '$lib/components/controls/TimeDurationDisplay.svelte';
  import SubtitleDisplay from '$lib/components/SubtitleDisplay.svelte';

  const SEEK_AUTODROP_DELAY_MS = 600;
  const CONTROLS_HIDE_TIMEOUT_MS = 1000;

  let src: string = '';
  let mediaElement: HTMLMediaElement;
  let player: Player = new Player();
  setContext('player', player);

  let playbackDuration = writable(-1);
  let displayDuration = writable('0:00');
  let playbackTime = writable(0);
  let displayTime = writable('0:00');
  let paused = writable(false);
  let ended = writable(false);
  let fullscreen = writable(false);

  let slider: HTMLDivElement;
  let sliderThumb: HTMLDivElement;
  let sliderInput: HTMLInputElement;
  let sliderFrozen = false;
  let sliderDragging = false;
  let sliderFreezingController: Nullable<AbortController> = null;
  let sliderAutoDropTimeout: Nullable<number> = null;

  let controlsHidden = true;
  let controlsHideTimeout: Nullable<number> = null;
  let controlsFrozen = false;
  let cursorInsideControls = writable(false);
  let openContextMenu: Writable<Nullable<string>> = writable(null);
  setContext('openContextMenu', openContextMenu);

  function setFullscreen() {
    appWindow.setFullscreen(true).then(() => {
      $fullscreen = true;
    });
  }

  function exitFullscreen() {
    appWindow.setFullscreen(false).then(() => {
      $fullscreen = false;
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

  function freezeControls() {
    controlsHidden = false;
    if (controlsHideTimeout) clearTimeout(controlsHideTimeout);
    controlsFrozen = true;
  }

  function unfreezeControls() {
    controlsFrozen = false;
    controlsHideTimeout = setTimeout(() => {
      controlsHidden = true;
    }, CONTROLS_HIDE_TIMEOUT_MS);
  }

  function showControls() {
    if (controlsHideTimeout) clearTimeout(controlsHideTimeout);
    if (controlsFrozen) return;
    controlsHidden = false;
    controlsHideTimeout = setTimeout(() => {
      controlsHidden = true;
    }, CONTROLS_HIDE_TIMEOUT_MS);
  }
  setContext('showControls', showControls);

  const showCursor = getContext('showCursor') as () => void;
  const hideCursor = getContext('hideCursor') as () => void;

  onMount(async () => {
    invoke('get_args').then(console.log);

    player.bind(mediaElement);
    player.bindDuration(playbackDuration);
    player.bindDurationString(displayDuration);
    player.bindTime(playbackTime);
    player.bindTimeString(displayTime);
    player.bindPaused(paused);
    player.bindEnded(ended);
    player.bindFullscreen(fullscreen);

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
      showControls();
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

  $: $paused || $cursorInsideControls || $openContextMenu ? freezeControls() : unfreezeControls();
  $: if (controlsHidden) {
    hideCursor();
  } else {
    showCursor();
  }
</script>

<!-- TODO: consider radix-svelte & shadcn-svelte for more robust components (possible BREAKING CHANGES) -->

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<!-- svelte-ignore a11y-media-has-caption -->
<video autoplay bind:this={mediaElement} {src} />
<SubtitleDisplay />
<div
  id="controls"
  class="text-white absolute flex flex-col items-stretch w-full bottom-0 px-6 py-4 opacity-100 duration-150"
  transition:fade
  class:invisible={controlsHidden}
  hidden={controlsHidden}
  use:captureCursor={cursorInsideControls}
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
    <div id="controls-left" class="flex gap-4 items-center">
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
      <TimeDurationDisplay time={$displayTime} duration={$displayDuration} />
    </div>
    <div id="controls-right" class="flex items-center gap-4">
      <SubtitleControl />
      <VolumeControl />
      <SettingsControl />
      <Tooltipped id="fullscreen-button">
        {#if !$fullscreen}
          <FullscreenButton on:click={setFullscreen} />
        {:else}
          <FullscreenExitButton on:click={exitFullscreen} />
        {/if}
        <svelte:fragment slot="tooltip">
          {#if $fullscreen}
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
</style>
