<script lang="ts">
  export let time: string;
  export let duration: string;

  // Assume one char is 10px wide & `:` is 3px wide
  const CHAR_WIDTH = 10;
  const COLON_WIDTH = 3;

  function width(time: string): number {
    let width = 2 * CHAR_WIDTH + COLON_WIDTH;
    if (time.length > 3) {
      width += Math.min(2, time.length - 3) * CHAR_WIDTH;
    }
    if (time.length > 5) {
      width += COLON_WIDTH;
      width += (time.length - 6) * CHAR_WIDTH;
    }
    return width;
  }

  $: timeWidth = width(time);
  $: durationWidth = width(duration);
  $: containerWidth = timeWidth + durationWidth + COLON_WIDTH;
  $: containerWidthString = `${containerWidth}px`;
  $: console.log(durationWidth);
</script>

<div id="time" class="flex justify-between items-center" style:width={containerWidthString}>
  <span style="flex-basis: 45%;">{time}</span>
  <span class="text-center" style="flex-basis: 10%;">/</span>
  <span class="text-right" style="flex-basis: 45%;">{duration}</span>
</div>

<style>
  #time {
    box-sizing: border-box;
    color: white;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
  }
</style>
