'use strict';

/**
 * Service Worker de CrearLibre.
 * Estrategia: "cache first, network fallback" para el cascarón de la app
 * (app shell), de modo que la aplicación funcione 100% offline luego de
 * la primera visita. Las plantillas SVG y los íconos también se
 * precachean porque son parte del contenido esencial de la app.
 */

const VERSION = 'crearlibre-v2';
const CACHE_NAME = `crearlibre-cache-${VERSION}`;

const ARCHIVOS_APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/layout.css',
  './css/accessibility.css',
  './js/app.js',
  './js/canvas.js',
  './js/tools.js',
  './js/gallery.js',
  './js/audio.js',
  './js/adult-panel.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll falla si UN solo recurso no existe todavía (por ejemplo,
      // mientras se completan los bloques de entrega). Cacheamos de a
      // uno para que los recursos ya disponibles queden protegidos.
      await Promise.all(
        ARCHIVOS_APP_SHELL.map(async (ruta) => {
          try {
            await cache.add(ruta);
          } catch (error) {
            console.warn('[sw] No se pudo precachear todavía:', ruta);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombresCache = await caches.keys();
      await Promise.all(
        nombresCache
          .filter((nombre) => nombre.startsWith('crearlibre-cache-') && nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  // Solo interceptamos peticiones GET de nuestro propio origen.
  if (peticion.method !== 'GET' || new URL(peticion.url).origin !== self.location.origin) {
    return;
  }

  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const respuestaCacheada = await cache.match(peticion, { ignoreSearch: true });

      if (respuestaCacheada) {
        // Cache-first: respondemos de inmediato y actualizamos en segundo
        // plano para la próxima visita (stale-while-revalidate liviano).
        evento.waitUntil(
          fetch(peticion)
            .then((respuestaRed) => {
              if (respuestaRed && respuestaRed.ok) {
                cache.put(peticion, respuestaRed.clone());
              }
            })
            .catch(() => {
              /* Sin conexión: seguimos usando la copia en caché. */
            })
        );
        return respuestaCacheada;
      }

      try {
        const respuestaRed = await fetch(peticion);
        if (respuestaRed && respuestaRed.ok) {
          cache.put(peticion, respuestaRed.clone());
        }
        return respuestaRed;
      } catch (error) {
        // Sin red y sin copia en caché: si pidieron una página HTML,
        // devolvemos el cascarón principal para no romper la navegación.
        if (peticion.mode === 'navigate') {
          const indexCacheado = await cache.match('./index.html');
          if (indexCacheado) return indexCacheado;
        }
        throw error;
      }
    })()
  );
});