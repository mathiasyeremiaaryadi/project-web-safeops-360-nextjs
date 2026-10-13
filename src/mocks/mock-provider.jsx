'use client';

import { useEffect, useState } from 'react';
import { startMockWorker } from '@/mocks/browser';

/**
 * Starts MSW and renders `children` only once the worker is ready, so the very first
 * API request is already mocked. Loaded with `ssr: false` and only when
 * `NEXT_PUBLIC_API_MOCKING=enabled`.
 * @param {{ children: import('react').ReactNode }} props
 */
export function MockProvider({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startMockWorker().then(() => setReady(true));
  }, []);

  return ready ? children : null;
}
