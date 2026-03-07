import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Pingr',
    description: 'AI-powered LinkedIn outreach assistant',
    permissions: ['sidePanel', 'tabs', 'storage'],
    host_permissions: [
      // Dev backend — update to your production URL when you deploy
      'http://localhost:3000/*',
    ],
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
