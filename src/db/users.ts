import { db } from './index.ts';
import { users } from './schema.ts';

export const SOLE_ADMIN_EMAIL = 'yogeshbkumbhar0.2@gmail.com';

export function isAuthorizedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SOLE_ADMIN_EMAIL;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
) {
  const normalizedEmail = email.trim().toLowerCase();
  const role = isAuthorizedAdminEmail(normalizedEmail) ? 'admin' : 'user';

  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        displayName: displayName ?? null,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          displayName: displayName ?? null,
          role,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user synchronization failed:', error);
    throw new Error('Unable to verify user account right now.', { cause: error });
  }
}
