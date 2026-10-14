import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Shown when the user's role may not open the current route (UX only; the API enforces). */
export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span
        aria-hidden="true"
        className="inline-flex size-12 items-center justify-center rounded-xl bg-danger-bg text-danger"
      >
        <ShieldX className="size-6" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-foreground">
        Anda tidak memiliki akses ke halaman ini.
      </h1>
      <Link
        href={ROUTES.HOME}
        className={cn(buttonVariants(), 'mt-6 h-11 px-5 text-base font-semibold')}
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
