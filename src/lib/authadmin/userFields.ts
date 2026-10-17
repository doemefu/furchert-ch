// User role/status values shared by the server-only REST client and the
// client-side form validation (`forms.ts`). Kept apart from `client.ts`,
// which is `server-only` (#80), so client components can import them.
export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export const USER_ROLES: readonly UserRole[] = ['USER', 'ADMIN'];
export const USER_STATUSES: readonly UserStatus[] = ['ACTIVE', 'INACTIVE'];
