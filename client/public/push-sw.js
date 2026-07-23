/* global self, clients */
// Web Push handlers, appended to the generated Workbox service worker via
// workbox.importScripts (see client/vite.config.ts). Kept as plain JS in
// public/ — it must be servable at a stable URL next to sw.js.

self.addEventListener("push", (event) => {
  let payload = { title: "JiraniOne", body: "", linkTo: "/notifications", tag: undefined };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Non-JSON payload — show it as the body rather than dropping it.
    payload.body = event.data ? event.data.text() : "";
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      data: { linkTo: payload.linkTo || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const linkTo = (event.notification.data && event.notification.data.linkTo) || "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // Focus an existing app window and navigate it, else open a new one.
      for (const win of wins) {
        if ("focus" in win) {
          win.focus();
          if ("navigate" in win) win.navigate(linkTo);
          return;
        }
      }
      return clients.openWindow(linkTo);
    }),
  );
});
