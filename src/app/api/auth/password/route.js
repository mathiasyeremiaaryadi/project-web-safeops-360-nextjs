import { handleChangePassword } from '@/features/auth/server/handlers';

/** BFF: `PUT /api/auth/password` */
export const PUT = handleChangePassword;
