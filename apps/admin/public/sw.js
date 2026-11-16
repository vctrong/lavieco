/*
 * Service worker of LAVIECO Admin (docs/PWA.md). Hand written on purpose: it only
 * caches files that hold no data.
 *
 * - Pages, Server Actions, RSC payloads and API routes: NEVER cached. Orders and
 *   registrations hold personal data (CLAUDE §11); offline, a page shows /offline.html.
 * - /_next/static (content-hashed JS/CSS/fonts) and /icons: cache first.
 * - Web Push (staff alerts): shows the notification, opens its admin path on tap.
 *
 * Bump VERSION when this file's caching changes: the old caches are deleted on activate.
 */
const VERSION = "v1";
const STATIC_CACHE = `lv-admin-static-${VERSION}`;
const SHELL_CACHE = `lv-admin-shell-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const SHELL_FILES = [OFFLINE_URL, "/icons/icon-192.png"];
/** Hashed chunks pile up across deploys: keep the newest ones only. */
const STATIC_MAX_ENTRIES = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("lv-admin-") && key !== STATIC_CACHE && key !== SHELL_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

async function trimStatic(cache) {
  const keys = await cache.keys();
  const extra = keys.length - STATIC_MAX_ENTRIES;
  for (let index = 0; index < extra; index += 1) await cache.delete(keys[index]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
    void trimStatic(cache);
  }
  return response;
}

async function networkOrOffline(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(networkOrOffline(request));
    return;
  }
  if (isStaticAsset(url)) event.respondWith(cacheFirst(request));
  // Everything else (data, RSC, actions) goes straight to the network, uncached.
});

/** Only same-origin admin paths may be opened from a notification. */
function safePath(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/";
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "LAVIECO";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : undefined,
      lang: "vi",
      data: { url: safePath(data.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    safePath(event.notification.data && event.notification.data.url),
    self.location.origin,
  );
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === target.origin && "focus" in client) {
          return client
            .focus()
            .then((focused) =>
              focused && "navigate" in focused ? focused.navigate(target.href) : focused,
            );
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
