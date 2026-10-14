import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/errors';

/**
 * Shows the user-facing message of a failed request as an error toast. Use it as `onError` of a
 * mutation: `mutate(input, { onError: toastApiError })`.
 * @param {unknown} error
 */
export const toastApiError = (error) => toast.error(getErrorMessage(error));
