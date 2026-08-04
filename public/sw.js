self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests
  // This is required by some browsers (like older versions of Chrome/Edge) to trigger the PWA install prompt.
  // We're not doing any custom caching here to avoid stale data issues.
});
