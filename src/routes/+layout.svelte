<script lang="ts">
  import { setContext } from 'svelte';
  import '../app.postcss';
  import './styles.css';
  import 'fluent-svelte/theme.css';

  let cursorHidden = false;

  function hideCursor() {
    cursorHidden = true;
  }

  function showCursor() {
    cursorHidden = false;
  }

  setContext('hideCursor', hideCursor);
  setContext('showCursor', showCursor);
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
  />
</svelte:head>

<div class="app" class:cursor-hidden={cursorHidden}>
  <slot />
</div>

<style>
  .app {
    font-family: 'Inter', sans-serif;
    height: 100vh;
    overflow: hidden;

    &.cursor-hidden {
      cursor: none !important;

      & * {
        cursor: none !important;
      }
    }
  }

  :global(.material-symbols-rounded) {
    font-variation-settings: 'FILL' 0, 'wght' 700, 'GRAD' 200, 'opsz' 48;
  }
</style>
