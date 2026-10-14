// Starts the mock Go backend (used by Playwright). Usage: node scripts/mock-go-server.mjs [port]
import { startGoMockServer } from '../src/mocks/go-mock-server.js';

const port = Number(process.argv[2] ?? process.env.MOCK_GO_PORT ?? 4010);
await startGoMockServer({ port });
console.warn(`[mock-go] listening on http://127.0.0.1:${port}`);
