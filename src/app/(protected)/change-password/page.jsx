import { ChangePasswordForm } from '@/features/auth/components/change-password-form';

export const metadata = {
  title: 'Buat Password Baru',
};

/** `/change-password` */
export default function ChangePasswordPage() {
  return (
    <main className="flex-1 sm:px-6 sm:pt-8 sm:pb-12 md:pt-14">
      <div className="mx-auto w-full bg-card px-4 py-6 sm:max-w-[480px] sm:rounded-2xl sm:border sm:p-8">
        <ChangePasswordForm />
      </div>
    </main>
  );
}
