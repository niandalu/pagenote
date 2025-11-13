import type { Annotation } from '@/shared/model'
import type { Readable, Writable } from 'svelte/store'
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
  let lastKey = ''
  const annotation = writable<Annotation | undefined>(undefined)

  const reload = (k?: string) => {
    const ck = k || lastKey
    if (!ck) {
      annotation.set(undefined)
    }
    lastKey = ck

    chrome.runtime.sendMessage(
      {
        type: 'PAGENOTE:LOAD_ONE',
        key: ck,
      },
      (v: Annotation | undefined) => annotation.set(v),
    )
  }

  key.subscribe((v) => {
    reload(v)
  })
  return { annotation, reload }
}

export { useCurrentKey, useActiveAnnotation }
