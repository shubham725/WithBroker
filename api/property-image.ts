import type { IncomingMessage, ServerResponse } from 'http';
import { fetchPublicPhotoBytes } from '../src/lib/propertyOg';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  send?: (body: string | Buffer) => void;
}

function extractPhotoId(req: VercelRequest): string {
  const qId = req.query?.photoId;
  if (typeof qId === 'string' && qId.trim()) return qId.trim();
  if (Array.isArray(qId) && qId[0]?.trim()) return qId[0].trim();

  const rawUrl = req.url || '';
  try {
    const parsed = new URL(rawUrl, 'https://localhost');
    const paramId = parsed.searchParams.get('photoId');
    if (paramId?.trim()) return paramId.trim();
    const match = /^\/api\/property-image\/([^/?#]+)/i.exec(parsed.pathname);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Ignore parse errors
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
}
