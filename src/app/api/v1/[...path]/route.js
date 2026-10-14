import { createProxyHandler } from '@/server/bff/proxy-handler';
import { API_PROXY_ALLOWLIST } from '@/server/bff/proxy-allowlist';

/**
 * BFF: generic proxy `/api/v1/<path>` → Go `/api/v1/<path>` with the user's access token.
 * Only paths listed in `API_PROXY_ALLOWLIST` are forwarded.
 */
const handler = createProxyHandler({ allow: API_PROXY_ALLOWLIST });

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
