'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __staygoHydrated?: boolean;
    STAYGO_I18N?: { start: () => void };
  }
}

/** Starts the TH/EN translator (/assets/js/i18n.js) once React has hydrated, so it never
 *  changes text React is still matching against the server HTML. */
export default function I18nBoot() {
  useEffect(() => {
    window.__staygoHydrated = true;
    window.STAYGO_I18N?.start();
  }, []);
  return null;
}
