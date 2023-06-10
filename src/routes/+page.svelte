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

	const SEEK_AUTODROP_DELAY_MS = 600;

	let src: string = '';
	let mediaElement: HTMLMediaElement;
	let player: Player;

	let displayTime = '0:00';
	let displayDuration = '0:00';
	let playbackTime = 0;
	let playbackDuration = -1;

	let paused = false;
	let ended = false;
	let muted = false;

	let slider: HTMLDivElement;
	let sliderThumb: HTMLDivElement;
	let sliderInput: HTMLInputElement;
	let sliderFrozen = false;
	let sliderDragging = false;
	let sliderFreezingController: Nullable<AbortController> = null;
	let sliderAutoDropTimeout: Nullable<number> = null;

	let volumeSliderValue = 100;

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

		src = convertFileSrc(path);
	}

	function seek() {
		if (!sliderFrozen) return;
		if (!sliderAutoDropTimeout) return;
		freezeSlider();

		const seekTime = +sliderInput.value;
		displayTime = toDurationString(Math.round(seekTime));

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

	async function setVolume() {
		if (player) {
			player.volume = volumeSliderValue;
		}
	}

	// TODO: remove unnecessary wrapper
	function play() {
		if (player && player.isLoaded()) {
			player.play();
		}
	}

	function pause() {
		if (player?.isLoaded()) {
			player.pause();
		}
	}

	function mute() {
		player?.mute();
	}

	function unmute() {
		player?.unmute();
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

	const {
		open: volumeTooltipOpen,
		useTooltip: volumeTooltip,
		useTooltipTrigger: volumeTooltipTrigger,
		triggerAttrs: volumeTooltipTriggerAttrs,
		tooltipAttrs: volumeTooltipAttrs,
		arrowAttrs: volumeTooltipArrowAttrs
	} = createTooltip({
		openDelay: 50,
		closeDelay: 50,
		positioning: {
			fitViewport: true
		}
	});

	const {
		open: fullscreenTooltipOpen,
		useTooltip: fullscreenTooltip,
		useTooltipTrigger: fullscreenTooltipTrigger,
		triggerAttrs: fullscreenTooltipTriggerAttrs,
		tooltipAttrs: fullscreenTooltipAttrs,
		arrowAttrs: fullscreenTooltipArrowAttrs
	} = createTooltip({
		openDelay: 50,
		closeDelay: 50,
		positioning: {
			fitViewport: true
		}
	});

	onMount(async () => {
		invoke('get_args').then(console.log);

		player = new Player(mediaElement);

		player.durationString.subscribe((durationString) => {
			displayDuration = durationString;
		});
		player.duration.subscribe((duration) => {
			playbackDuration = duration;
		});
		player.time.subscribe((time) => {
			if (!sliderFrozen) playbackTime = time;
		});
		player.timeString.subscribe((timeString) => {
			if (!sliderFrozen) displayTime = timeString;
		});
		player.paused.subscribe((_paused) => {
			paused = _paused;
		});
		player.ended.subscribe((_ended) => {
			ended = _ended;
			if (ended) playbackTime = playbackDuration;
		});
		player.muted.subscribe((_muted) => {
			muted = _muted;
		});

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
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<!-- svelte-ignore a11y-media-has-caption -->
<video autoplay bind:this={mediaElement} {src} />
<div
	id="controls"
	class="text-white absolute flex flex-col gap-2 items-stretch w-full bottom-0 px-6 py-4"
>
	<div id="slider">
		<Slider
			class="slider"
			min={0}
			max={playbackDuration}
			step={0.001}
			value={playbackTime}
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
			<div id="play-button">
				<!-- <Icon name="play_arrow" /> -->
				{#if paused || ended}
					<PlayButton on:click={play} />
				{:else}
					<PauseButton on:click={pause} />
				{/if}
			</div>
			<div id="skip-button">
				<!-- TODO: add reactivity to playlist -->
				<SkipNextButton />
			</div>
			<!-- TODO: resize based on displayTime & displayDuration text length -->
			<div id="time" class="w-20 flex justify-between items-center">
				<span style="flex-basis: 45%;">{displayTime}</span>
				<span class="text-center" style="flex-basis: 10%;">/</span>
				<span class="text-right" style="flex-basis: 45%;">{displayDuration}</span>
			</div>
		</div>
		<div id="controls-right" class="flex items-center gap-4">
			<div id="volume-button" use:volumeTooltipTrigger {...$volumeTooltipTriggerAttrs}>
				{#if muted}
					<VolumeOffButton on:click={unmute} />
				{:else}
					<VolumeOnButton on:click={mute} />
				{/if}
			</div>
			<div id="volume-slider" class="w-32">
				<!-- TODO: rip off the source, make custom slider -->
				<Slider
					class="slider"
					min={0}
					max={100}
					step={1}
					bind:value={volumeSliderValue}
					on:change={setVolume}
				>
					<svelte:fragment slot="tooltip" let:value>
						<span class="volume-slider-tooltip">{value}%</span>
					</svelte:fragment>
				</Slider>
			</div>
			<!-- TODO: refactor tooltip wrappers -->
			<div id="fullscreen-button" use:fullscreenTooltipTrigger {...$fullscreenTooltipTriggerAttrs}>
				<!-- TODO: add tooltip -->
				{#if !fullscreen}
					<FullscreenButton on:click={setFullscreen} />
				{:else}
					<FullscreenExitButton on:click={exitFullscreen} />
				{/if}
			</div>
		</div>
	</div>
</div>

<button on:click={openFile} class="text-white">OPEN FILE</button>

{#if $volumeTooltipOpen}
	<div
		transition:fade={{ duration: 250, easing: cubicOut }}
		use:volumeTooltip
		{...$volumeTooltipAttrs}
	>
		<span class="text-sm text-white font-medium tooltip px-4 py-2 rounded">
			{#if muted}
				Unmute
			{:else}
				Mute
			{/if}
		</span>
		<div {...$volumeTooltipArrowAttrs} />
	</div>
{/if}

{#if $fullscreenTooltipOpen}
	<div
		transition:fade={{ duration: 250, easing: cubicOut }}
		use:fullscreenTooltip
		{...$fullscreenTooltipAttrs}
	>
		<span class="text-sm text-white font-medium tooltip px-4 py-2 rounded">
			{#if fullscreen}
				Exit Fullscreen
			{:else}
				Fullscreen
			{/if}
		</span>
		<div {...$fullscreenTooltipArrowAttrs} />
	</div>
{/if}

<style>
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
	}

	.tooltip {
		font-family: 'Inter';
		/* background-color: rgba(0, 0, 0, 0.8); */
		background-color: #474747;
	}

	#slider {
		flex: 1;
		box-sizing: border-box;
	}

	.slider {
		background-color: blueviolet;
	}

	.volume-slider-tooltip {
		@apply text-sm font-semibold;
		font-family: 'Inter';
	}
</style>
