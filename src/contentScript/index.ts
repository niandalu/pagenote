// use web highlighter to highlight texts
// reference: https://www.npmjs.com/package/web-highlighter/v/0.3.3
//
// when page is full loaded
// 1. load annotations from storage `loadAnnotations`
// 2. restore annotations
//
// 3. listen to selections
// 4. when highlited, save them to storage
//
// 5. when a highlight is clicked, send out a message to background script `chrome.runtime.sendMessage`. This action will finally open a side panel with current annotation id
import { Annotation } from './model'

function loadAnnotations(): Annotation[] {
  // use current origin + pathname as key
  // load from storage
  // feed them to store
}

function drawAnnotations(annotations: Annotation[]) {
  // apply given annotations to page
}

function createAnnotation(range: Range): Annotation {
  // use given range create an annotation
}

function main() {
  const annotations = loadAnnotations()
  drawAnnotations(annotations)

  // setup web highlighter
}

document.addEventListener('DOMContentLoaded', () => {
  main()
})
