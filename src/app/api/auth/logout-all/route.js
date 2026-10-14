import { handleLogoutAll } from '@/features/auth/server/handlers';

/** BFF: `POST /api/auth/logout-all` */
export const POST = handleLogoutAll;
