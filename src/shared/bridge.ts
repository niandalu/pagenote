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
export async function jumpToAnnotation(tabId: number, key: string, id: string) {
  await chrome.runtime.sendMessage({
    type: 'PAGENOTE:JUMP',
    tabId,
    key,
    id,
  })
}

// Jump to annotation location on the page
export async function openSidepanel(
  params:
    | { key: string; page: 'annotation.html'; id: string; winId?: number; tabId?: number }
    | { key: string; winId: number; tabId: number; page: 'sidepanel.html' },
) {
  const payload =
    params.page === 'annotation.html'
      ? {
          type: 'PAGENOTE:OPEN_SIDEPANEL',
          winId: params.winId,
          tabId: params.tabId,
          page: 'annotation.html',
          key: params.key,
          id: params.id,
        }
      : {
          type: 'PAGENOTE:OPEN_SIDEPANEL',
          winId: params.winId,
          tabId: params.tabId,
          page: 'sidepanel.html',
          key: params.key,
          id: '',
        }
  await chrome.runtime.sendMessage(payload)
}
