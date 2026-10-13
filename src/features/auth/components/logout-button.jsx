'use client';

import { Button } from '@/components/ui/button';
import { useLogout } from '@/features/auth/hooks/use-logout';

/** "Keluar" button: revokes the session, clears local state and returns to `/login`. */
export function LogoutButton() {
  const logoutMutation = useLogout();

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
      className="h-11 px-3 text-base font-normal text-muted-foreground hover:text-foreground sm:text-[15px]"
    >
      Keluar
    </Button>
  );
}
