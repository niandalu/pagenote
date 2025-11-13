import type { Annotation, DomMeta } from '@/shared/model'
import { openSidepanel } from '@/shared/bridge'
import Highlighter from 'web-highlighter'

const highlighter = new Highlighter()

const pageStorageKey = () => {
  return `${window.location.origin}${window.location.pathname}`
}
const currentKey = pageStorageKey()

async function loadAnnotations(): Promise<Annotation[]> {
  const key = currentKey
  // chrome.runtime.sendMessage({ type: 'PAGENOTE:CLEAR', key })
  const response: Annotation[] = await chrome.runtime.sendMessage({
    type: 'PAGENOTE:LOAD',
    key,
  })
  console.info('[PAGENOTE] loaded annotations', response)
  return response
}

function drawAnnotations(annotations: Annotation[]) {
  highlighter.removeAll()
  for (const ann of annotations) {
    highlighter.fromStore(ann.startMeta, ann.endMeta, ann.text, ann.id)
  }
}

async function createAnnotation(
  startMeta: DomMeta,
  endMeta: DomMeta,
  text: string,
): Promise<string> {
  const key = currentKey
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

const reload = () => {
  loadAnnotations().then((annotations) => drawAnnotations(annotations))
}
const debounce = (fn: (...args: any[]) => void, delay: number) => {
  let timeout: any
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
const debouncedReload = debounce(reload, 1000)
const reloadWhenDOMChanged = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        debouncedReload()
      }
    })
  })
  observer.observe(document.body, {
    attributes: false,
    characterData: true,
    childList: true,
    subtree: true,
  })

  return setTimeout(() => {
    observer.disconnect()
  }, 5000)
}

const highlightCurrentSelection = (): Promise<string> => {
  const selection = window.getSelection()
  if (selection && !selection.isCollapsed) {
    const source = highlighter.fromRange(selection.getRangeAt(0))
    return createAnnotation(source.startMeta, source.endMeta, source.text)
  }
  return Promise.resolve('')
}

const installHint = () => {
  let hintElement: HTMLElement | null = null

  function showHint() {
    if (!hintElement) {
      hintElement = document.createElement('div')
      hintElement.innerHTML = 'Press Option+D to highlight'
      hintElement.style.position = 'fixed'
      hintElement.style.left = '10px'
      hintElement.style.bottom = '10px'
      hintElement.style.zIndex = '10000'
      hintElement.style.background = 'white'
      hintElement.style.border = '1px solid black'
      hintElement.style.padding = '5px'
      document.body.appendChild(hintElement)
    }
    hintElement.style.display = 'block'
  }

  function hideHint() {
    if (hintElement) {
      hintElement.style.display = 'none'
    }
  }

  document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      showHint()
    } else {
      hideHint()
    }
  })

  // Hide hint on other interactions
  document.addEventListener('mousedown', hideHint)
  document.addEventListener('keydown', hideHint)
}

const installKeyMaps = () => {
  document.addEventListener('keydown', (e) => {
    if (['∂', 'd'].includes(e.key) && e.altKey) {
      highlightCurrentSelection()
    }
  })
}

async function main() {
  reload()

  installHint()

  // Listen for reload messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PAGENOTE:RELOAD') {
      reload()
      return
    }

    if (message.type === 'PAGENOTE:JUMP') {
      const doms = highlighter.getDoms()
      const dom = doms.find((d) => d.dataset.highlightId === message.id)
      if (dom) {
        dom.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
  })
  // Handle clicks on existing highlights to open side panel
  highlighter.on(Highlighter.event.CLICK, async (data) => {
    if (data && data.id) {
      openSidepanel({
        page: 'annotation.html',
        key: currentKey,
        id: data.id,
      })
    }
  })

  installKeyMaps()
}

main()
