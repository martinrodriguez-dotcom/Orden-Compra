// Define un nombre para el caché actual. Cambiar este nombre invalidará el caché anterior.
const CACHE_NAME = 'orden-compra-cache-v1';

// Lista de todos los archivos y recursos que la aplicación necesita para funcionar sin conexión.
const URLS_TO_CACHE = [
    // El punto de partida de la PWA
    '/',
    // Las páginas HTML principales de la aplicación
    'index.html',
    'login.html',
    'registro.html',
    'perfil.html',
    'usuarios.html',
    'orden.html',
    // Los archivos de lógica JavaScript
    'index.js', // Asumiendo que crearemos este archivo
    'orden.js',
    // Archivos de manifiesto e íconos (opcional, pero buena práctica)
    'manifest.json',
    'https://placehold.co/192x192/4338ca/ffffff?text=OC',
    'https://placehold.co/512x512/4338ca/ffffff?text=OC',
    // Recursos externos (librerías, fuentes)
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
// Aquí es donde guardamos todos nuestros archivos en el caché.
self.addEventListener('install', event => {
    // waitUntil espera a que la promesa se resuelva antes de dar por finalizada la instalación.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto y listo para guardar archivos.');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

// Evento 'fetch': Se dispara cada vez que la aplicación intenta hacer una solicitud de red
// (por ejemplo, cargar una página, una imagen, un script, etc.).
self.addEventListener('fetch', event => {
    // respondWith intercepta la solicitud y nos permite dar nuestra propia respuesta.
    event.respondWith(
        // Busca si la solicitud ya existe en nuestro caché.
        caches.match(event.request)
            .then(response => {
                // Si encontramos una respuesta en el caché (response is not null), la devolvemos.
                if (response) {
                    return response;
                }
                // Si no está en el caché, continuamos con la solicitud de red original.
                return fetch(event.request);
            })
    );
});

// Evento 'activate': Se dispara cuando un nuevo Service Worker se activa.
// Es un buen lugar para limpiar cachés antiguos.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Si el nombre del caché no está en nuestra lista blanca, lo eliminamos.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
