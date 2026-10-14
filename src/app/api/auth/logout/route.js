import { handleLogout } from '@/features/auth/server/handlers';

/** BFF: `POST /api/auth/logout` */
export const POST = handleLogout;
