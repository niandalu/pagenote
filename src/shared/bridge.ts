import type { Annotation } from './model'

export async function updateAnnotation(key: string, id: string, patch: Partial<Annotation>) {
  await chrome.runtime.sendMessage({
    type: 'PAGENOTE:UPDATE',
    key,
    id,
    patch,
  })
}

export async function deleteAnnotation(key: string, id: string) {
  await chrome.runtime.sendMessage({
    type: 'PAGENOTE:DELETE',
    key,
    id,
    deleted: true,
  })
}

// Jump to annotation location on the page
export async function jumpToAnnotation(tabId: string, key: string, id: string) {
  await chrome.runtime.sendMessage({
    type: 'PAGENOTE:JUMP',
    tabId,
    key,
    id,
  })
}
