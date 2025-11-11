import { getNodeFromSelectorPath, getNodeSelectorPath } from './dom'

interface AnnotationFeature {
  // Should be active on which site (e.g., a URL pattern or domain)
  site: string
  memo: string
  hexColor: string
}

interface Annotation extends AnnotationFeature {
  id: string
  range: Range

  // 0 if not deleted; otherwise, a Unix timestamp (in milliseconds) when it was deleted
  deletedAt: number
}

interface SerializableAnnotation extends AnnotationFeature {
  id: string
  startNodeSelectorPath: string
  startOffset: number
  endOffset: number
  endNodeSelectorPath: string

  // 0 if not deleted; otherwise, a Unix timestamp (in milliseconds) when it was deleted
  deletedAt: number
}

/**
 * Serializes an array of Annotation objects to a JSON string.
 * Converts Range objects to serializable selector paths and offsets.
 * @param annotations - Array of Annotation objects to serialize.
 * @returns JSON string representation of SerializableAnnotation array.
 * @throws Error if serialization fails (e.g., invalid Range).
 */
function serializeAnnotation(annotations: Annotation[]): string {
  const serializable: SerializableAnnotation[] = annotations.map((ann) => ({
    id: ann.id,
    site: ann.site,
    memo: ann.memo,
    hexColor: ann.hexColor,
    startNodeSelectorPath: getNodeSelectorPath(ann.range.startContainer),
    startOffset: ann.range.startOffset,
    endNodeSelectorPath: getNodeSelectorPath(ann.range.endContainer),
    endOffset: ann.range.endOffset,
    deletedAt: ann.deletedAt,
  }))
  return JSON.stringify(serializable)
}

/**
 * Deserializes a JSON string back to an array of Annotation objects.
 * Reconstructs Range objects from selector paths and offsets.
 * @param text - JSON string of SerializableAnnotation array.
 * @returns Array of Annotation objects.
 * @throws Error if deserialization or Range reconstruction fails.
 */
function deserializeAnnotation(text: string): Annotation[] {
  const serializable: SerializableAnnotation[] = JSON.parse(text)
  return serializable.map((ann) => {
    const startNode = getNodeFromSelectorPath(ann.startNodeSelectorPath)
    const endNode = getNodeFromSelectorPath(ann.endNodeSelectorPath)
    const range = document.createRange()
    range.setStart(startNode, ann.startOffset)
    range.setEnd(endNode, ann.endOffset)
    return {
      id: ann.id,
      site: ann.site,
      memo: ann.memo,
      hexColor: ann.hexColor,
      range,
      deletedAt: ann.deletedAt,
    }
  })
}

/**
 * Saves an array of Annotation objects to Chrome storage.
 * Serializes the annotations and stores them under the page-specific key.
 * @param annotations - Array of Annotation objects to save.
 * @returns Promise resolving to true on success, false on failure.
 */
async function saveAnnotations(key: string, annotations: Annotation[]): Promise<boolean> {
  try {
    const localKey = key || pageStorageKey()
    const serialized = serializeAnnotation(annotations)
    await chrome.storage.local.set({ [localKey]: serialized })
    return true
  } catch (error) {
    console.error('Failed to save annotations:', error)
    return false
  }
}

/**
 * Loads an array of Annotation objects from Chrome storage.
 * Deserializes and filters out deleted annotations.
 * @param key - Optional storage key; defaults to the current page's key.
 * @returns Promise resolving to array of non-deleted Annotation objects.
 */
async function loadAnnotations(key?: string): Promise<Annotation[]> {
  try {
    const localKey = key || pageStorageKey()
    const result = await chrome.storage.local.get([localKey])
    const serialized = result[localKey]
    if (!serialized) return []
    const annotations = deserializeAnnotation(serialized)
    // Filter out deleted annotations (deletedAt > 0)
    return annotations.filter((ann) => ann.deletedAt === 0)
  } catch (error) {
    console.error('Failed to load annotations:', error)
    return []
  }
}

/**
 * Generates a storage key based on the current page's origin and pathname.
 * @returns String key for Chrome storage.
 */
function pageStorageKey(): string {
  return `${window.location.origin}${window.location.pathname}`
}

export type { Annotation, AnnotationFeature, SerializableAnnotation }
export {
  loadAnnotations,
  saveAnnotations,
  serializeAnnotation,
  deserializeAnnotation,
  pageStorageKey,
}
