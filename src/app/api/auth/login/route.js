import { handleLogin } from '@/features/auth/server/handlers';

/** BFF: `POST /api/auth/login` */
export const POST = handleLogin;
