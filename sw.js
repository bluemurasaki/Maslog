const CACHE_NAME = "mas-log-v6";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // ブラウザの一時保存(HTTPキャッシュ)ではなく、必ずサーバーから最新を取得して保存する
      return cache.addAll(
        ASSETS.map(url => new Request(url, { cache: "reload" }))
      );
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // 画面(HTML)はネット優先: オンラインなら常に最新の index.html を表示し、
  // 圏外のときだけ保存済みのものを使う。
  // → index.html を更新してデプロイすれば、sw.js を変更しなくても反映される。
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request.url, { cache: "no-cache" })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put("./index.html", copy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match("./index.html").then(cached => {
            return cached || caches.match("./");
          });
        })
    );
    return;
  }

  // それ以外(manifest.json など)は従来どおり、保存済みを優先
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
