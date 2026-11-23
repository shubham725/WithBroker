import { db } from './index.ts';
import { users } from './schema.ts';

const DEFAULT_ADMIN_EMAILS = ['yogeshbkumbhar0.2@gmail.com'];

export function getAuthorizedAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv]));
}

export function isAuthorizedAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return getAuthorizedAdminEmails().includes(email.trim().toLowerCase());
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
