<script lang="ts">
  import { useActiveAnnotation, useCurrentKey } from './state'
  import {
    deleteAnnotation,
    jumpToAnnotation,
    openSidepanel,
    updateAnnotation,
  } from '@/shared/bridge'
  import Button from './Button.svelte'
  import { getActiveTab, getActiveTabId } from '@/shared/helpers'

  const currentKey = useCurrentKey()
  const { annotation: activeAnnotation, reload } = useActiveAnnotation(currentKey)
  let isEditing = $state(false)

  const handleBlur = (e: Event) => {
    if (!e.target || !$activeAnnotation) {
      return
    }
    isEditing = false
    const newText = (e.target as HTMLInputElement).value
    const patch = { memo: newText.trim() }
    updateAnnotation($currentKey, $activeAnnotation.id, patch)
  }
  const handleDelete = () => {
    if (!$activeAnnotation || !$currentKey) {
      return
    }
    deleteAnnotation($currentKey, $activeAnnotation.id)
    getActiveTabId().then((tabId) => {
      if (!tabId) {
        return
      }

      chrome.sidePanel.setOptions({
        tabId,
        path: 'annotation.html',
        enabled: false,
      })
    })
  }
  const handleJump = () => {
    getActiveTabId().then((tabId) => {
      if (!$currentKey || !$activeAnnotation || !tabId) {
        return
      }
      jumpToAnnotation(tabId, $currentKey, $activeAnnotation.id)
    })
  }
  const goback = () => {
    getActiveTab().then((tab) => {
      if (!tab) {
        return
      }

      openSidepanel({
        key: $currentKey,
        winId: tab.windowId,
        tabId: tab.id || 0,
        page: 'sidepanel.html',
      })
    })
  }

  $effect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'PAGENOTE:RELOAD') {
        reload()
      }
    })
  })
</script>

<main class="p-4 bg-gray-100 min-h-screen">
  <h3 class="text-lg font-bold mb-4">
    <button class="cursor-pointer" onclick={goback}>←</button>
    My Annotation
  </h3>
  {#if $activeAnnotation}
    <div
      class="mb-4 px-2 py-3 border-0 border-l-4 border border-yellow-300 text-gray-400 line-clamp-3"
    >
      {$activeAnnotation.text}
    </div>

    <div class="mb-4">
      {#if isEditing}
        <textarea
          class="w-full p-2 border border-gray-300 bg-white"
          value={$activeAnnotation.memo}
          onblur={handleBlur}
          rows="5"
        ></textarea>
      {:else if $activeAnnotation.memo}
        <pre>{$activeAnnotation.memo}</pre>
      {/if}
    </div>

    <div class="flex space-x-2 justify-end">
      <Button onclick={handleJump}>JUMP</Button>

      <Button onclick={() => (isEditing = !isEditing)}
        >{isEditing ? 'Edit Done' : 'Edit Note'}</Button
      >
      <Button onclick={handleDelete}>Delete</Button>
    </div>
  {:else}
    <p class="mb-4">Loading...</p>
    <Button onclick={() => reload()}>Reload</Button>
  {/if}
</main>
