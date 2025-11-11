interface AnnotationFeature {
  memo: string
  hexColor: string
}

interface Annotation extends AnnotationFeature {
  id: string
  range: Range

  // 0 if not deleted
  deletedAt: number
}

interface SerializableAnnotation extends AnnotationFeature {
  id: string
  startNodeSelectorPath: string
  startOffset: number
  endOffset: number
  endNodeSelectorPath: string

  // 0 if not deleted
  deletedAt: number
}

function serializeAnnotation(annotations: Annotation[]): string {
  // AI!
  // convert to SerializableAnnotation
  // JSON.stringify
}

function deserializeAnnotation(text: string): Annotation[] {
  // AI!
  // convert to SerializableAnnotation by JSON.parse
  // convert to Annotation
}

async function saveAnnotations(annotations: Annotation[]): Promise<boolean> {
  // serialize and save using chrome.storage api
}

async function loadAnnotations(key?: string): Promise<Annotation[]> {
  const localKey = key || pageStorageKey()
  // load and deserialize from chrome.storage api
}

function pageStorageKey() {
  // use current origin + pathname as key
}

export type { Annotation }
export { loadAnnotations }
