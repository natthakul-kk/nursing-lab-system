// Service Worker for Nursing Lab System Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'ระบบห้องแล็บพยาบาล',
        message: event.data.text(),
      };
    }
  }

  const title = data.title || 'ระบบห้องปฏิบัติการพยาบาลศาสตร์';
  const options = {
    body: data.message || 'มีการแจ้งเตือนใหม่ในระบบ',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    vibrate: [150, 50, 150],
    tag: data.tag || `notify-${Date.now()}`,
    renotify: true,
    data: data.data || { url: data.linkUrl || '/' },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const action = event.action;

  // หากกดปุ่ม [อนุมัติทันที] บนแถบแจ้งเตือน
  if (action === 'approve' && notificationData.approvalEndpoint) {
    event.waitUntil(
      fetch(notificationData.approvalEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData.approvalBody || { action: 'APPROVE' }),
      })
        .then(async (response) => {
          if (response.ok) {
            return self.registration.showNotification('อนุมัติคำขอเรียบร้อยแล้ว ✅', {
              body: 'ระบบได้ดำเนินการอนุมัติและแจ้งผลไปยังนิสิตเรียบร้อยแล้ว',
              icon: '/icons/icon-192x192.png',
              tag: 'approval-success',
            });
          } else {
            const errData = await response.json().catch(() => ({}));
            return self.registration.showNotification('ไม่สามารถอนุมัติได้ ⚠️', {
              body: errData.error || 'กรุณาเปิดระบบเพื่อตรวจสอบและดำเนินการ',
              icon: '/icons/icon-192x192.png',
              data: { url: notificationData.url || '/approvals' },
            });
          }
        })
        .catch(() => {
          // หากเครือข่ายมีปัญหา ให้เปิดหน้าต่างขึ้นมา
          return self.clients.openWindow(notificationData.url || '/approvals');
        })
    );
    return;
  }

  // หากกด [ดูรายละเอียด] หรือแตะที่ตัวแจ้งเตือน
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
