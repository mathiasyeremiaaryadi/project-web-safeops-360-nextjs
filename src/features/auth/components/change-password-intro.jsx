import { KeyRound } from 'lucide-react';

/**
 * Intro of the stand-alone `/change-password` page. Copy adapts to a mandatory or voluntary
 * change.
 * @param {{ mustChange: boolean, username?: string }} props
 */
export function ChangePasswordIntro({ mustChange, username }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-flex size-11 items-center justify-center rounded-xl bg-warning-bg text-warning"
      >
        <KeyRound className="size-5" />
      </span>
      <h1 className="mt-5 text-[26px] leading-tight font-bold tracking-tight text-foreground sm:text-2xl">
        Buat password baru
      </h1>
      {mustChange ? (
        <p className="mt-2 text-base text-muted-foreground sm:text-[15px]">
          Halo <span className="font-mono text-foreground">{username}</span>, password Anda masih
          sementara dari admin. Ganti dulu sebelum mulai bekerja.
        </p>
      ) : (
        <p className="mt-2 text-base text-muted-foreground sm:text-[15px]">
          Gunakan password yang belum pernah Anda pakai di aplikasi lain.
        </p>
      )}
    </>
  );
}
