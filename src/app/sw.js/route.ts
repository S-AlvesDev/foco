/**
 * Service Worker do app, servido em /sw.js (escopo: o site inteiro).
 * Gerado a cada build: a versão muda em cada deploy, o que dispara o aviso de atualização.
 */
const VERSION =
  process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now().toString(36)}`;

export function GET() {
  return new Response(script(VERSION), {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}

function script(version: string) {
  return `/* Missão Alpha-01 — service worker ${version} */
const VERSION = ${JSON.stringify(version)};
const STATIC_CACHE = "alpha-static-" + VERSION;
const PAGES_CACHE = "alpha-pages-" + VERSION;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/badge-96.png", "/brand/emblema.webp", "/brand/marca.webp"];
/* Telas com dados do usuário que podem ser abertas sem internet (cópia da última visita). */
const OFFLINE_PAGES = ["/painel", "/sessoes", "/materias", "/revisoes", "/calendario", "/metas", "/desempenho", "/notificacoes"];
const NAV_TIMEOUT = 8000;

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  /^\\/(brand|icons|splash)\\//.test(url.pathname) ||
  url.pathname === "/favicon.ico";

const offlineEligible = (url) =>
  OFFLINE_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));

/** Guarda também os arquivos de script/estilo que a página usa, para ela funcionar offline. */
async function cacheAssetsOf(html) {
  const cache = await caches.open(STATIC_CACHE);
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\\/_next\\/static\\/[^"]+)"/g)) urls.add(m[1]);
  await Promise.all(
    [...urls].map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch {}
    }),
  );
}

async function storePage(request, response) {
  const html = await response.clone().text();
  const headers = new Headers();
  headers.set("content-type", response.headers.get("content-type") || "text/html; charset=utf-8");
  headers.set("x-alpha-cached-at", new Date().toISOString());
  const copy = new Response(html, { status: 200, headers });
  const cache = await caches.open(PAGES_CACHE);
  await cache.put(new URL(request.url).pathname, copy);
  await cacheAssetsOf(html);
}

/** Marca a cópia salva, para a página avisar que os dados não são atuais. */
async function markCached(response) {
  const at = response.headers.get("x-alpha-cached-at") || "";
  const html = (await response.text()).replace(
    "<head>",
    '<head><meta name="alpha-cached-at" content="' + at + '">',
  );
  return new Response(html, { status: 200, headers: { "content-type": response.headers.get("content-type") || "text/html; charset=utf-8" } });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE);
      const offline = await cache.match(OFFLINE_URL);
      if (offline) await cacheAssetsOf(await offline.text());
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("alpha-") && k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "SKIP_WAITING") self.skipWaiting();
  if (msg.type === "CLEAR_USER_DATA") event.waitUntil(caches.delete(PAGES_CACHE));
  if (msg.type === "WARM") {
    event.waitUntil(
      (async () => {
        for (const path of OFFLINE_PAGES.slice(0, 7)) {
          try {
            const req = new Request(path, { credentials: "same-origin", headers: { accept: "text/html" } });
            const res = await fetch(req);
            if (res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
              await storePage(req, res);
            }
          } catch {}
        }
      })(),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request, { ignoreSearch: url.pathname.startsWith("/icons/") });
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok && url.pathname.startsWith("/_next/static/")) cache.put(request, res.clone());
        return res;
      })(),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await Promise.race([
            fetch(request),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT)),
          ]);
          const type = res.headers.get("content-type") || "";
          if (res.ok && !res.redirected && type.includes("text/html") && offlineEligible(url)) {
            event.waitUntil(storePage(request, res.clone()));
          }
          return res;
        } catch {
          const pages = await caches.open(PAGES_CACHE);
          const saved = await pages.match(url.pathname);
          if (saved) return markCached(saved);
          return (await caches.match(OFFLINE_URL)) || new Response("Sem conexão", { status: 503 });
        }
      })(),
    );
  }
});

/* ---------- Notificações ---------- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Missão Alpha-01", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "Missão Alpha-01", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: data.tag || undefined,
        lang: "pt-BR",
        data: { id: data.id || null, url: data.url || "/notificacoes" },
      });
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) c.postMessage({ type: "NOTIFICATION_RECEIVED" });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { id, url } = event.notification.data || {};
  const target = id ? "/notificacoes/abrir/" + id : url || "/notificacoes";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) return c.navigate(target);
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
`;
}
