<script lang="ts">
  let choice = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
</script>

<div class="flex items-stretch flex-col gap-1 w-32">
  <div class="context-menu-header">Speed</div>
  {#each choice as speed, index (index)}
    <div class="setting-option">
      <span>{speed}</span>
    </div>
  {/each}
</div>

<style lang="postcss">
  .setting-option {
    @apply rounded px-4 py-2 cursor-pointer;
    &:hover {
      background-color: rgba(64, 64, 64, 0.6);
    }
  }

  .context-menu-header {
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
