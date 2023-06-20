<script lang="ts">
  import { getContext } from 'svelte';
  import ContextMenu from '../ContextMenu.svelte';
  import Tooltipped from '../Tooltipped.svelte';
  import type { Player } from '$lib/player/player';
  import { writable } from 'svelte/store';
  import type { EmbeddedSubtitleMeta, ExternalSubtitleMeta } from '$lib/player/subtitle';
  import SubtitleOffButton from '../buttons/SubtitleOffButton.svelte';
  import SubtitleOnButton from '../buttons/SubtitleOnButton.svelte';
  import SubtitleLabel from '../labels/SubtitleLabel.svelte';

  const player = getContext('player') as Player;
  const subtitles = writable({
    external: [] as ExternalSubtitleMeta[],
    embedded: [] as EmbeddedSubtitleMeta[]
  });
  player.bindSubtitles(subtitles);
  // TODO: adjust based on subtitle metadata
  const subtitleId = writable(-1);
  $: hasSubtitles = $subtitles.external.length > 0 || $subtitles.embedded.length > 0;
  $: subtitleOn = $subtitleId >= 0;
</script>

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

<style lang="postcss">
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
</style>
