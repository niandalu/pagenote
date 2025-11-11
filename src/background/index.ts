import { Annotation } from '@/shared/model'

type BizRequest =
  // load annotations from storage
  // respond with Annotation[]
  | { type: 'LOAD'; key: string }
  // save annotations to storage
  // respond with Annotation[]
  | { type: 'SAVE'; key: string; serializedAnnotations: string }
  // force modules to reload annotations
  | { type: 'SYNC' }

chrome.runtime.onMessage.addListener((request: BizRequest, _, sendResponse) => {})
