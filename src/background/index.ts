import { Annotation, AnnotationModel } from '@/shared/model'
import { deserializeRange, serializeRange } from '@/shared/dom'

const connectionPool = new Map<number, AnnotationModel>()
const keyToTabIds = new Map<string, Set<number>>()

function notifyTabs(key: string, message: any) {
  const tabIds = keyToTabIds.get(key)
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
  | { type: 'PAGENOTE:CREATE'; key: string; range: string }
  // update the annotation
  | { type: 'PAGENOTE:UPDATE'; key: string; id: string; patch: Partial<Annotation> }
  | { type: 'PAGENOTE:DELETE'; key: string; id: string; deleted: boolean }

chrome.runtime.onMessage.addListener(async (request: BizRequest, sender, sendResponse) => {
  const tabId = sender.tab?.id
  if (!tabId) {
    sendResponse({ error: 'No tab ID' })
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

  switch (request.type) {
    case 'PAGENOTE:LOAD':
      const serializableAnnotations = model.list.map((ann) => {
        const rangeSer = serializeRange(ann.range)
        return {
          id: ann.id,
          site: ann.site,
          memo: ann.memo,
          hexColor: ann.hexColor,
          deletedAt: ann.deletedAt,
          ...rangeSer,
        }
      })
      sendResponse(serializableAnnotations)
      break
    case 'PAGENOTE:CREATE':
      try {
        const rangeData = JSON.parse(request.range)
        const range = deserializeRange(rangeData)
        const newAnn = await model.create(range)
        await model.save()
        sendResponse({ id: newAnn.id })
        notifyTabs(request.key, { type: 'PAGENOTE:RELOAD' })
      } catch (error) {
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
  }
  return true // Keep sendResponse alive for async operations
})
