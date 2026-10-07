"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "unsupported" | "off" | "busy" | "on" | "denied";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function saveSubscription(subscription: PushSubscription, welcome: boolean) {
  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription, welcome }),
  });
}

async function currentStatus(): Promise<Status> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return "off";
  // Keeps the server in step if it ever lost this device.
  saveSubscription(subscription, false).catch(() => {});
  return "on";
}

// Turns on reminders for this device. On iPhone it only works in the installed app.
export function NotificationsButton() {
  const [status, setStatus] = useState<Status>("loading");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    currentStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus("unsupported");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setFailed(true);
      return;
    }
    setStatus("busy");
    setFailed(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const response = await saveSubscription(subscription, true);
      if (!response.ok) throw new Error("subscribe failed");
      setStatus("on");
    } catch (error) {
      console.error("Error enabling notifications:", error);
      setStatus("off");
      setFailed(true);
    }
  };

  if (status === "loading" || status === "unsupported") return null;

  if (status === "on") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <BellRing className="h-4 w-4" />
        Avisos ativos
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span className="flex max-w-36 shrink-0 items-start gap-1.5 pt-1 text-xs text-muted-foreground">
        <BellOff className="h-4 w-4 shrink-0" />
        Avisos bloqueados nos ajustes do aparelho
      </span>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={enable}
        disabled={status === "busy"}
      >
        <Bell className="h-4 w-4" />
        {status === "busy" ? "Ativando..." : "Ativar avisos"}
      </Button>
      {failed && (
        <span className="text-xs text-destructive">Não foi possível ativar.</span>
      )}
    </div>
  );
}
