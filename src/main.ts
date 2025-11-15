import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Global error handler for chunk loading failures
// This handles cases where the dev server restarts or new deployments occur
const RELOAD_KEY = 'chunk_reload_timestamp';
const RELOAD_THRESHOLD = 10000; // 10 seconds

window.addEventListener('error', (event) => {
  const isChunkLoadError =
    event.message.includes('Failed to fetch dynamically imported module') ||
    event.message.includes('Importing a module script failed') ||
    (event.error?.message && event.error.message.includes('Failed to fetch'));

  if (isChunkLoadError) {
    const lastReload = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10);
    const now = Date.now();

    // Prevent infinite reload loops - only reload if last reload was > 10s ago
    if (now - lastReload > RELOAD_THRESHOLD) {
      console.warn('Chunk load error detected. Reloading page...', event.error);
      sessionStorage.setItem(RELOAD_KEY, now.toString());
      window.location.reload();
    } else {
      console.error('Chunk load error - reload skipped to prevent loop', event.error);
      sessionStorage.removeItem(RELOAD_KEY);
    }
  }
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
