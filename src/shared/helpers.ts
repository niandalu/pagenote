export async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tabs && tabs.length > 0) {
    return tabs[0]
  }
  return
}

export async function getActiveTabId() {
  const tab = await getActiveTab()
  return tab?.id
}
