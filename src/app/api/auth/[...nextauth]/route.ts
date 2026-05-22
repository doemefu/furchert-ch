// Auth.js v5 catch-all route handler. Lives under /api, which the next-intl
// middleware matcher already excludes (no locale prefix).
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
