<script lang="ts">
  const { onclick, children } = $props()
</script>

<button
  type="button"
  class="border-1 text-xs px-2 py-1 focus:outline-none cursor-pointer text-yellow-500 hover:text-yellow-700"
  {onclick}>{@render children()}</button
>
