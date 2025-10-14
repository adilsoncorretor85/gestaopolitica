// Service Worker para PWA - Gestão Política
const CACHE_NAME = 'gestao-politica-v1.0.3';
const STATIC_CACHE = 'static-v1.0.3';
const DYNAMIC_CACHE = 'dynamic-v1.0.3';
const API_CACHE = 'api-v1.0.3';

// Arquivos estáticos para cache
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html'
];

// URLs de API para cache
const API_URLS = [
  '/api/',
  'https://ojxwwjurwhwtoydywvch.supabase.co/'
];

// Estratégias de cache
const CACHE_STRATEGIES = {
  // Cache First - para assets estáticos
  CACHE_FIRST: 'cache-first',
  // Network First - para dados dinâmicos
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate - para recursos que podem ser atualizados
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cacheando arquivos estáticos...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Service Worker instalado com sucesso!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erro ao instalar Service Worker:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Remove TODOS os caches antigos (incluindo versões anteriores)
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
                 .then(() => {
                   console.log('[SW] Service Worker ativado! Limpando cache antigo...');
                   // Força limpeza de todos os caches antigos
                   return Promise.all([
                     caches.delete('gestao-politica-v1.0.0'),
                     caches.delete('gestao-politica-v1.0.1'),
                     caches.delete('gestao-politica-v1.0.2'),
                     caches.delete('static-v1.0.0'),
                     caches.delete('static-v1.0.1'),
                     caches.delete('static-v1.0.2'),
                     caches.delete('dynamic-v1.0.0'),
                     caches.delete('dynamic-v1.0.1'),
                     caches.delete('dynamic-v1.0.2'),
                     caches.delete('api-v1.0.0'),
                     caches.delete('api-v1.0.1'),
                     caches.delete('api-v1.0.2')
                   ]);
                 })
             .then(() => {
               console.log('[SW] Cache antigo removido com sucesso!');
               return self.clients.claim();
             })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Estratégia baseada no tipo de recurso
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirst(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(navigationHandler(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Verificar se é um asset estático
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Verificar se é uma requisição de API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         url.hostname.includes('supabase.co') ||
         url.hostname.includes('googleapis.com');
}

// Verificar se é uma requisição de navegação
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Estratégia Cache First
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.status !== 206) {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.log('[SW] Erro ao armazenar no cache estático:', cacheError);
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Erro no cache first:', error);
    return new Response('Recurso não disponível offline', { status: 503 });
  }
}

// Estratégia Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.status !== 206) {
      // Só armazenar no cache se não for uma resposta parcial (206)
      const cache = await caches.open(API_CACHE);
      try {
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.log('[SW] Erro ao armazenar no cache:', cacheError);
      }
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Rede indisponível, tentando cache...');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retornar dados offline para APIs específicas
    if (request.url.includes('/api/people')) {
      return new Response(JSON.stringify({
        data: [],
        message: 'Dados não disponíveis offline'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Serviço indisponível offline', { status: 503 });
  }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok && networkResponse.status !== 206) {
      try {
        cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.log('[SW] Erro ao armazenar no cache dinâmico:', cacheError);
      }
    }
    return networkResponse;
  }).catch(() => {
    // Se a rede falhar, retornar cache se disponível
    return cachedResponse;
  });

  return cachedResponse || fetchPromise;
}

// Handler para navegação
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Retornar página offline para navegação
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback básico
    return new Response(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - Gestão Política</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <h1 class="offline">Você está offline</h1>
          <p>Verifique sua conexão com a internet e tente novamente.</p>
          <button onclick="window.location.reload()">Tentar Novamente</button>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background Sync para sincronização offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Implementar sincronização de dados offline
    console.log('[SW] Executando sincronização em background...');
    
    // Aqui você pode implementar a lógica para sincronizar
    // dados que foram salvos offline
    
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification recebida:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do sistema',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Gestão Política', options)
  );
});

// Click em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Apenas fechar a notificação
  } else {
    // Abrir a aplicação
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service Worker carregado! Versão 1.0.3 - Cache limpo!');