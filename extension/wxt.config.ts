import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Pingr',
    description: 'AI-powered LinkedIn outreach assistant',
    permissions: ['sidePanel', 'tabs', 'storage'],
    host_permissions: [
      'http://localhost:3000/*',
      'https://pingr-ai2.vercel.app/*',
    ],
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
