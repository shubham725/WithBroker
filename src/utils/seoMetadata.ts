import { WEBSITE_URL } from '../data/properties';
import type { PropertyListing } from '../types/property';
import { formatINR } from './propertyLogic';

const PHOTO_PREFIX = 'fbphoto://';
const VALID_PHOTO_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;

export interface ParsedAppRoute {
  view: 'public' | 'admin' | 'owner-form';
  propertyId: string | null;
  openPostModal: boolean;
  openPostRoommateModal?: boolean;
  openMyRoommatesModal?: boolean;
  scrollToRoommates?: boolean;
  isUnknownRoute: boolean;
  originalPath: string;
}

const KNOWN_OWNER_PATHS = new Set(['/owner-add-property', '/owner-form', '/owner']);
const KNOWN_PUBLIC_PATHS = new Set([
  '',
  '/',
  '/index.html',
  '/flats',
  '/areas',
  '/about',
  '/roommates',
  '/find-roommate',
]);

/**
 * Parses the current browser path, search query, and hash into a typed SPA route,
 * flagging unknown 404 paths so the app can redirect gracefully instead of erroring.
 */
export function parseAppRoute(
  pathname: string,
  search: string,
  hash: string
): ParsedAppRoute {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
  const lowerPath = cleanPath.toLowerCase();
  const lowerHash = (hash || '').toLowerCase();
  const params = new URLSearchParams(search || '');

  if (lowerHash === '#admin' || lowerPath === '/admin') {
    return {
      view: 'admin',
      propertyId: null,
      openPostModal: false,
      isUnknownRoute: false,
      originalPath: cleanPath,
    };
  }

  if (
    KNOWN_OWNER_PATHS.has(lowerPath) ||
    lowerHash === '#owner-add-property' ||
    lowerHash === '#owner-form' ||
    lowerHash === '#owner' ||
    params.get('mode') === 'owner'
  ) {
    return {
      view: 'owner-form',
      propertyId: null,
      openPostModal: false,
      isUnknownRoute: false,
      originalPath: cleanPath,
    };
  }

  if (lowerHash === '#add-property' || lowerPath === '/add-property') {
    return {
      view: 'public',
      propertyId: null,
      openPostModal: true,
      isUnknownRoute: false,
      originalPath: cleanPath,
    };
  }

  if (lowerHash === '#post-roommate' || lowerPath === '/post-roommate') {
    return {
      view: 'public',
      propertyId: null,
      openPostModal: false,
      openPostRoommateModal: true,
      isUnknownRoute: false,
      originalPath: cleanPath,
    };
  }

  if (lowerHash === '#my-roommates' || lowerPath === '/my-roommates') {
    return {
      view: 'public',
      propertyId: null,
      openPostModal: false,
      openMyRoommatesModal: true,
      isUnknownRoute: false,
      originalPath: cleanPath,
    };
  }

  if (
    lowerHash === '#roommates' ||
    lowerPath === '/roommates' ||
    lowerPath === '/find-roommate'
  ) {
    return {
      view: 'public',
      propertyId: null,
      openPostModal: false,
      scrollToRoommates: true,
      isUnknownRoute: false,
      originalPath: cleanPath,
    };
  }

  const propertyMatch = /^\/property\/([^/?#]+)$/i.exec(cleanPath);
  if (propertyMatch?.[1]) {
    let decodedId = propertyMatch[1];
    try {
      decodedId = decodeURIComponent(propertyMatch[1]).trim();
    } catch {
      decodedId = propertyMatch[1].trim();
    }
    return {
      view: 'public',
      propertyId: decodedId || null,
      openPostModal: false,
      isUnknownRoute: !decodedId,
      originalPath: cleanPath,
    };
  }

  const queryFlat = params.get('flat')?.trim() || null;
  if (KNOWN_PUBLIC_PATHS.has(lowerPath)) {
    return {
      view: 'public',
      propertyId: queryFlat,
      openPostModal: false,
      isUnknownRoute: false,
      originalPath: cleanPath,
    };
  }

  // Any other unmatched path is a client-side 404 that should gracefully redirect to home
  return {
    view: 'public',
    propertyId: queryFlat,
    openPostModal: false,
    isUnknownRoute: true,
    originalPath: cleanPath,
  };
}

export interface PageMetaPayload {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogUrl: string;
  ogType: string;
  canonicalUrl: string;
  jsonLd: Record<string, unknown>;
}

export function resolveClientAbsoluteImageUrl(firstImage: string | undefined, origin: string): string {
  const cleanOrigin = (origin || WEBSITE_URL).replace(/\/+$/, '');
  const raw = (firstImage || '').trim();
  if (!raw) {
    return `${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`;
  }
  if (raw.startsWith(PHOTO_PREFIX)) {
    const photoId = raw.slice(PHOTO_PREFIX.length).trim();
    if (VALID_PHOTO_ID_RE.test(photoId)) {
      return `${cleanOrigin}/api/property-image/${encodeURIComponent(photoId)}`;
    }
    return `${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`;
  }
  if (raw.startsWith('https://') || raw.startsWith('http://')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `${cleanOrigin}${raw}`;
  }
  return `${cleanOrigin}/${raw}`;
}

export function buildClientPageMetadata(
  property: PropertyListing | null,
  view: 'public' | 'admin' | 'owner-form',
  origin: string
): PageMetaPayload {
  const cleanOrigin = (origin || WEBSITE_URL).replace(/\/+$/, '');

  if (property) {
    const rentFormatted = formatINR(property.monthlyRent);
    const locationDisplay = property.locality.toLowerCase().includes('pune')
      ? property.locality
      : `${property.locality}, Pune`;
    const statusPrefix = property.availabilityLabel === 'Rented Out' ? '[Rented Out] ' : '';
    const title = `${statusPrefix}${property.title} – ${rentFormatted}/month | WithBroker`;
    const snippet = (property.shortDescription || property.fullDescription || '').trim();
    const shortSnippet = snippet.length > 130 ? `${snippet.slice(0, 127).trim()}...` : snippet;
    const description = [
      `Rent: ${rentFormatted}/month`,
      `Location: ${locationDisplay}`,
      shortSnippet || `${property.furnishing} ${property.propertyType} listed on WithBroker.`,
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 240);

    const propertyCode = property.propertyCode || property.id;
    const canonicalUrl = `${cleanOrigin}/property/${encodeURIComponent(propertyCode)}`;
    const ogImage = resolveClientAbsoluteImageUrl(property.images[0], cleanOrigin);

    return {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogImage,
      ogImageAlt: property.title,
      ogUrl: canonicalUrl,
      ogType: 'website',
      canonicalUrl,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Apartment',
        name: property.title,
        description,
        image: ogImage,
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
            property.availabilityLabel === 'Rented Out'
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
        },
      },
    };
  }

  if (view === 'owner-form') {
    const title = 'Add Your Rental Property Free | WithBroker Pune';
    const description =
      'Flat owners in Pune can submit their 1RK, 1BHK, 2BHK, or 3BHK rental property for free on WithBroker — fast submission with no login required.';
    const url = `${cleanOrigin}/owner-add-property`;
    const ogImage = `${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`;
    return {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogImage,
      ogImageAlt: 'List your rental flat free on WithBroker Pune',
      ogUrl: url,
      ogType: 'website',
      canonicalUrl: url,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url,
      },
    };
  }

  const defaultTitle =
    'WithBroker — Rental Apartments in Viman Nagar, Wadgaon Sheri & Somnath Nagar, Pune';
  const defaultDesc =
    'Find 1RK, 1BHK, 2BHK and 3BHK rental flats in Viman Nagar, Wadgaon Sheri, Somnath Nagar and nearby Pune areas with transparent rent, deposit, brokerage details, and direct WhatsApp contact.';
  const defaultUrl = `${cleanOrigin}/`;
  const defaultImage = `${cleanOrigin}/assets/properties/flat-1/photo-1.jpeg`;

  return {
    title: view === 'admin' ? 'Admin Console | WithBroker' : defaultTitle,
    description: defaultDesc,
    ogTitle: 'WithBroker — Rental Apartments in Pune',
    ogDescription:
      'Explore available 1RK, 1BHK and 2BHK apartments in Viman Nagar, Wadgaon Sheri, Somnath Nagar and nearby Pune locations.',
    ogImage: defaultImage,
    ogImageAlt: 'WithBroker — Verified Rental Apartments in Pune',
    ogUrl: defaultUrl,
    ogType: 'website',
    canonicalUrl: defaultUrl,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'WithBroker',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'All',
      url: defaultUrl,
      description: defaultDesc,
      image: defaultImage,
    },
  };
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(jsonLd: Record<string, unknown>): void {
  if (typeof document === 'undefined') return;
  let script = document.head.querySelector<HTMLScriptElement>(
    'script#withbroker-dynamic-jsonld, script[type="application/ld+json"]'
  );
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'withbroker-dynamic-jsonld';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(jsonLd);
}

