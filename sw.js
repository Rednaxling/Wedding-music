/* Caches the whole app on first visit so it opens with no signal at all. */
const CACHE = "cues-v10";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES).then(() =>
        /* Optional: the published settings file may not exist yet. A failure
           here must not stop the app being stored offline. */
        c.add("./cues.json").catch(() => {})
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache first. The app never needs fresh data, and never being offline matters more
   than being up to date. */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  /* The published settings file must always be fresh when it is asked for,
     so try the network first and only fall back to the stored copy. */
  if (e.request.url.indexOf("cues.json") !== -1) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("./cues.json", copy));
          }
          return res;
        })
        .catch(() => caches.match("./cues.json"))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
