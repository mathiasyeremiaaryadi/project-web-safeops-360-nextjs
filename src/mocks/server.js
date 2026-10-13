import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

/** MSW server for Vitest. */
export const server = setupServer(...handlers);
