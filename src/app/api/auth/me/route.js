import { handleMe } from '@/features/auth/server/handlers';

/** BFF: `GET /api/auth/me` */
export const GET = handleMe;