/**
 * Synchronizes document.title, OpenGraph tags, Twitter Card tags, canonical link,
 * and Schema.org JSON-LD in the browser <head> for the currently viewed property or page.
 */
export function applyClientDocumentMetadata(
  property: PropertyListing | null,
  view: 'public' | 'admin' | 'owner-form'
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const origin =
    window.location.origin && window.location.origin.startsWith('http')
      ? window.location.origin
      : WEBSITE_URL;

  const meta = buildClientPageMetadata(property, view, origin);

  document.title = meta.title;
  upsertCanonicalLink(meta.canonicalUrl);
  upsertMetaTag('name', 'description', meta.description);

  upsertMetaTag('property', 'og:site_name', 'WithBroker');
  upsertMetaTag('property', 'og:type', meta.ogType);
  upsertMetaTag('property', 'og:url', meta.ogUrl);
  upsertMetaTag('property', 'og:title', meta.ogTitle);
  upsertMetaTag('property', 'og:description', meta.ogDescription);
  upsertMetaTag('property', 'og:image', meta.ogImage);
  upsertMetaTag('property', 'og:image:secure_url', meta.ogImage);
  upsertMetaTag('property', 'og:image:alt', meta.ogImageAlt);

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', meta.ogTitle);
  upsertMetaTag('name', 'twitter:description', meta.ogDescription);
  upsertMetaTag('name', 'twitter:image', meta.ogImage);

  upsertJsonLd(meta.jsonLd);
}
