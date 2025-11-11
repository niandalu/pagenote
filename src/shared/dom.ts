/**
 * Helper: Generates a CSS-like selector path for a DOM node.
 * Traverses up the DOM tree to build a unique path.
 * @param node - The DOM node to generate a path for.
 * @returns Selector path string (e.g., "body > div:nth-child(2) > p").
 */
export function getNodeSelectorPath(node: Node): string {
  const path: string[] = []
  let current: Node | null = node
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const element = current as Element
    let selector = element.tagName.toLowerCase()
    if (element.id) {
      selector += `#${element.id}`
      path.unshift(selector)
      break // ID is unique, no need to go further
    } else {
      const siblings = Array.from(element.parentNode?.children || [])
      const index = siblings.indexOf(element) + 1
      selector += `:nth-child(${index})`
    }
    path.unshift(selector)
    current = element.parentNode
  }
  return path.join(' > ')
}

/**
 * Helper: Retrieves a DOM node from a CSS-like selector path.
 * @param path - Selector path string.
 * @returns The DOM node.
 * @throws Error if the path is invalid or node not found.
 */
export function getNodeFromSelectorPath(path: string): Node {
  const element = document.querySelector(path)
  if (!element) throw new Error(`Node not found for selector: ${path}`)
  return element
}
