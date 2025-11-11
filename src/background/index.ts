import { Annotation, AnnotationModel, DomMeta } from '@/shared/model'

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
}

chrome.tabs.onCreated.addListener((tab) => {
  // No action needed on creation; model initialized on first message
})

chrome.tabs.onRemoved.addListener((tabId) => {
  connectionPool.delete(tabId)
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

const pickModel = async (request: BizRequest, tabId: number) => {
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
  if (!tabId) {
    sendResponse({ error: 'No tab ID' })
    return
  }

  pickModel(request, tabId).then(async (model) => {
    console.info('[PAGENOTE] received', tabId, request)
    switch (request.type) {
      case 'PAGENOTE:LOAD':
        await model.reload()
        console.log('[PAGENOTE] loaded annotations', model.list, +new Date())
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
          await model.truncate()
          sendResponse({ success: true })
          notifyTabs(request.key, { type: 'PAGENOTE:RELOAD' })
        } catch (error) {
          sendResponse({ error: 'Failed to delete annotation' })
        }
        break
      default:
        return false
    }
  })

  return true // Keep sendResponse alive for async operations
})
