import { AppLogo } from '@/components/shared/app-logo';
import { PwaInstallPrompt } from '@/components/shared/pwa-install-prompt';
import { LoginBrandPanel } from '@/features/auth/components/login-brand-panel';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = {
  title: 'Masuk',
};

/**
 * `/login`
 * @param {{ searchParams: Promise<Record<string, string | string[] | undefined>> }} props
 */
export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-1">
      <LoginBrandPanel />

      <main className="flex flex-1 justify-center px-5 pt-12 pb-10 sm:items-center sm:px-8 sm:py-12">
        <div className="w-full sm:max-w-[440px] sm:rounded-2xl sm:border sm:bg-card sm:p-8 lg:max-w-[400px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
          <AppLogo size={48} className="mb-7 sm:mb-6 lg:hidden" />

          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-foreground sm:text-[28px]">
            Masuk ke SafeOps 360
          </h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-[15px]">
            Gunakan username dan password dari admin vendor atau site Anda.
          </p>

          <div className="mt-8 sm:mt-7">
            <LoginForm next={typeof next === 'string' ? next : null} />
          </div>

          <p className="mt-6 text-[15px] text-muted-foreground sm:mt-5 sm:text-sm">
            Lupa password? Hubungi Admin Worker vendor Anda atau Super Admin untuk reset.
          </p>

          <PwaInstallPrompt />
        </div>
      </main>
    </div>
  );
}
