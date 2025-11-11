const now = () => Number(new Date())

export interface DomMeta {
  parentTagName: string
  parentIndex: number
  textOffset: number
  extra?: unknown
}

interface Annotation {
  id: string
  // original text content
  text: string

  // Should be active on which site (e.g., a URL pattern or domain)
  site: string
  // memo note
  memo: string
  hexColor: string

  startMeta: DomMeta
  endMeta: DomMeta

  createdAt: number
  updatedAt: number
  // 0 if not deleted; otherwise, a Unix timestamp (in milliseconds) when it was deleted
  deletedAt: number
}

class AnnotationModel {
  key: string
  list: Annotation[]

  constructor(list: Annotation[], key: string) {
    this.list = list
    this.key = key
  }

  static async init(key: string): Promise<AnnotationModel> {
    const annotations = await AnnotationModel.loadAnnotations(key)
    return new AnnotationModel(annotations, key)
  }

  async save() {
    await AnnotationModel.saveAnnotations(this.key, this.list)
  }

  async reload() {
    this.list = await AnnotationModel.loadAnnotations(this.key)
  }

  async create(patch: { startMeta: DomMeta; endMeta: DomMeta; text: string }): Promise<Annotation> {
    const id = crypto.randomUUID()
    const ts = now()
    const annotation: Annotation = {
      id,
      site: this.key,
      startMeta: patch.startMeta,
      endMeta: patch.endMeta,
      text: patch.text,
      memo: '',
      hexColor: '#ffff00',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: 0,
    }
    this.list.push(annotation)
    await this.save()
    return annotation
  }

  async update(id: string, updater: (a: Annotation) => Annotation): Promise<Annotation[]> {
    this.list = this.list.map((ann) =>
      ann.id === id ? { ...updater(ann), updatedAt: now() } : ann,
    )
    await this.save()
    return this.list
  }

  async destroy(id: string, deleted: boolean) {
    const deletedAt = deleted ? +Date.now() : 0

    this.list = this.list.map((ann) =>
      ann.id === id ? { ...ann, updatedAt: deletedAt, deletedAt } : ann,
    )
    await this.save()
  }

  async truncate() {
    if (this.list.length) {
      return false
    }
    this.list.length = 0
    await this.save()
    return true
  }

  /**
   * Serializes an array of Annotation objects to a JSON string.
   * Converts Range objects to serializable selector paths and offsets.
   * @param annotations - Array of Annotation objects to serialize.
   * @returns JSON string representation of SerializableAnnotation array.
   * @throws Error if serialization fails (e.g., invalid Range).
   */
  static serializeAnnotation(annotations: Annotation[]): string {
    return JSON.stringify(annotations)
  }

  static deserializeAnnotation(text: string): Annotation[] {
    return JSON.parse(text)
  }

  /**
   * Saves an array of Annotation objects to Chrome storage.
   * Serializes the annotations and stores them under the page-specific key.
   * @param annotations - Array of Annotation objects to save.
   * @returns Promise resolving to true on success, false on failure.
   */
  static async saveAnnotations(key: string, annotations: Annotation[]): Promise<boolean> {
    try {
      const serialized = AnnotationModel.serializeAnnotation(annotations)
      await chrome.storage.local.set({ [key]: serialized })
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
  static async loadAnnotations(key: string): Promise<Annotation[]> {
    try {
      const result = await chrome.storage.local.get([key])
      const serialized = result[key]
      if (!serialized) return []
      const annotations = AnnotationModel.deserializeAnnotation(serialized)
      // Filter out deleted annotations (deletedAt > 0)
      return annotations.filter((ann) => ann.deletedAt === 0)
    } catch (error) {
      console.error('Failed to load annotations:', error)
      return []
    }
  }
}

export type { Annotation }
export { AnnotationModel }
