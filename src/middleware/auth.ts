import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DbUser } from '../db/schema.ts';
import { getOrCreateUser, isAuthorizedAdminEmail } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: DbUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty authentication token.' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    if (decodedToken.email) {
      req.dbUser = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email,
        decodedToken.name ?? null
      );
    }
    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, () => {
    const emailVerified = req.user?.email_verified !== false;
    const isSoleAdmin =
      emailVerified &&
      isAuthorizedAdminEmail(req.user?.email) &&
      req.dbUser?.role === 'admin';

    if (!isSoleAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Admin access is restricted exclusively to the WithBroker owner account.',
      });
    }
    return next();
  });
};
