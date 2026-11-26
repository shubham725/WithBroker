import type { IncomingMessage, ServerResponse } from 'http';
import {
  buildStandalonePropertyFallbackHtml,
  fetchPublicPropertyForOg,
  injectPropertyOgIntoHtml,
  readBuiltIndexHtml,
  resolveRequestOrigin,
} from '../src/lib/propertyOg';

interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  send?: (body: string | Buffer) => void;
}

function extractPropertyId(req: VercelRequest): string {
  const qId = req.query?.id;
  if (typeof qId === 'string' && qId.trim()) return qId.trim();
  if (Array.isArray(qId) && qId[0]?.trim()) return qId[0].trim();

  const rawUrl = req.url || '';
  try {
    const parsed = new URL(rawUrl, 'https://localhost');
    const paramId = parsed.searchParams.get('id');
    if (paramId?.trim()) return paramId.trim();
    const match = /^\/property\/([^/?#]+)/i.exec(parsed.pathname);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Ignore parse errors
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const propertyId = extractPropertyId(req);
  const origin = resolveRequestOrigin(req.headers);

  const property = propertyId ? await fetchPublicPropertyForOg(propertyId) : null;
  const builtHtml = readBuiltIndexHtml();

  let html: string;
  if (property && builtHtml) {
    html = injectPropertyOgIntoHtml(builtHtml, property, origin);
  } else if (property) {
    html = buildStandalonePropertyFallbackHtml(property, origin, propertyId);
  } else if (builtHtml) {
    html = builtHtml;
  } else {
    html = buildStandalonePropertyFallbackHtml(null, origin, propertyId);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.end(html);
}
