import Link from 'next/link';
import { AppLogo } from '@/components/shared/app-logo';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Halaman tidak ditemukan',
};

/** 404 page. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
      <AppLogo size={48} />
      <h1 className="mt-6 text-2xl font-bold text-foreground">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-sm text-base text-muted-foreground">
        Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
      </p>
      <Link
        href={ROUTES.HOME}
        className={cn(buttonVariants(), 'mt-6 h-11 px-5 text-base font-semibold')}
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
