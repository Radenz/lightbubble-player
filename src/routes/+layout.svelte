<script lang="ts">
	import '../app.postcss';
	import { onMount } from 'svelte';
	import './styles.css';
	import 'fluent-svelte/theme.css';
	import { rootElement } from '$lib/store/root';

	let root: HTMLElement;

	onMount(() => {
		rootElement.set(root);
	});
</script>

<svelte:head>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
	/>
</svelte:head>

<div bind:this={root} class="app">
	<slot />
</div>

<style>
	.app {
		font-family: 'Inter', sans-serif;
		height: 100vh;
		overflow: hidden;
	}

	:global(.material-symbols-rounded) {
		font-variation-settings: 'FILL' 0, 'wght' 700, 'GRAD' 200, 'opsz' 48;
	}
</style>
