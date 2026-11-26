import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  send?: (body: string | Buffer) => void;
}

interface FirestoreRestValue {
  stringValue?: string;
  booleanValue?: boolean;
}

interface FirestoreRestDoc {
  fields?: Record<string, FirestoreRestValue>;
}

const DEFAULT_PROJECT_ID = 'arcane-fort-qvc14';
const DEFAULT_DATABASE_ID = 'ai-studio-withbroker-27c2512f-6329-4c63-a8d3-25d926a9fd8c';
const VALID_PHOTO_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

let cachedFirebaseConfig: { projectId: string; databaseId: string; apiKey: string } | null = null;

function loadFirebaseConfig(): { projectId: string; databaseId: string; apiKey: string } {
  if (cachedFirebaseConfig) return cachedFirebaseConfig;
  const candidates = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(process.cwd(), '..', 'firebase-applet-config.json'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
          projectId?: string;
          firestoreDatabaseId?: string;
          apiKey?: string;
        };
        cachedFirebaseConfig = {
          projectId: parsed.projectId || DEFAULT_PROJECT_ID,
          databaseId: parsed.firestoreDatabaseId || DEFAULT_DATABASE_ID,
          apiKey: parsed.apiKey || '',
        };
        return cachedFirebaseConfig;
      }
    } catch {
      // Fallback below
    }
  }
  cachedFirebaseConfig = {
    projectId: DEFAULT_PROJECT_ID,
    databaseId: DEFAULT_DATABASE_ID,
    apiKey: '',
  };
  return cachedFirebaseConfig;
}

function extractPhotoId(req: VercelRequest): string {
  const qId = req.query?.photoId;
  if (typeof qId === 'string' && qId.trim()) return qId.trim();
  if (Array.isArray(qId) && qId[0]?.trim()) return qId[0].trim();

  const rawUrl = req.url || '';
  try {
    const parsed = new URL(rawUrl, 'https://withbroker.vercel.app');
    const paramId = parsed.searchParams.get('photoId');
    if (paramId?.trim()) return paramId.trim();
    const match = /^\/api\/property-image\/([^/?#]+)/i.exec(parsed.pathname);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  } catch {
    // Ignore parse errors
  }
  return '';
}

async function fetchPublicPhotoBytes(
  photoId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!VALID_PHOTO_ID_RE.test(photoId)) return null;

  const cfg = loadFirebaseConfig();
  const keyParam = cfg.apiKey ? `?key=${encodeURIComponent(cfg.apiKey)}` : '';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.databaseId)}/documents/property_photos/${encodeURIComponent(photoId)}${keyParam}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const docData = (await res.json()) as FirestoreRestDoc;
    const fields = docData?.fields;
    if (!fields) return null;

    // Strictly enforce public-only photos matching firestore.rules
    if (fields.isPublic?.booleanValue !== true) {
      return null;
    }

    const dataUrl = typeof fields.dataUrl?.stringValue === 'string' ? fields.dataUrl.stringValue : '';
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
    if (!match) return null;

    const mimeType = match[1];
    if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
      return null;
    }

    return { buffer, mimeType };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const photoId = extractPhotoId(req);
    if (!photoId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Missing photo ID.' }));
      return;
    }

    const photo = await fetchPublicPhotoBytes(photoId);
    if (!photo) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Public property photo not found.' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Content-Length', String(photo.buffer.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(photo.buffer);
  } catch (err) {
    console.error('api/property-image unexpected error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Unable to load property photo.' }));
  }
}
