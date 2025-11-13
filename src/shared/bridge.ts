export async function deleteAnnotation(key: string, id: string) {
  await chrome.runtime.sendMessage({
    type: 'PAGENOTE:DELETE',
    key,
    id,
    deleted: true,
  })
}

// Jump to annotation location on the page
export async function jumpToAnnotation(key: string, id: string) {
  await chrome.runtime.sendMessage({
    type: 'PAGENOTE:JUMP',
    key,
    id,
  })
}
