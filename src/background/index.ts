import { AnnotationModel } from '@/shared/model'
import type { Annotation, DomMeta } from '@/shared/model'

let currentAnnotationId = ''
const sidePanelOpendTabs = new Set<number>()
const connectionPool = new Map<number, AnnotationModel>()
const keyToTabIds = new Map<string, Set<number>>()

function notifyTabs(key: string, message: any) {
  const tabIds = keyToTabIds.get(key)
  console.info('[PAGNOTE] notifyTabs', key, tabIds, message)
  if (tabIds) {
    for (const tabId of tabIds) {
      chrome.tabs.sendMessage(tabId, message)
    }
  }
  chrome.runtime.sendMessage(message)
}

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  const enabled = sidePanelOpendTabs.has(tabId)
  chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled,
  })
})

chrome.tabs.onCreated.addListener((tab) => {
  // No action needed on creation; model initialized on first message
})

chrome.tabs.onRemoved.addListener((tabId) => {
  connectionPool.delete(tabId)
  sidePanelOpendTabs.delete(tabId)
  for (const [key, tabIds] of keyToTabIds) {
    tabIds.delete(tabId)
    if (tabIds.size === 0) {
      keyToTabIds.delete(key)
    }
  }
})

type BizRequest =
  // respond with all the annotations under the key
  | { type: 'PAGENOTE:LOAD'; key: string }
  // deserialize the range from string and call AnnotationModel#create. respond with an id
  | { type: 'PAGENOTE:CREATE'; key: string; startMeta: DomMeta; endMeta: DomMeta; text: string }
  // update the annotation
  | { type: 'PAGENOTE:UPDATE'; key: string; id: string; patch: Partial<Annotation> }
  | { type: 'PAGENOTE:DELETE'; key: string; id: string; deleted: boolean }
  | { type: 'PAGENOTE:CLEAR'; key: string }
  | { type: 'PAGENOTE:OPEN_SIDEPANEL'; key: string; id?: string }
  | { type: 'PAGENOTE:JUMP'; key: string; id: string; tabId: number }
  | { type: 'PAGENOTE:LOAD_ONE'; key: string; id: string }

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tabs && tabs.length > 0) {
    return tabs[0].id // This is the ID of the active tab
  }
  return
}

const pickModel = async (request: BizRequest, senderTabId?: number) => {
  const tabId = senderTabId || (await getActiveTabId())
  if (!tabId || !request.key) {
    return
  }

  let model = connectionPool.get(tabId)
  if (!model || model.key !== request.key) {
    model = await AnnotationModel.init(request.key)
    connectionPool.set(tabId, model)
    if (!keyToTabIds.has(request.key)) {
      keyToTabIds.set(request.key, new Set())
    }
    keyToTabIds.get(request.key)!.add(tabId)
  }
  return model
}

chrome.runtime.onMessage.addListener((request: BizRequest, sender, rawSendResponse) => {
  const sendResponse = (response: any) => {
    console.info('[PAGENOTE] sendResponse', response)
    return rawSendResponse(response)
  }

  const tabId = sender.tab?.id
  const windowId = sender.tab?.windowId

  console.info('[PAGENOTE] received', tabId, request)
  if (request.type === 'PAGENOTE:OPEN_SIDEPANEL' && tabId && windowId) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'annotation.html',
      enabled: true,
    })
    sidePanelOpendTabs.add(tabId)
    chrome.sidePanel.open({ windowId, tabId })
    currentAnnotationId = request.id || ''
    return true
  }

  pickModel(request, tabId).then(async (model) => {
    if (!model) {
      return
    }
    switch (request.type) {
      case 'PAGENOTE:LOAD_ONE': {
        const activeId = request.id || currentAnnotationId
        sendResponse(model.list.find((one) => one.id === activeId))
        break
      }
      case 'PAGENOTE:LOAD':
        await model.reload()
        sendResponse(model.list)
        break
      case 'PAGENOTE:CREATE':
        try {
          const newAnn = await model.create(request)
          sendResponse({ id: newAnn.id })
          notifyTabs(request.key, { type: 'PAGENOTE:RELOAD' })
        } catch (error) {
          console.error(error)
          sendResponse({ error: 'Failed to create annotation' })
        }
        break
      case 'PAGENOTE:UPDATE':
        try {
          await model.update(request.id, (ann) => ({ ...ann, ...request.patch }))
          sendResponse({ success: true })
          notifyTabs(request.key, { type: 'PAGENOTE:RELOAD' })
        } catch (error) {
          sendResponse({ error: 'Failed to update annotation' })
        }
        break
      case 'PAGENOTE:DELETE':
        try {
          await model.destroy(request.id, request.deleted)
          sendResponse({ success: true })
          notifyTabs(request.key, { type: 'PAGENOTE:RELOAD' })
        } catch (error) {
          sendResponse({ error: 'Failed to delete annotation' })
        }
        break
      case 'PAGENOTE:CLEAR':
        try {
          const successful = await model.truncate()
          sendResponse({ success: successful })
          if (successful) {
            notifyTabs(request.key, { type: 'PAGENOTE:RELOAD' })
          }
        } catch (error) {
          sendResponse({ error: 'Failed to delete annotation' })
        }
        break
      case 'PAGENOTE:JUMP':
        chrome.tabs.sendMessage(request.tabId, request)
        break
      default:
        return false
    }
  })

  return true // Keep sendResponse alive for async operations
})
