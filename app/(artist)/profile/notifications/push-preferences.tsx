"use client";

import { useState } from "react";

function base64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Url);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPreferences({
  vapidPublicKey,
  defaultEnabled,
}: {
  vapidPublicKey: string;
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [status, setStatus] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);

  async function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("Push is not supported in this browser.");
      return;
    }
    if (!vapidPublicKey) {
      setStatus("VAPID_PUBLIC_KEY is not configured.");
      return;
    }

    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Permission denied.");
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(vapidPublicKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!res.ok) throw new Error("Failed to save push subscription.");
      setEnabled(true);
      setStatus("Push notifications enabled.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to enable push.");
    } finally {
      setIsBusy(false);
    }
  }

  async function disablePush() {
    if (!("serviceWorker" in navigator)) return;
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      setStatus("Push notifications disabled.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to disable push.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-sm font-semibold text-stone-800">Browser Push</p>
      <p className="mt-1 text-xs text-stone-500">
        Receive push notifications even when this tab is not active.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isBusy || enabled}
          onClick={enablePush}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 disabled:opacity-50"
        >
          Enable push
        </button>
        <button
          type="button"
          disabled={isBusy || !enabled}
          onClick={disablePush}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50"
        >
          Disable push
        </button>
      </div>
      {status && <p className="mt-2 text-xs text-stone-500">{status}</p>}
    </div>
  );
}
