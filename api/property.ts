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
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreRestValue[] };
}

interface FirestoreRestDoc {
  fields?: Record<string, FirestoreRestValue>;
  updateTime?: string;
}

interface OgPropertyData {
  propertyCode: string;
  title: string;
  propertyType: string;
  locality: string;
  subLocality: string;
  monthlyRent: number;
  furnishing: string;
  workflowStatus: string;
  shortDescription: string;
  fullDescription: string;
  firstImage: string;
  updatedAtVersion: string;
}

const DEFAULT_ORIGIN = 'https://withbroker.vercel.app';
const DEFAULT_PROJECT_ID = 'arcane-fort-qvc14';
const DEFAULT_DATABASE_ID = 'ai-studio-withbroker-27c2512f-6329-4c63-a8d3-25d926a9fd8c';
const PHOTO_PREFIX = 'fbphoto://';
const VALID_ID_RE = /^[A-Za-z0-9_-]{3,48}$/;
const VALID_PHOTO_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;

const LEGACY_SLUG_TO_CODE: Record<string, string> = {
  'wb-flat-1': 'WB-1001',
  'wb-flat-2': 'WB-1002',
  'wb-flat-3': 'WB-1003',
  'wb-flat-4': 'WB-1004',
  'wb-flat-5': 'WB-1005',
  'wb-flat-6': 'WB-1006',
  'wb-flat-7': 'WB-1007',
  'wb-flat-8': 'WB-1008',
  'wb-flat-9': 'WB-1009',
};

let cachedBuiltHtml: string | null = null;
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

function getString(fields: Record<string, FirestoreRestValue>, key: string): string {
  return typeof fields[key]?.stringValue === 'string' ? fields[key].stringValue! : '';
}

function getNumber(fields: Record<string, FirestoreRestValue>, key: string): number {
  const f = fields[key];
  if (!f) return 0;
  if (typeof f.doubleValue === 'number') return f.doubleValue;
  if (typeof f.integerValue === 'string') return Number(f.integerValue) || 0;
  return 0;
}

function getStringArray(fields: Record<string, FirestoreRestValue>, key: string): string[] {
  const values = fields[key]?.arrayValue?.values;
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => (typeof v?.stringValue === 'string' ? v.stringValue : ''))
    .filter(Boolean);
}

