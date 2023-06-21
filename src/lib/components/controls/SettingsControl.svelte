<script lang="ts" context="module">
  import type { Component, IntoString, Nullable } from '$lib/util';

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
  import SpeedMenu from './settings/SpeedMenu.svelte';

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
    // TODO: impl changing tracks if possible using HTML5 player
    // otherwise decode video on Rust backend (?)
    {
      label: 'Video Track',
      value: 'Track 1'
    },
    {
      label: 'Audio Track',
      value: 'Track 1'
    }
  ];

  let currentItem: Nullable<SettingsItem> = null;

  function resetItem() {
    currentItem = null;
  }

  function chooseItem(item: SettingsItem<IntoString>) {
    console.log(item);
    if (!item.component) {
      // TODO: handle unselectable items
      return;
    }
    currentItem = item;
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<ContextMenu id="settings-button" pad={false} on:close={resetItem} let:isOpen>
  <Tooltipped disabled={isOpen}>
    <SettingsButton />
    <svelte:fragment slot="tooltip">Settings</svelte:fragment>
  </Tooltipped>
  <svelte:fragment slot="menu">
    {#if currentItem}
      <svelte:component this={currentItem.component} />
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
