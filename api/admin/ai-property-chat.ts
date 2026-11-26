import type { IncomingMessage, ServerResponse } from 'http';
import {
  runAdminPropertyAssistant,
  verifySoleAdminFirebaseToken,
} from '../../src/lib/adminAiPropertyChat';

type VercelReq = IncomingMessage & {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type VercelRes = ServerResponse & {
  status: (code: number) => VercelRes;
  json: (payload: unknown) => void;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rawAuth = req.headers.authorization;
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;

  const authCheck = await verifySoleAdminFirebaseToken(authHeader);
  if (authCheck.ok === false) {
    res.status(authCheck.status).json({ error: authCheck.error });
    return;
  }

  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
  }

  const result = await runAdminPropertyAssistant(parsedBody);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(result.data);
}