function getTimestampVersion(
  fields: Record<string, FirestoreRestValue>,
  fallbackIso?: string
): string {
  const raw = fields.updatedAt?.timestampValue || fallbackIso || '';
  if (!raw) return '';
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? String(Math.floor(ts / 1000)) : '';
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveRequestOrigin(
  headers: Record<string, string | string[] | undefined>
): string {
  const rawHost =
    (Array.isArray(headers['x-forwarded-host'])
      ? headers['x-forwarded-host'][0]
      : headers['x-forwarded-host']) ||
    (Array.isArray(headers.host) ? headers.host[0] : headers.host) ||
    '';

  const cleanHost = rawHost.split(',')[0].trim();
  if (!cleanHost || !/^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(cleanHost)) {
    return DEFAULT_ORIGIN;
  }

  const rawProto = Array.isArray(headers['x-forwarded-proto'])
    ? headers['x-forwarded-proto'][0]
    : headers['x-forwarded-proto'];
  const protoCandidate = (rawProto || '').split(',')[0].trim().toLowerCase();
  const isLocal =
    cleanHost.startsWith('localhost') ||
    cleanHost.startsWith('127.0.0.1') ||
    cleanHost.startsWith('0.0.0.0');

  const proto =
    protoCandidate === 'http' || protoCandidate === 'https'
      ? protoCandidate
      : isLocal
        ? 'http'
        : 'https';

  return `${proto}://${cleanHost}`;
}

function extractPropertyId(req: VercelRequest): string {
  const qId = req.query?.id;
  if (typeof qId === 'string' && qId.trim()) return qId.trim();
  if (Array.isArray(qId) && qId[0]?.trim()) return qId[0].trim();

  const rawUrl = req.url || '';
  try {
    const parsed = new URL(rawUrl, DEFAULT_ORIGIN);
    const paramId = parsed.searchParams.get('id');
    if (paramId?.trim()) return paramId.trim();
    const match = /^\/property\/([^/?#]+)/i.exec(parsed.pathname);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  } catch {
    // Ignore parse errors
  }
  return '';
}

async function fetchPublicProperty(rawId: string): Promise<OgPropertyData | null> {
  const trimmed = String(rawId || '').trim();
  if (!VALID_ID_RE.test(trimmed)) return null;

  const docId = LEGACY_SLUG_TO_CODE[trimmed.toLowerCase()] || trimmed;
  const cfg = loadFirebaseConfig();
  const keyParam = cfg.apiKey ? `?key=${encodeURIComponent(cfg.apiKey)}` : '';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.databaseId)}/documents/public_properties/${encodeURIComponent(docId)}${keyParam}`;

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

    const workflowStatus = getString(fields, 'workflowStatus') || 'Available';
    if (workflowStatus !== 'Available' && workflowStatus !== 'Rented') {
      return null;
    }

    const images = getStringArray(fields, 'images');
    const locality = getString(fields, 'locality') || 'Pune';
    const subLocality = getString(fields, 'subLocality') || locality;

    return {
      propertyCode: getString(fields, 'propertyCode') || docId,
      title: getString(fields, 'title') || 'Rental Flat in Pune',
      propertyType: getString(fields, 'propertyType') || 'Flat',
      locality,
      subLocality,
      monthlyRent: Math.round(getNumber(fields, 'monthlyRent')),
      furnishing: getString(fields, 'furnishing') || 'Unfurnished',
      workflowStatus,
      shortDescription: getString(fields, 'shortDescription'),
      fullDescription: getString(fields, 'fullDescription'),
      firstImage: images[0] || '',
      updatedAtVersion: getTimestampVersion(fields, docData.updateTime),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveAbsoluteShareImageUrl(firstImage: string, origin: string, version = ''): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const vQuery = version ? `?v=${encodeURIComponent(version)}` : '';

  if (!firstImage) {
    return `${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`;
  }
  if (firstImage.startsWith(PHOTO_PREFIX)) {
    const photoId = firstImage.slice(PHOTO_PREFIX.length).trim();
    if (VALID_PHOTO_ID_RE.test(photoId)) {
      return `${cleanOrigin}/api/property-image/${encodeURIComponent(photoId)}${vQuery}`;
    }
    return `${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`;
  }
  if (firstImage.startsWith('https://')) {
    return firstImage;
  }
  if (firstImage.startsWith('/')) {
    return `${cleanOrigin}${firstImage}${vQuery}`;
  }
  return `${cleanOrigin}/${firstImage}${vQuery}`;
}

function buildOgMeta(property: OgPropertyData, origin: string) {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const rentFormatted = `₹${Math.round(property.monthlyRent).toLocaleString('en-IN')}`;
  const locationDisplay = property.locality.toLowerCase().includes('pune')
    ? property.locality
    : `${property.locality}, Pune`;

  const statusPrefix = property.workflowStatus === 'Rented' ? '[Rented Out] ' : '';
  const ogTitle = `${statusPrefix}${property.title} – ${rentFormatted}/month | WithBroker`;

  const snippetSource = (property.shortDescription || property.fullDescription || '').trim();
  const shortSummary =
    snippetSource.length > 130 ? `${snippetSource.slice(0, 127).trim()}...` : snippetSource;

  const ogDescription = [
    `Rent: ${rentFormatted}/month`,
    `Location: ${locationDisplay}`,
    shortSummary || `${property.furnishing} ${property.propertyType} listed on WithBroker.`,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 240);

  const canonicalUrl = `${cleanOrigin}/property/${encodeURIComponent(property.propertyCode)}`;
  const imageUrl = resolveAbsoluteShareImageUrl(
    property.firstImage,
    cleanOrigin,
    property.updatedAtVersion
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: property.title,
    description: ogDescription,
    image: imageUrl,
    url: canonicalUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.locality,
      addressLocality: 'Pune',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
    offers: {
      '@type': 'Offer',
      price: String(property.monthlyRent),
      priceCurrency: 'INR',
      availability:
        property.workflowStatus === 'Rented'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
    },
  };

  return {
    ogTitle,
    ogDescription,
    ogImage: imageUrl,
    ogUrl: canonicalUrl,
    jsonLdString: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  };
}

function injectPropertyOgIntoHtml(baseHtml: string, property: OgPropertyData, origin: string): string {
  const meta = buildOgMeta(property, origin);
  const headTags = [
    `<title>${escapeHtmlAttr(meta.ogTitle)}</title>`,
    `<meta name="description" content="${escapeHtmlAttr(meta.ogDescription)}" />`,
    `<link rel="canonical" href="${escapeHtmlAttr(meta.ogUrl)}" />`,
    `<meta property="og:site_name" content="WithBroker" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtmlAttr(meta.ogUrl)}" />`,
    `<meta property="og:title" content="${escapeHtmlAttr(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttr(meta.ogDescription)}" />`,
    `<meta property="og:image" content="${escapeHtmlAttr(meta.ogImage)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtmlAttr(meta.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtmlAttr(property.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtmlAttr(meta.ogTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttr(meta.ogDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtmlAttr(meta.ogImage)}" />`,
    `<script type="application/ld+json">${meta.jsonLdString}</script>`,
  ].join('\n    ');

  let cleaned = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*name=["']twitter:[^"']+["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  if (/<head[^>]*>/i.test(cleaned)) {
    cleaned = cleaned.replace(/<head[^>]*>/i, (match) => `${match}\n    ${headTags}`);
  }
  return cleaned;
}

function buildStandaloneFallbackHtml(
  property: OgPropertyData | null,
  origin: string,
  requestedId: string
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const redirectTarget = requestedId
    ? `${cleanOrigin}/?flat=${encodeURIComponent(requestedId)}#flats`
    : cleanOrigin;

  if (!property) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WithBroker — Rental Apartments in Pune</title>
    <meta property="og:site_name" content="WithBroker" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="WithBroker — Rental Apartments in Pune" />
    <meta property="og:description" content="Explore verified 1RK, 1BHK, 2BHK and 3BHK rental flats in Pune on WithBroker." />
    <meta property="og:image" content="${escapeHtmlAttr(`${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`)}" />
    <meta property="og:url" content="${escapeHtmlAttr(cleanOrigin)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta http-equiv="refresh" content="0;url=${escapeHtmlAttr(redirectTarget)}" />
  </head>
  <body>
    <script>window.location.replace(${JSON.stringify(redirectTarget)});</script>
  </body>
</html>`;
  }

  const meta = buildOgMeta(property, cleanOrigin);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtmlAttr(meta.ogTitle)}</title>
    <meta name="description" content="${escapeHtmlAttr(meta.ogDescription)}" />
    <link rel="canonical" href="${escapeHtmlAttr(meta.ogUrl)}" />
    <meta property="og:site_name" content="WithBroker" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtmlAttr(meta.ogUrl)}" />
    <meta property="og:title" content="${escapeHtmlAttr(meta.ogTitle)}" />
    <meta property="og:description" content="${escapeHtmlAttr(meta.ogDescription)}" />
    <meta property="og:image" content="${escapeHtmlAttr(meta.ogImage)}" />
    <meta property="og:image:secure_url" content="${escapeHtmlAttr(meta.ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtmlAttr(property.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtmlAttr(meta.ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtmlAttr(meta.ogDescription)}" />
    <meta name="twitter:image" content="${escapeHtmlAttr(meta.ogImage)}" />
    <script type="application/ld+json">${meta.jsonLdString}</script>
    <meta http-equiv="refresh" content="0;url=${escapeHtmlAttr(redirectTarget)}" />
  </head>
  <body style="font-family:system-ui,sans-serif;padding:24px;color:#090A14;">
    <p>Opening <strong>${escapeHtmlAttr(property.title)}</strong> on WithBroker…</p>
    <p><a href="${escapeHtmlAttr(redirectTarget)}">Click here if not redirected automatically</a></p>
    <script>window.location.replace(${JSON.stringify(redirectTarget)});</script>
  </body>
</html>`;
}

async function getProductionSpaHtml(origin: string): Promise<string | null> {
  if (cachedBuiltHtml) return cachedBuiltHtml;

  // 1. Prefer bundled production dist/index.html (never dev index.html with /src/main.tsx)
  const diskCandidates = [
    path.resolve(process.cwd(), 'dist', 'index.html'),
    path.resolve(process.cwd(), '..', 'dist', 'index.html'),
  ];
  for (const candidate of diskCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, 'utf8');
        if (content.includes('<div id="root">') && !content.includes('/src/main.tsx')) {
          cachedBuiltHtml = content;
          return content;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  // 2. Fallback: fetch the live deployed static index.html from the same verified Vercel origin
  const cleanOrigin = origin.replace(/\/+$/, '');
  if (cleanOrigin.startsWith('https://')) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`${cleanOrigin}/index.html`, {
        method: 'GET',
        headers: { Accept: 'text/html' },
        signal: controller.signal,
      });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('<div id="root">') && !text.includes('/src/main.tsx')) {
          cachedBuiltHtml = text;
          return text;
        }
      }
    } catch {
      // Fall through to standalone OG HTML + redirect
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const propertyId = extractPropertyId(req);
    const origin = resolveRequestOrigin(req.headers);

    const [property, builtHtml] = await Promise.all([
      propertyId ? fetchPublicProperty(propertyId) : Promise.resolve(null),
      getProductionSpaHtml(origin),
    ]);

    let html: string;
    if (property && builtHtml) {
      html = injectPropertyOgIntoHtml(builtHtml, property, origin);
    } else if (property) {
      html = buildStandaloneFallbackHtml(property, origin, propertyId);
    } else if (builtHtml) {
      html = builtHtml;
    } else {
      html = buildStandaloneFallbackHtml(null, origin, propertyId);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    res.end(html);
  } catch (err) {
    console.error('api/property unexpected error:', err);
    const fallbackUrl = DEFAULT_ORIGIN;
    res.statusCode = 302;
    res.setHeader('Location', fallbackUrl);
    res.end();
  }
}
