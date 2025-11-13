<script lang="ts">
  import { onMount } from 'svelte'
  import type { Annotation } from '@/shared/model'
  import { AnnotationModel } from '@/shared/model'
  import { getActiveTabId } from '@/shared/helpers'

  let annotations = $state<Annotation[]>([])
  let currentKey = $state('')

  // Derive key from active tab URL (mirrors contentScript logic)
  async function getCurrentKey(): Promise<string> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.url) {
      const url = new URL(tab.url)
      return `${url.origin}${url.pathname}`
    }
    return ''
  }

  // Load annotations from background
  async function loadAnnotations() {
    if (!currentKey) return
    const response: Annotation[] = await chrome.runtime.sendMessage({
      type: 'PAGENOTE:LOAD',
      key: currentKey,
    })
    annotations = response.filter((it) => !it.deletedAt)
    console.log('PAGNOTE:SIDEBAR', response)
  }

  // Update an annotation (memo or color)
  async function updateAnnotation(id: string, patch: Partial<Annotation>) {
    await chrome.runtime.sendMessage({
      type: 'PAGENOTE:UPDATE',
      key: currentKey,
      id,
      patch,
    })
  }

  // Delete an annotation
  async function deleteAnnotation(id: string) {
    await chrome.runtime.sendMessage({
      type: 'PAGENOTE:DELETE',
      key: currentKey,
      id,
      deleted: true,
    })
  }

  // Jump to annotation location on the page
  async function jumpToAnnotation(id: string) {
    await chrome.runtime.sendMessage({
      type: 'PAGENOTE:JUMP',
      key: currentKey,
      id,
    })
  }

  // Export annotations as JSON
  function exportAnnotations() {
    const data = AnnotationModel.serializeAnnotation(annotations)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annotations-${currentKey.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Format timestamp to readable date
  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString()
  }

  async function toggleView() {
    const tabId = await getActiveTabId()
    chrome.sidePanel.setOptions({
      tabId,
      path: 'overview.html',
      enabled: true,
    })
  }

  onMount(async () => {
    currentKey = await getCurrentKey()
    await loadAnnotations()

    // Listen for reload messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'PAGENOTE:RELOAD') {
        console.log('SIDEPANEL trigggggggg')
        loadAnnotations()
      }
    })
  })
</script>

<main class="p-4 bg-gray-100 min-h-screen">
  <h3 class="text-lg font-bold mb-4">Page Annotations</h3>
  {#if annotations.length === 0}
    <p>No annotations yet. Select text on the page to create one.</p>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each annotations as ann (ann.id)}
        <div
          class="bg-white p-4 rounded-lg shadow-md border-l-4"
          style="border-left-color: {ann.hexColor}; background-color: {ann.hexColor}10;"
        >
          <div class="mb-2 text-xs text-gray-500">
            Updated: {formatDate(ann.updatedAt)}
          </div>
          <div class="mb-2">
            <strong class="text-sm text-gray-700">Text:</strong>
            <p class="text-sm text-gray-900 mt-1">{ann.text}</p>
          </div>
          <div class="mb-4">
            <strong class="text-sm text-gray-700">Memo:</strong>
            <p class="text-sm text-gray-900 mt-1">{ann.memo || 'No memo'}</p>
          </div>
          <div class="flex justify-between items-center mt-4">
            <button
              onclick={() => {
                const newMemo = prompt('Edit memo:', ann.memo)
                if (newMemo !== null) {
                  updateAnnotation(ann.id, { memo: newMemo })
                }
              }}
              class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-xs"
            >
              Edit Memo
            </button>
            <button
              onclick={() => deleteAnnotation(ann.id)}
              class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
            >
              Delete
            </button>
            <button
              onclick={() => jumpToAnnotation(ann.id)}
              class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs"
            >
              Jump to Location
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  <button
    onclick={exportAnnotations}
    class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
  >
    Export as JSON
  </button>

  <button onclick={toggleView}> toggle </button>
</main>
