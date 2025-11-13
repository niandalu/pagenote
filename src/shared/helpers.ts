export async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tabs && tabs.length > 0) {
    return tabs[0].id // This is the ID of the active tab
  }
  return
}
