import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = Object.freeze({
  32: 'size-8 rounded-lg [&_svg]:size-[18px]',
  40: 'size-10 rounded-[10px] [&_svg]:size-[22px]',
  48: 'size-12 rounded-xl [&_svg]:size-[26px]',
  52: 'size-[52px] rounded-[14px] [&_svg]:size-7',
});

const TONES = Object.freeze({
  /** Yellow tile with a dark icon — the default brand mark. */
  accent: 'bg-accent text-brand-dark',
  /** Dark tile with a yellow icon — used on light surfaces such as the PWA sheet. */
  dark: 'bg-brand-dark text-accent',
});

/**
 * SafeOps 360 logo mark.
 * @param {object} props
 * @param {32 | 40 | 48 | 52} [props.size] Tile size in px (radius 8/10/12/14).
 * @param {'accent' | 'dark'} [props.tone]
 * @param {string} [props.className]
 */
export function AppLogo({ size = 48, tone = 'accent', className }) {
  return (
    <span
      aria-hidden="true"
      data-slot="app-logo"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        SIZES[size],
        TONES[tone],
        className,
      )}
    >
      <ShieldCheck strokeWidth={2.25} />
    </span>
  );
}
