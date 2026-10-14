import { PageHeader } from '@/components/layout/page-header';
import { ChangePasswordForm } from '@/features/auth';
import { ProfileCard, SessionActions } from '@/features/profile';

export const metadata = { title: 'Profil & Sesi' };

/** `/profile` — 1 column (< lg), 2 columns (lg–xl), 3 columns (2xl). */
export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profil & Sesi"
        description="Data akun, ganti password, dan keluar dari perangkat."
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5 2xl:grid-cols-3">
        {/* lg–xl: profile + session stacked on the left; 2xl: three columns. */}
        <div className="flex flex-col gap-4 lg:gap-5 2xl:contents">
          <ProfileCard />
          <div className="2xl:order-3">
            <SessionActions />
          </div>
        </div>
        <section className="rounded-2xl border bg-card p-5 sm:p-6 2xl:order-2">
          <ChangePasswordForm embedded />
        </section>
      </div>
    </>
  );
}
