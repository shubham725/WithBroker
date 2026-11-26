import fs from 'fs';
import path from 'path';
import firebaseConfig from '../../firebase-applet-config.json';
import { SAMPLE_PROPERTIES } from '../data/properties';

const PHOTO_PREFIX = 'fbphoto://';
const VALID_ID_RE = /^[A-Za-z0-9_-]{3,48}$/;
const VALID_PHOTO_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface OgPropertyData {
  propertyCode: string;
  title: string;
  propertyType: string;
  locality: string;
  subLocality: string;
  monthlyRent: number;
  furnishing: string;
  availabilityLabel: string;
  workflowStatus: string;
  shortDescription: string;
  fullDescription: string;
  firstImage: string;
  updatedAtVersion: string;
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
  name?: string;
  fields?: Record<string, FirestoreRestValue>;
  updateTime?: string;
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

function getBoolean(fields: Record<string, FirestoreRestValue>, key: string): boolean {
  return fields[key]?.booleanValue === true;
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

function buildFirestoreDocUrl(collectionName: string, docId: string): string {
  const projectId = encodeURIComponent(firebaseConfig.projectId);
  const databaseId = encodeURIComponent(firebaseConfig.firestoreDatabaseId || '(default)');
  const apiKey = encodeURIComponent(firebaseConfig.apiKey);
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}`;
}

async function fetchFirestoreDocument(
  collectionName: string,
  docId: string
): Promise<FirestoreRestDoc | null> {
  const url = buildFirestoreDocUrl(collectionName, docId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as FirestoreRestDoc;
    return data?.fields ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mapFirestoreDocToOg(docId: string, docData: FirestoreRestDoc): OgPropertyData | null {
  const fields = docData.fields || {};
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
    availabilityLabel:
      getString(fields, 'availabilityLabel') ||
      (workflowStatus === 'Rented' ? 'Rented Out' : 'Available'),
    workflowStatus,
    shortDescription: getString(fields, 'shortDescription'),
    fullDescription: getString(fields, 'fullDescription'),
    firstImage: images[0] || '',
    updatedAtVersion: getTimestampVersion(fields, docData.updateTime),
  };
}

function findSampleFallback(rawId: string): OgPropertyData | null {
  const lower = rawId.toLowerCase();
  const matched = SAMPLE_PROPERTIES.find(
    (p) =>
      p.listingStatus === 'active' &&
      (p.propertyCode.toLowerCase() === lower || p.id.toLowerCase() === lower)
  );
  if (!matched) return null;
  const workflowStatus = matched.availabilityLabel === 'Rented Out' ? 'Rented' : 'Available';
  return {
    propertyCode: matched.propertyCode,
    title: matched.title,
    propertyType: matched.propertyType,
    locality: matched.locality,
    subLocality: matched.subLocality,
    monthlyRent: matched.monthlyRent,
    furnishing: matched.furnishing,
    availabilityLabel: matched.availabilityLabel,
    workflowStatus,
    shortDescription: matched.shortDescription,
    fullDescription: matched.fullDescription,
    firstImage: matched.images[0] || '',
    updatedAtVersion: '',
  };
}

/**
 * Fetches an approved public property strictly from `/public_properties` (zero PII, zero Pending/Rejected).
 * Falls back to the 9 baseline verified Pune properties before first admin seeding.
 */
export async function fetchPublicPropertyForOg(rawId: string): Promise<OgPropertyData | null> {
  const trimmed = String(rawId || '').trim();
  if (!VALID_ID_RE.test(trimmed)) {
    return null;
  }

  // 1. Direct lookup in Firestore `/public_properties/{id}`
  const directDoc = await fetchFirestoreDocument('public_properties', trimmed);
  if (directDoc) {
    const mapped = mapFirestoreDocToOg(trimmed, directDoc);
    if (mapped) return mapped;
  }

  // 2. If user shared a legacy slug like `wb-flat-1`, map to its propertyCode (`WB-1001`) and check Firestore first
  const sampleMatch = findSampleFallback(trimmed);
  if (sampleMatch) {
    if (sampleMatch.propertyCode !== trimmed) {
      const codeDoc = await fetchFirestoreDocument('public_properties', sampleMatch.propertyCode);
      if (codeDoc) {
        const mapped = mapFirestoreDocToOg(sampleMatch.propertyCode, codeDoc);
        if (mapped) return mapped;
      }
    }
    return sampleMatch;
  }

  return null;
}

/**
 * Fetches raw image bytes for a public approved photo (`isPublic === true`) stored in Firestore `/property_photos`.
 */
export async function fetchPublicPhotoBytes(
  rawPhotoId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const photoId = String(rawPhotoId || '').trim();
  if (!VALID_PHOTO_ID_RE.test(photoId)) {
    return null;
  }

  const docData = await fetchFirestoreDocument('property_photos', photoId);
  if (!docData?.fields) return null;

  // Enforce public-only access strictly matching firestore.rules
  if (!getBoolean(docData.fields, 'isPublic')) {
    return null;
  }

  const dataUrl = getString(docData.fields, 'dataUrl');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return null;

  const mimeType = match[1];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
    return null;
  }

  return { buffer, mimeType };
}

/**
 * Safely determines the public origin (`https://domain.com`) from incoming request headers
 * with strict hostname validation to avoid host-header injection.
 */
export function resolveRequestOrigin(
  headers: Record<string, string | string[] | undefined>,
  fallbackOrigin = 'https://withbroker.vercel.app'
): string {
  const rawHost =
    (Array.isArray(headers['x-forwarded-host'])
      ? headers['x-forwarded-host'][0]
      : headers['x-forwarded-host']) ||
    (Array.isArray(headers.host) ? headers.host[0] : headers.host) ||
    '';

  const cleanHost = rawHost.split(',')[0].trim();
  if (!cleanHost || !/^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(cleanHost)) {
    return fallbackOrigin.replace(/\/+$/, '');
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

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInrPlain(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function resolveAbsoluteShareImageUrl(
  firstImage: string,
  origin: string,
  version = ''
): string {
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

export function buildPropertyOgMetadata(property: OgPropertyData, origin: string) {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const rentFormatted = formatInrPlain(property.monthlyRent);
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
    titleTag: ogTitle,
    ogTitle,
    ogDescription,
    ogImage: imageUrl,
    ogUrl: canonicalUrl,
    jsonLdString: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  };
}

/**
 * Injects dynamic property Open Graph, Twitter Card, Canonical URL, and Schema.org JSON-LD tags
 * directly into the initial HTML `<head>` so WhatsApp, Facebook, Telegram, and X crawlers
 * read the exact flat's photo, title, rent, and location without executing JavaScript.
 */
export function injectPropertyOgIntoHtml(
  baseHtml: string,
  property: OgPropertyData,
  origin: string
): string {
  const meta = buildPropertyOgMetadata(property, origin);

  const ogBlock = [
    `<title>${escapeHtmlAttr(meta.titleTag)}</title>`,
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

  // Remove static default title/meta tags before injecting property-specific tags
  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n    ${ogBlock}`);
  } else {
    html = `${ogBlock}\n${html}`;
  }

  return html;
}

/**
 * Fallback HTML when `dist/index.html` cannot be read from disk in a serverless runtime:
 * serves complete Open Graph metadata to crawlers and immediately routes human visitors into the app.
 */
export function buildStandalonePropertyFallbackHtml(
  property: OgPropertyData | null,
  origin: string,
  propertyId: string
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const safeId = encodeURIComponent(propertyId);
  const redirectTarget = `${cleanOrigin}/?flat=${safeId}#flats`;

  if (!property) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WithBroker — Rental Apartments in Pune</title>
    <meta name="description" content="Explore verified 1RK, 1BHK, 2BHK and 3BHK rental flats in Pune on WithBroker." />
    <meta property="og:site_name" content="WithBroker" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="WithBroker — Rental Apartments in Pune" />
    <meta property="og:description" content="Explore verified 1RK, 1BHK, 2BHK and 3BHK rental flats in Pune on WithBroker." />
    <meta property="og:image" content="${escapeHtmlAttr(`${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`)}" />
    <meta property="og:url" content="${escapeHtmlAttr(cleanOrigin)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta http-equiv="refresh" content="0;url=${escapeHtmlAttr(cleanOrigin)}" />
  </head>
  <body>
    <script>window.location.replace(${JSON.stringify(cleanOrigin)});</script>
  </body>
</html>`;
  }

  const meta = buildPropertyOgMetadata(property, cleanOrigin);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtmlAttr(meta.titleTag)}</title>
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

/**
 * Reads the built SPA `dist/index.html` safely when available on disk.
 */
export function readBuiltIndexHtml(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'dist', 'index.html'),
    path.resolve(process.cwd(), 'index.html'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, 'utf8');
        if (content.includes('<div id="root">')) {
          return content;
        }
      }
    } catch {
      // Try next path
    }
  }
  return null;
}
