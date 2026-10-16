'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

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

/** @returns {'ios' | 'android' | 'desktop'} */
function detectPlatform() {
  const agent = window.navigator.userAgent;
  // iPadOS reports a Mac user agent: a touch screen tells it apart.
  if (/iPad|iPhone|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  return /Android/.test(agent) ? 'android' : 'desktop';
}

/** @typedef {{ installed: boolean, platform: 'ios' | 'android' | 'desktop', secure: boolean }} Device */

/** @type {Device | null} */
let deviceCache = null;
/** The device does not change while the page is open: read it once. @returns {Device} */
const getDevice = () =>
  (deviceCache ??= {
    installed: isStandalone(),
    platform: detectPlatform(),
    secure: window.isSecureContext,
  });
/** Server render: nothing is known, so nothing install-related is shown. @type {Device} */
const SERVER_DEVICE = Object.freeze({ installed: true, platform: 'desktop', secure: true });
const noSubscription = () => () => {};

/**
 * Installing the PWA. `canPrompt`: the browser offered its own install dialog
 * (`beforeinstallprompt`; Chrome/Edge over HTTPS only). Without it the app shows the steps of the
 * device's browser instead (iOS Safari never offers one).
 * @returns {{
 *   installed: boolean,
 *   canPrompt: boolean,
 *   showInvite: boolean,
 *   platform: 'ios' | 'android' | 'desktop',
 *   secure: boolean,
 *   install: () => Promise<void>,
 *   dismiss: () => void,
 * }}
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(/** @type {any} */ (null));
  const [hidden, setHidden] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const device = useSyncExternalStore(noSubscription, getDevice, () => SERVER_DEVICE);
  const dismissedRecently = useSyncExternalStore(noSubscription, wasDismissedRecently, () => true);
  const installed = device.installed || justInstalled;

  useEffect(() => {
    /** @param {Event} event */
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (isStandalone()) return;
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setJustInstalled(true);
    };

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

  const canPrompt = Boolean(deferredPrompt) && !installed;
  return {
    ...device,
    installed,
    canPrompt,
    // The bottom-sheet invitation: only with the browser's dialog, and not after "Nanti".
    showInvite: canPrompt && !hidden && !dismissedRecently,
    install,
    dismiss,
  };
}
