export default defineContentScript({
  matches: ['*://www.linkedin.com/in/*'],
  main() {
    // Content script runs on LinkedIn profile pages.
    // Notifies the background service worker that we're on a profile page,
    // so it can enable the side panel action for this tab.
    console.log('[Pingr] LinkedIn profile detected:', window.location.href);
  },
});
