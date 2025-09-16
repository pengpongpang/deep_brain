const CACHE_NAME = 'deep-brain-v' + Date.now(); // 使用时间戳确保每次部署都有新版本
const STATIC_CACHE_NAME = 'deep-brain-static-v3';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 清理所有旧缓存，包括静态缓存
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      // 强制所有客户端使用新的Service Worker
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  // 只处理GET请求
  if (event.request.method !== 'GET') {
    return;
  }

  // 跳过chrome-extension和非http(s)请求
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // 跳过API请求，确保API数据始终从后端获取
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/auth/') ||
      event.request.url.includes('/mindmaps/') ||
      event.request.url.includes('/tasks/') ||
      event.request.url.includes('/llm/')) {
    // API请求直接从网络获取，不使用缓存
    console.log('Service Worker: API request, bypassing cache:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }

  // 对于HTML、JS、CSS等关键资源，采用网络优先策略
  const isStaticAsset = event.request.url.includes('.js') || 
                       event.request.url.includes('.css') || 
                       event.request.destination === 'document';

  if (isStaticAsset) {
    // 网络优先策略：先尝试从网络获取最新版本
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 检查响应是否有效
          if (response && response.status === 200 && response.type === 'basic') {
            // 克隆响应用于缓存
            const responseToCache = response.clone();
            
            // 更新缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            console.log('Service Worker: Serving fresh from network:', event.request.url);
            return response;
          }
          return response;
        })
        .catch(() => {
          // 网络失败时，从缓存获取
          console.log('Service Worker: Network failed, serving from cache:', event.request.url);
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 如果是文档请求且缓存中没有，返回主页
              if (event.request.destination === 'document') {
                return caches.match('/');
              }
            });
        })
    );
  } else {
    // 对于图片等静态资源，采用缓存优先策略
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log('Service Worker: Serving from cache:', event.request.url);
            return response;
          }

          // 从网络获取并缓存
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return response;
            });
        })
    );
  }
});

// 处理推送通知
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Deep Brain 有新的更新',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Deep Brain', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    // 打开应用
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 处理后台同步
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 这里可以添加后台同步逻辑
      console.log('Service Worker: Performing background sync')
    );
  }
});

// 监听消息
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 处理强制更新请求
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    console.log('Service Worker: Force update requested');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Service Worker: Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('Service Worker: All caches cleared, reloading clients');
        // 通知所有客户端重新加载
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
});