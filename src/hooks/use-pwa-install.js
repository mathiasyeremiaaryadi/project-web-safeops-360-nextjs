'use client';

import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'safeops:pwa-install-dismissed-at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "Nanti" is a UI preference (not sensitive data), so it may live in localStorage.
 * @returns {boolean}
 */
function wasDismissedRecently() {
  try {
    const value = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(value) && value > 0 && Date.now() - value < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

/** @returns {boolean} */
function isStandalone() {
  return (
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    /** @type {any} */ (window.navigator).standalone === true
  );
}

/**
 * Tracks the `beforeinstallprompt` event for the PWA install invitation.
 * @returns {{ canInstall: boolean, install: () => Promise<void>, dismiss: () => void }}
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(/** @type {any} */ (null));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    /** @param {Event} event */
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (isStandalone() || wasDismissedRecently()) return;
      setDeferredPrompt(event);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable (private mode): hide for this page view only.
    }
    setHidden(true);
  }, []);

  return { canInstall: Boolean(deferredPrompt) && !hidden, install, dismiss };
}
