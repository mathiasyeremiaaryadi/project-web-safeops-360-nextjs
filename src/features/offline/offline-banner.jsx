'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/features/offline/use-online-status';

/** Thin "Offline" bar on small screens while the device has no connection. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-1.5 bg-warning-bg px-4 py-1 text-xs font-semibold text-warning md:hidden"
    >
      <WifiOff aria-hidden="true" className="size-3.5" />
      Offline
    </p>
  );
}
