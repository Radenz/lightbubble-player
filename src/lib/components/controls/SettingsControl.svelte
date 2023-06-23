<script lang="ts" context="module">
  import type { Component, IntoString, Nullable } from '$lib/util';
  import { getContext } from 'svelte';

  interface SettingsItem<T = IntoString> {
    label: string;
    value: T;
    // component?: new (...args: any[]) => SvelteComponentTyped;
    component?: Component;
  }
</script>

<script lang="ts">
  import ContextMenu from '../ContextMenu.svelte';
  import Tooltipped from '../Tooltipped.svelte';
  import SettingsButton from '../buttons/SettingsButton.svelte';
  import AudioMenu from './settings/AudioMenu.svelte';
  import SpeedMenu from './settings/SpeedMenu.svelte';
  import type { Player } from '$lib/player/player';

  const items: SettingsItem[] = [
    {
      label: 'Speed',
      value: 1,
      component: SpeedMenu
    },
    {
      label: 'Loop',
      value: 'Off'
    },
    {
      label: 'Video Track',
      value: 'None'
    },
    {
      label: 'Audio Track',
      value: 'None',
      component: AudioMenu
    }
  ];
  let currentItem: Nullable<SettingsItem> = null;
  let menu: ContextMenu;
  const player = getContext('player') as Player;
  player.onLoaded(() => {
    items[3].value = player.selectedAudioTracks!.name;
  });

  function resetItem() {
    currentItem = null;
  }

  function chooseItem(item: SettingsItem<IntoString>) {
    if (!item.component) {
      // TODO: handle unselectable items
      return;
    }
    currentItem = item;
  }

  function onChoose(event: CustomEvent) {
    currentItem!.value = event.detail;
    menu?.hide();
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<ContextMenu bind:this={menu} id="settings-button" pad={false} on:close={resetItem} let:isOpen>
  <Tooltipped disabled={isOpen}>
    <SettingsButton />
    <svelte:fragment slot="tooltip">Settings</svelte:fragment>
  </Tooltipped>
  <svelte:fragment slot="menu">
    {#if currentItem}
      <svelte:component this={currentItem.component} on:choose={onChoose} />
    {:else}
      <div class="flex items-stretch flex-col gap-1">
        {#each items as item, index (index)}
          <div
            on:click={() => {
              chooseItem(item);
            }}
            class="settings-menu flex justify-between items-center gap-8"
          >
            <span>{item.label}</span>
            <span>{item.value ?? 'None'}</span>
          </div>
        {/each}
      </div>
    {/if}
  </svelte:fragment>
</ContextMenu>

<style lang="postcss">
  .settings-menu {
    @apply rounded px-4 py-2 cursor-pointer;
    &:hover {
      background-color: rgba(64, 64, 64, 0.6);
    }
  }
</style>
