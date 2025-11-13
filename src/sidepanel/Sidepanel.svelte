<script lang="ts">
  import { useCurrentKey } from '../annotationEditor/state'
  import { deleteAnnotation, jumpToAnnotation, openSidepanel } from '@/shared/bridge'
  import { getActiveTabId, getActiveTab } from '@/shared/helpers'
  import Button from '../annotationEditor/Button.svelte'
  import type { Annotation } from '@/shared/model'

  const currentKey = useCurrentKey()
  let annotations = $state<Annotation[]>([])

  async function loadAnnotations() {
    const response: Annotation[] = await chrome.runtime.sendMessage({
      type: 'PAGENOTE:LOAD',
      key: $currentKey,
    })
    annotations = response
  }

  $effect(() => {
    if ($currentKey) {
      loadAnnotations()
    }
  })

  $effect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'PAGENOTE:RELOAD') {
        loadAnnotations()
      }
    })
  })

  function handleDelete(id: string) {
    deleteAnnotation($currentKey, id)
  }

  async function handleJump(id: string) {
    const tabId = await getActiveTabId()
    if (tabId) {
      jumpToAnnotation(tabId, $currentKey, id)
    }
  }

  async function goDetail(id: string) {
    const tab = await getActiveTab()
    if (tab) {
      openSidepanel({
        key: $currentKey,
        winId: tab.windowId,
        tabId: tab.id || 0,
        page: 'annotation.html',
        id,
      })
    }
  }
</script>

<main class="p-4 bg-gray-100 min-h-screen">
  <h3 class="text-lg font-bold mb-4">My Annotations</h3>
  {#if annotations.length === 0}
    <p class="text-lg">No annotations available, select some text and press `option + d`</p>
  {/if}
  {#each annotations as ann}
    <div class="mb-4 p-2 border border-gray-300 bg-white">
      <p class="mb-2 line-clamp-4">{ann.text}</p>
      <div class="flex space-x-2 justify-between items-center mt-2">
        <div>
          <p class="text-xs text-gray-500">{new Date(ann.updatedAt).toLocaleString()}</p>
        </div>
        <div class="flex justify-end space-x-2">
          <Button onclick={() => goDetail(ann.id)}>Detail</Button>
          <Button onclick={() => handleJump(ann.id)}>Jump</Button>
          <Button onclick={() => handleDelete(ann.id)}>Delete</Button>
        </div>
      </div>
    </div>
  {/each}
</main>
