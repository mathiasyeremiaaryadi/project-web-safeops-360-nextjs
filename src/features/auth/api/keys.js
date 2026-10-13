/** Query key factory for the auth feature. */
export const authKeys = Object.freeze({
  all: /** @type {const} */ (['auth']),
  me: () => /** @type {const} */ ([...authKeys.all, 'me']),
});
