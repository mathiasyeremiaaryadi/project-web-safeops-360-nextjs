import { AppLogo } from '@/components/shared/app-logo';
import { cn } from '@/lib/utils';

const HIGHLIGHTS = [
  'Tugas cleaning per area dan shift',
  'Inspeksi dan temuan safety di lapangan',
  'Scoring kinerja vendor per site',
];

/**
 * Brand panel shown on the left of the login page from `lg` (1024px) upwards.
 * @param {{ className?: string }} props
 */
export function LoginBrandPanel({ className }) {
  return (
    <aside
      data-testid="login-brand-panel"
      className={cn(
        'hidden flex-col justify-between bg-brand-dark text-brand-dark-foreground lg:flex lg:w-[44%] lg:p-12 xl:w-[48%] xl:p-16 2xl:w-[52%]',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <AppLogo size={40} />
        <span className="text-lg font-bold">SafeOps 360</span>
      </div>

      <div className="max-w-[560px]">
        <p className="text-[40px] leading-[1.15] font-bold tracking-tight">
          Kebersihan dan keselamatan site, dalam satu aplikasi.
        </p>
        <ul className="mt-8 flex flex-col gap-3.5">
          {HIGHLIGHTS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 text-base text-brand-dark-foreground/90"
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-brand-dark-muted">
        Akses hanya untuk pengguna terdaftar. Akun dibuat oleh admin site atau vendor.
      </p>
    </aside>
  );
}
