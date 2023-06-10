<script lang="ts">
	export let name: string;
</script>

<span class="material-symbols-rounded gradient control-btn">
	{name}
</span>

<style>
	.gradient {
		background: linear-gradient(
			to top,
			#fcc5e4 0%,
			#fda34b 15%,
			#ff7882 35%,
			#c8699e 52%,
			#7046aa 71%,
			#0c1db8 87%,
			#020f75 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.control-btn {
		font-size: 36px;
	}
</style>
