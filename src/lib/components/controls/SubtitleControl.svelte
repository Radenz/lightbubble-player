<script lang="ts">
  import { getContext } from 'svelte';
  import ContextMenu from '../ContextMenu.svelte';
  import Tooltipped from '../Tooltipped.svelte';
  import type { Player } from '$lib/player/player';
  import { writable, type Writable } from 'svelte/store';
  import {
    labelOf,
    type EmbeddedSubtitleMeta,
    type ExternalSubtitleMeta,
    isEmbedded
  } from '$lib/player/subtitle';
  import SubtitleOffButton from '../buttons/SubtitleOffButton.svelte';
  import SubtitleOnButton from '../buttons/SubtitleOnButton.svelte';
  import SubtitleLabel from '../labels/SubtitleLabel.svelte';
  import { invoke } from '@tauri-apps/api/tauri';
  import type { Nullable } from '$lib/util';

  let menu: ContextMenu;
  let isMenuOpen: Nullable<Writable<boolean>> = null;

  const player = getContext('player') as Player;
  const subtitles = writable({
    external: [] as ExternalSubtitleMeta[],
    embedded: [] as EmbeddedSubtitleMeta[]
  });
  player.bindSubtitles(subtitles);
  // TODO: adjust based on subtitle metadata
  const subtitleIndex = writable(-1);
  $: hasSubtitles = $subtitles.external.length > 0 || $subtitles.embedded.length > 0;
  $: subtitleOn = $subtitleIndex >= 0;

  function chooseSubtitle(meta: ExternalSubtitleMeta | EmbeddedSubtitleMeta) {
    if (isEmbedded(meta)) {
      $subtitleIndex = meta.index;
      // TODO: display subtitle entries
      invoke('get_embedded_subtitle', {
        path: player.src!,
        index: meta.index
      }).then((subtitle) => console.log(subtitle));
    }

    menu.hide();
  }

  // TODO: auto hide menu on open
  function disableSubtitle() {
    if (isMenuOpen) {
      // FIXME: use non-hacky way to disable context menu popover
      const unsubscribe = isMenuOpen.subscribe((_) => {
        $subtitleIndex = -1;
        menu.hide();
        setTimeout(() => {
          unsubscribe();
        }, 1);
      });
    }
  }
</script>

<ContextMenu
  bind:this={menu}
  bind:isOpen={isMenuOpen}
  id="subtitle-button"
  pad={!hasSubtitles}
  let:isOpen
>
  <Tooltipped id="subtitle-button" disabled={isOpen}>
    {#if subtitleOn}
      <SubtitleOffButton on:click={disableSubtitle} />
    {:else}
      <SubtitleOnButton />
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
              <SubtitleLabel format={subtitle.ext} on:click={() => chooseSubtitle(subtitle)}
                >{subtitle.basename}</SubtitleLabel
              >
            {/each}
          </div>
        {/if}
        {#if $subtitles.embedded.length > 0}
          <div>
            <div class="context-menu-header dense">Embedded</div>
            {#each $subtitles.embedded as track, index}
              <SubtitleLabel on:click={() => chooseSubtitle(track)}
                >{labelOf(track, index + 1)}</SubtitleLabel
              >
            {/each}
          </div>
        {/if}
      {:else}
        No subtitles detected
      {/if}
    </div>
  </svelte:fragment>
</ContextMenu>

<style lang="postcss">
  .context-menu-header {
    /* @apply text-xs font-light opacity-80 pb-1 my-3 relative;

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
    } */
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
