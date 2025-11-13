import type { Annotation } from '@/shared/model'
import type { Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

async function getCurrentKey(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.url) {
    const url = new URL(tab.url)
    return `${url.origin}${url.pathname}`
  }
  return ''
}

const useCurrentKey = () => {
  const currentKey = writable('')

  getCurrentKey().then((k: string) => {
    currentKey.set(k)
  })
  return currentKey
}

const useActiveAnnotation = (key: Writable<string>) => {
  const annotation = derived([key], ([$key], set) => {
    chrome.runtime.sendMessage(
      {
        type: 'PAGENOTE:LOAD_ONE',
        key: $key,
      },
      (v: Annotation | undefined) => {
        console.log('onnnnnnnne', v)
        set(v)
      },
    )
  })

  return annotation
}

export { useCurrentKey, useActiveAnnotation }
