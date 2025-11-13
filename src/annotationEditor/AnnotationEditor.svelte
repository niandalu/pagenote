<script lang="ts">
  import { useActiveAnnotation, useCurrentKey } from './state'

  const currentKey = useCurrentKey()
  const activeAnnotation = useActiveAnnotation(currentKey)

  // Format timestamp to readable date
  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString()
  }
</script>

<main class="p-4 bg-gray-100 min-h-screen">
  <h3 class="text-lg font-bold mb-4">Annotation</h3>
  {JSON.stringify($activeAnnotation)}
</main>
