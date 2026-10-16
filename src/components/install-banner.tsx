"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";

/** Événement beforeinstallprompt (Chrome/Edge/Android) — étendu par le navigateur. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "stockkonect:install-banner-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // iOS Safari (mode « Sur l'écran d'accueil »)
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS / iPadOS (l'iPad récent signale un Mac avec multi-touch). */
function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed(): boolean {
  const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Bandeau « Installer l'app » :
 * - iOS/iPadOS : aucun événement navigateur → on guide (Partager → Sur l'écran d'accueil) ;
 * - Android/desktop Chromium : bandeau avec bouton « Installer » dès que beforeinstallprompt se déclenche ;
 * - masqué en mode standalone, après installation, ou 14 jours après fermeture.
 */
export function InstallBanner() {
  const [variant, setVariant] = useState<"hidden" | "ios" | "install">("hidden");
  const [closed, setClosed] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    if (isAppleMobile()) {
      setVariant("ios");
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as BeforeInstallPromptEvent;
      setVariant("install");
    };
    const onAppInstalled = () => {
      deferredRef.current = null;
      setVariant("hidden");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install() {
    const event = deferredRef.current;
    if (!event) return;
    setVariant("hidden");
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "dismissed") {
        // L'utilisateur a refusé l'invite : on réaffiche plus tard.
        setClosed(true);
      } else {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } finally {
      deferredRef.current = null;
    }
  }

  function close() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setClosed(true);
  }

  if (variant === "hidden" || closed) return null;

  const ios = variant === "ios";

  return (
    <section
      aria-label="Installer l'application StockKonect"
      className="fixed bottom-4 left-3 right-20 z-50 max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-white shadow-xl shadow-black/20 backdrop-blur sm:left-4 sm:right-auto"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300"
        >
          {ios ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Installer StockKonect</p>
          {ios ? (
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Dans Safari, touchez <Share aria-hidden="true" className="inline h-3.5 w-3.5 -translate-y-0.5" />{" "}
              <strong>Partager</strong>, puis « Sur l&apos;écran d&apos;accueil ».
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Ajoutez-le à votre écran d&apos;accueil pour l&apos;ouvrir comme une application.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Fermer le bandeau d'installation"
          className="-m-1 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!ios && (
        <button
          type="button"
          onClick={install}
          className="mt-3 w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-400"
        >
          <Download aria-hidden="true" className="mr-2 inline h-4 w-4 -translate-y-0.5" />
          Installer
        </button>
      )}
    </section>
  );
}
