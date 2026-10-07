"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, WifiOff } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    // The dev server's chunks are not content-hashed, so caching them would serve stale code.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("Error registering service worker:", error));
  }, []);

  return null;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-muted px-4 py-1.5 text-xs text-muted-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      Sem conexão — as entradas voltam quando a internet retornar.
    </div>
  );
}

const noopSubscribe = () => () => {};

function isIOSInBrowser() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true);
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone;
}

export function InstallButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const showIOSHint = useSyncExternalStore(
    noopSubscribe,
    isIOSInBrowser,
    () => false
  );

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installEvent) {
    return (
      <button
        onClick={async () => {
          await installEvent.prompt();
          await installEvent.userChoice;
          setInstallEvent(null);
        }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Download className="h-4 w-4" />
        Instalar app
      </button>
    );
  }

  // Safari on iOS has no install prompt; the user has to add it by hand.
  if (showIOSHint) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Para instalar: toque em Compartilhar e depois em &quot;Adicionar à Tela
        de Início&quot;.
      </p>
    );
  }

  return null;
}
