const CACHE_NAME = 'orden-compra-cache-v1';
const URLS_TO_CACHE = [
    '/',
    'index.html',
    'login.html',
    'registro.html',
    'perfil.html',
    'usuarios.html',
    'orden.html',
    'orden.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en caché, lo devuelve. Si no, lo busca en la red.
                return response || fetch(event.request);
            })
    );
});
