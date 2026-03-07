export default defineBackground(() => {
  // Make clicking the extension icon open the side panel instead of a popup.
  // setPanelBehavior is only available in Chrome 116+.
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {
      // Fallback: open manually via onClicked if setPanelBehavior is unsupported.
      chrome.action.onClicked.addListener((tab) => {
        if (tab.id) chrome.sidePanel.open({ tabId: tab.id })
      })
    })
});
