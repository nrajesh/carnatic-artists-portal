self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Notification", body: event.data.text() };
  }

  const title = payload.title || "Carnatic Artist Portal";
  const options = {
    body: payload.body || "You have a new notification.",
    data: { url: payload.url || "/" },
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
