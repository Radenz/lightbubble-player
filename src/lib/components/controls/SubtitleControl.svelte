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
    isEmbedded,
    type RawSubtitle,
    parseSubtitle,
    type SubtitleMeta
  } from '$lib/player/subtitle';
  import SubtitleOffButton from '../buttons/SubtitleOffButton.svelte';
  import SubtitleOnButton from '../buttons/SubtitleOnButton.svelte';
  import SubtitleLabel from '../labels/SubtitleLabel.svelte';
  import { invoke } from '@tauri-apps/api/tauri';
  import type { Nullable } from '$lib/util';
  import { activeSubtitle } from '$lib/store/player';

  let menu: ContextMenu;
  let isMenuOpen: Nullable<Writable<boolean>> = null;
  const chosenSubtitle = writable(null as Nullable<SubtitleMeta>);

  const player = getContext('player') as Player;
  const subtitles = writable({
    external: [] as ExternalSubtitleMeta[],
    embedded: [] as EmbeddedSubtitleMeta[]
  });
  player.bindSubtitles(subtitles);

  $: hasSubtitles = $subtitles.external.length > 0 || $subtitles.embedded.length > 0;
  $: subtitleOn = !!$activeSubtitle;

  function chooseSubtitle(meta: ExternalSubtitleMeta | EmbeddedSubtitleMeta) {
    if (isEmbedded(meta)) {
      invoke<RawSubtitle>('get_embedded_subtitle', {
        path: player.src!,
        index: meta.index
      }).then((rawSubtitle) => {
        $activeSubtitle = parseSubtitle(rawSubtitle);
        $chosenSubtitle = meta;
      });
    }

    menu.hide();
  }

  function disableSubtitle() {
    if (isMenuOpen) {
      // FIXME: use non-hacky way to disable context menu popover
      const unsubscribe = isMenuOpen.subscribe((_) => {
        $activeSubtitle = null;
        $chosenSubtitle = null;
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
      <SubtitleOffButton />
    {:else}
      <SubtitleOnButton />
    {/if}
    <svelte:fragment slot="tooltip">Subtitle (C)</svelte:fragment>
  </Tooltipped>
  <svelte:fragment slot="menu">
    <div>
      {#if hasSubtitles}
        {#if $subtitles.external.length > 0}
          <SubtitleLabel enabled={!subtitleOn} on:click={disableSubtitle}>Off</SubtitleLabel>
          <div>
            <div class="context-menu-header">External</div>
            {#each $subtitles.external as subtitle}
              <SubtitleLabel
                enabled={subtitle === $chosenSubtitle}
                format={subtitle.ext}
                on:click={() => chooseSubtitle(subtitle)}
              >
                {subtitle.basename}
              </SubtitleLabel>
            {/each}
          </div>
        {/if}
        {#if $subtitles.embedded.length > 0}
          <div>
            <div class="context-menu-header dense">Embedded</div>
            {#each $subtitles.embedded as meta, index}
              <SubtitleLabel
                enabled={meta === $chosenSubtitle}
                on:click={() => chooseSubtitle(meta)}
              >
                {labelOf(meta, index + 1)}
              </SubtitleLabel>
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
