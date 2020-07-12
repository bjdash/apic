var staticCacheName = 'apic-http-v9';
var allCaches = [
    staticCacheName
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            console.log('caching');
            return cache.addAll([
                // '/',
                '/online/favicon.ico',
                '/online/icon_128.png',
                '/online/icon_192.png',
                '/online/icon_512.png',
                '/online/img/1.png',
                '/online/img/2.png',
                '/online/img/3.png',
                '/online/img/4.png',
                '/online/img/apic-dark.png',
                '/online/img/apic-light.png',
                '/online/img/apic-logo.svg',
                '/online/img/pattern.svg',
                '/online/index.html',
                '/online/manifest.json',
                '/online/modules/tester/tester.html',
                '/online/scripts/ace.js',
                '/online/scripts/ajv.bundle.js',
                '/online/scripts/apic-lib.js',
                '/online/scripts/apic-proto.js',
                '/online/scripts/chai.min.js',
                '/online/scripts/ext-language_tools.js',
                '/online/scripts/ext-searchbox.js',
                '/online/scripts/jqa.min.js',
                '/online/scripts/mode-graphql.js',
                '/online/scripts/mode-html.js',
                '/online/scripts/mode-javascript.js',
                '/online/scripts/mode-json.js',
                '/online/scripts/mode-text.js',
                '/online/scripts/mode-xml.js',
                '/online/scripts/mode-yaml.js',
                '/online/scripts/moduleLibs.min.js',
                '/online/scripts/snippets/html.js',
                '/online/scripts/snippets/javascript.js',
                '/online/scripts/snippets/json.js',
                '/online/scripts/snippets/xml.js',
                '/online/scripts/snippets/yaml.js',
                '/online/scripts/tester.js',
                '/online/scripts/thirdParty.min.js',
                '/online/scripts/worker-html.js',
                '/online/scripts/worker-javascript.js',
                '/online/scripts/worker-json.js',
                '/online/scripts/worker-xml.js',
                '/online/styles/fonts/apic-icon.eot',
                '/online/styles/fonts/apic-icon.svg',
                '/online/styles/fonts/apic-icon.ttf',
                '/online/styles/fonts/apic-icon.woff',
                '/online/styles/fonts/Comfortaa-Bold.ttf',
                '/online/styles/fonts/Comfortaa-Light.ttf',
                '/online/styles/fonts/Comfortaa-Regular.ttf',
                '/online/styles/fonts/glyphicons-halflings-regular.eot',
                '/online/styles/fonts/glyphicons-halflings-regular.svg',
                '/online/styles/fonts/glyphicons-halflings-regular.ttf',
                '/online/styles/fonts/glyphicons-halflings-regular.woff',
                '/online/styles/fonts/glyphicons-halflings-regular.woff2',
                '/online/styles/fonts/Poppins-Bold.woff2',
                '/online/styles/fonts/Poppins-Regular.woff2',
                '/online/styles/fonts/roboto-bold.woff2',
                '/online/styles/fonts/roboto.woff2',
                '/online/styles/styles.min.css',
                '/online/swHelper.js',
                '/online/templates.js'
            ]);
        })
    );
});

self.addEventListener('activate', function (event) {
    console.log('actiated..........')
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('apic-http') &&
                        !allCaches.includes(cacheName);
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function (event) {
    var requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin && (requestUrl.pathname === '/online/')) {
        console.log('returning index');
        event.respondWith(caches.match('/online/index.html'));
        return;
    }

    // console.log(requestUrl.pathname)
    event.respondWith(
        caches.match(event.request).then(function (response) {
            if (response) {
                console.log('found in cache ' + requestUrl.pathname);
                return response;
            }
            console.log('not found in cache ' + requestUrl.pathname);
            return fetch(event.request);
            // return response || fetch(event.request);
        })
    );
});

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});