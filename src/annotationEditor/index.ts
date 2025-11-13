import { mount } from 'svelte'
import App from './AnnotationEditor.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
