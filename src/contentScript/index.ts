import { Annotation, AnnotationModel, DomMeta } from '@/shared/model'
import Highlighter from 'web-highlighter'

const pageStorageKey = () => {
  return `${window.location.origin}${window.location.pathname}`
}

async function loadAnnotations(): Promise<Annotation[]> {
  const key = pageStorageKey()
  // chrome.runtime.sendMessage({ type: 'PAGENOTE:CLEAR', key })
  const response: Annotation[] = await chrome.runtime.sendMessage({
    type: 'PAGENOTE:LOAD',
    key,
  })
  return response
}

function drawAnnotations(annotations: Annotation[], highlighter: Highlighter) {
  highlighter.removeAll()
  for (const ann of annotations) {
    highlighter.fromStore(ann.startMeta, ann.endMeta, ann.id, ann.text)
  }
}

async function createAnnotation(startMeta: DomMeta, endMeta: DomMeta, text: string) {
  const key = pageStorageKey()
  const response = await chrome.runtime.sendMessage({
    type: 'PAGENOTE:CREATE',
    key,
    startMeta,
    endMeta,
    text,
  })
  console.info('[PAGENOTE] created annotation', response.id)
  return response.id
}

async function main() {
  const highlighter = new Highlighter()
  const annotations = await loadAnnotations()
  console.info('[PAGENOTE] annotations', annotations)
  drawAnnotations(annotations, highlighter)

  // Listen for reload messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PAGENOTE:RELOAD') {
      loadAnnotations().then((annotations) => drawAnnotations(annotations, highlighter))
    }
  })

  // Handle clicks on existing highlights to open side panel
  highlighter.on(Highlighter.event.CLICK, (data) => {
    if (data && data.id) {
      chrome.runtime.sendMessage({
        type: 'PAGENOTE:OPEN_SIDEPANEL',
        key: pageStorageKey(),
        id: data.id,
      })
    }
  })

  let iconElement: HTMLElement | null = null

  function showIcon(x: number, y: number) {
    if (!iconElement) {
      iconElement = document.createElement('div')
      iconElement.innerHTML = '📝'
      iconElement.style.position = 'fixed'
      iconElement.style.zIndex = '10000'
      iconElement.style.cursor = 'pointer'
      iconElement.style.background = 'white'
      iconElement.style.border = '1px solid black'
      iconElement.style.padding = '5px'

      iconElement.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        e.preventDefault()
      })
      iconElement.addEventListener('mouseup', (e) => {
        e.stopPropagation()
        e.preventDefault()
        const selection = window.getSelection()
        if (selection && !selection.isCollapsed) {
          const source = highlighter.fromRange(selection.getRangeAt(0))
          createAnnotation(source.startMeta, source.endMeta, source.text)
        }
        hideIcon()
      })
      document.body.appendChild(iconElement)
    }
    iconElement.style.left = `${x + 10}px`
    iconElement.style.top = `${y - 10}px`
    iconElement.style.display = 'block'
  }

  function hideIcon() {
    if (iconElement) {
      iconElement.style.display = 'none'
    }
  }

  document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      showIcon(e.clientX, e.clientY)
    } else {
      hideIcon()
    }
  })

  // Hide icon on other interactions
  document.addEventListener('mousedown', hideIcon)
  document.addEventListener('keydown', hideIcon)
}

main()
