export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showLocalNotification(
  title: string,
  body: string,
  tag: string = "default"
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Use SW registration for persistent notifications if available
  navigator.serviceWorker?.ready.then((reg) => {
    reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      tag,
      data: { url: "/dashboard" },
    });
  });
}
