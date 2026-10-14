import { USER_STATUS } from '@/features/users/constants';

/**
 * Single status shown for a user, from the most to the least blocking condition.
 * @param {{ is_active: boolean, locked_until?: string | null, must_change_password: boolean }} user
 * @param {Date} [now]
 * @returns {keyof typeof USER_STATUS}
 */
export function getUserStatus(user, now = new Date()) {
  if (!user.is_active) return USER_STATUS.INACTIVE;
  if (user.locked_until && new Date(user.locked_until).getTime() > now.getTime()) {
    return USER_STATUS.LOCKED;
  }
  if (user.must_change_password) return USER_STATUS.MUST_CHANGE_PASSWORD;
  return USER_STATUS.ACTIVE;
}
