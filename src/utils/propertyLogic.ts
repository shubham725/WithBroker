import {
  LOCALITIES,
  WEBSITE_URL,
  WHATSAPP_COMMUNITY_NAME,
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_NUMBER_DIGITS,
  WHATSAPP_NUMBER_DISPLAY,
} from '../data/properties';
import {
  LocalityConfig,
  PropertyListing,
  PropertySubmissionInput,
  SearchFiltersState,
  SubmissionValidationErrors,
} from '../types/property';

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDepositLabel(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) {
    return 'On Inquiry';
  }
  return formatINR(amount);
}

export function isPropertyRentedOut(property: PropertyListing): boolean {
  return (
    property.availabilityLabel === 'Rented Out' ||
    property.listingStatus === 'rented' ||
    property.workflowStatus === 'Rented'
  );
}

export function getActiveListings(properties: PropertyListing[]): PropertyListing[] {
  return properties.filter((item) => item.listingStatus === 'active');
}

const PUNE_AREA_DIRECTORY: Record<
  string,
  { slug: string; label: string; lat: number; lng: number }
> = {
  // Major Pune neighborhoods (checked in order; more specific multi-word pockets listed before broader ones where distinct)
  'somnath nagar': { slug: 'somnath-nagar', label: 'Somnath Nagar', lat: 18.5565, lng: 73.9306 },
  'viman nagar': { slug: 'viman-nagar', label: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
  'wadgaon sheri': { slug: 'wadgaon-sheri', label: 'Wadgaon Sheri', lat: 18.5529, lng: 73.9277 },
  'kharadi': { slug: 'kharadi', label: 'Kharadi', lat: 18.5515, lng: 73.9475 },
  'chandan nagar': { slug: 'chandan-nagar', label: 'Chandan Nagar', lat: 18.5612, lng: 73.9372 },
  'kalyani nagar': { slug: 'kalyani-nagar', label: 'Kalyani Nagar', lat: 18.5463, lng: 73.9033 },
  'koregaon park': { slug: 'koregaon-park', label: 'Koregaon Park', lat: 18.5362, lng: 73.8939 },
  'keshav nagar': { slug: 'keshav-nagar', label: 'Keshav Nagar', lat: 18.5337, lng: 73.9521 },
  'mundhwa': { slug: 'mundhwa', label: 'Mundhwa', lat: 18.5318, lng: 73.9283 },
  'magarpatta': { slug: 'magarpatta', label: 'Magarpatta', lat: 18.5158, lng: 73.9272 },
  'hadapsar': { slug: 'hadapsar', label: 'Hadapsar', lat: 18.5089, lng: 73.9259 },
  'manjri': { slug: 'manjri', label: 'Manjri', lat: 18.5186, lng: 73.9721 },
  'phursungi': { slug: 'phursungi', label: 'Phursungi', lat: 18.4744, lng: 73.9748 },
  'fursungi': { slug: 'phursungi', label: 'Phursungi', lat: 18.4744, lng: 73.9748 },
  'wanowrie': { slug: 'wanowrie', label: 'Wanowrie', lat: 18.4976, lng: 73.9036 },
  'wanawadi': { slug: 'wanowrie', label: 'Wanowrie', lat: 18.4976, lng: 73.9036 },
  'wagholi': { slug: 'wagholi', label: 'Wagholi', lat: 18.5808, lng: 73.9787 },
  'dhanori': { slug: 'dhanori', label: 'Dhanori', lat: 18.5976, lng: 73.9025 },
  'lohegaon': { slug: 'lohegaon', label: 'Lohegaon', lat: 18.596, lng: 73.9277 },
  'vishrantwadi': { slug: 'vishrantwadi', label: 'Vishrantwadi', lat: 18.5754, lng: 73.8781 },
  'tingre nagar': { slug: 'tingre-nagar', label: 'Tingre Nagar', lat: 18.5792, lng: 73.8907 },
  'yerwada': { slug: 'yerwada', label: 'Yerwada', lat: 18.5529, lng: 73.8797 },
  'baner': { slug: 'baner', label: 'Baner', lat: 18.559, lng: 73.7868 },
  'balewadi': { slug: 'balewadi', label: 'Balewadi', lat: 18.576, lng: 73.7798 },
  'wakad': { slug: 'wakad', label: 'Wakad', lat: 18.5975, lng: 73.764 },
  'hinjewadi': { slug: 'hinjewadi', label: 'Hinjewadi', lat: 18.5913, lng: 73.7389 },
  'aundh': { slug: 'aundh', label: 'Aundh', lat: 18.558, lng: 73.8075 },
  'pashan': { slug: 'pashan', label: 'Pashan', lat: 18.5362, lng: 73.7924 },
  'bavdhan': { slug: 'bavdhan', label: 'Bavdhan', lat: 18.5135, lng: 73.7798 },
  'sus': { slug: 'sus', label: 'Sus', lat: 18.5458, lng: 73.7538 },
  'mahalunge': { slug: 'mahalunge', label: 'Mahalunge', lat: 18.5754, lng: 73.7544 },
  'karve nagar': { slug: 'karve-nagar', label: 'Karve Nagar', lat: 18.4904, lng: 73.8165 },
  'kothrud': { slug: 'kothrud', label: 'Kothrud', lat: 18.5074, lng: 73.8077 },
  'warje': { slug: 'warje', label: 'Warje', lat: 18.4865, lng: 73.7968 },
  'erandwane': { slug: 'erandwane', label: 'Erandwane', lat: 18.5091, lng: 73.8318 },
  'shivajinagar': { slug: 'shivajinagar', label: 'Shivajinagar', lat: 18.5308, lng: 73.8475 },
  'shivaji nagar': { slug: 'shivajinagar', label: 'Shivajinagar', lat: 18.5308, lng: 73.8475 },
  'deccan': { slug: 'deccan', label: 'Deccan', lat: 18.5165, lng: 73.8415 },
  'model colony': { slug: 'model-colony', label: 'Model Colony', lat: 18.5326, lng: 73.8359 },
  'fc road': { slug: 'fc-road', label: 'FC Road', lat: 18.5226, lng: 73.8414 },
  'jm road': { slug: 'jm-road', label: 'JM Road', lat: 18.5218, lng: 73.8466 },
  'sb road': { slug: 'sb-road', label: 'SB Road', lat: 18.5314, lng: 73.829 },
  'senapati bapat road': { slug: 'sb-road', label: 'SB Road', lat: 18.5314, lng: 73.829 },
  'pimple saudagar': { slug: 'pimple-saudagar', label: 'Pimple Saudagar', lat: 18.5987, lng: 73.7978 },
  'pimple nilakh': { slug: 'pimple-nilakh', label: 'Pimple Nilakh', lat: 18.5794, lng: 73.7888 },
  'pimple gurav': { slug: 'pimple-gurav', label: 'Pimple Gurav', lat: 18.5877, lng: 73.8165 },
  'pimpri': { slug: 'pimpri', label: 'Pimpri', lat: 18.6298, lng: 73.7997 },
  'chinchwad': { slug: 'chinchwad', label: 'Chinchwad', lat: 18.6279, lng: 73.7868 },
  'akurdi': { slug: 'akurdi', label: 'Akurdi', lat: 18.6502, lng: 73.7679 },
  'nigdi': { slug: 'nigdi', label: 'Nigdi', lat: 18.6596, lng: 73.7695 },
  'ravet': { slug: 'ravet', label: 'Ravet', lat: 18.6507, lng: 73.7443 },
  'punawale': { slug: 'punawale', label: 'Punawale', lat: 18.6305, lng: 73.7393 },
  'tathawade': { slug: 'tathawade', label: 'Tathawade', lat: 18.6186, lng: 73.7495 },
  'thergaon': { slug: 'thergaon', label: 'Thergaon', lat: 18.6096, lng: 73.7764 },
  'rahatani': { slug: 'rahatani', label: 'Rahatani', lat: 18.6042, lng: 73.7897 },
  'bhosari': { slug: 'bhosari', label: 'Bhosari', lat: 18.6279, lng: 73.8482 },
  'moshi': { slug: 'moshi', label: 'Moshi', lat: 18.6786, lng: 73.8492 },
  'charholi': { slug: 'charholi', label: 'Charholi', lat: 18.6331, lng: 73.9098 },
  'sangvi': { slug: 'sangvi', label: 'Sangvi', lat: 18.5798, lng: 73.8178 },
  'dapodi': { slug: 'dapodi', label: 'Dapodi', lat: 18.5844, lng: 73.8336 },
  'bopodi': { slug: 'bopodi', label: 'Bopodi', lat: 18.5673, lng: 73.8342 },
  'kondhwa': { slug: 'kondhwa', label: 'Kondhwa', lat: 18.4695, lng: 73.889 },
  'undri': { slug: 'undri', label: 'Undri', lat: 18.4581, lng: 73.9137 },
  'nibm': { slug: 'nibm', label: 'NIBM', lat: 18.4721, lng: 73.8998 },
  'mohammed wadi': { slug: 'mohammed-wadi', label: 'Mohammed Wadi', lat: 18.4742, lng: 73.9163 },
  'handewadi': { slug: 'handewadi', label: 'Handewadi', lat: 18.4729, lng: 73.9378 },
  'katraj': { slug: 'katraj', label: 'Katraj', lat: 18.4529, lng: 73.8652 },
  'bibwewadi': { slug: 'bibwewadi', label: 'Bibwewadi', lat: 18.4767, lng: 73.866 },
  'dhankawadi': { slug: 'dhankawadi', label: 'Dhankawadi', lat: 18.4675, lng: 73.8548 },
  'ambegaon': { slug: 'ambegaon', label: 'Ambegaon', lat: 18.4557, lng: 73.8427 },
  'narhe': { slug: 'narhe', label: 'Narhe', lat: 18.4488, lng: 73.8229 },
  'dhayari': { slug: 'dhayari', label: 'Dhayari', lat: 18.4481, lng: 73.8117 },
  'sinhagad road': { slug: 'sinhagad-road', label: 'Sinhagad Road', lat: 18.4754, lng: 73.8226 },
  'swargate': { slug: 'swargate', label: 'Swargate', lat: 18.5018, lng: 73.8636 },
  'camp': { slug: 'camp', label: 'Camp', lat: 18.5141, lng: 73.8794 },
  'fatima nagar': { slug: 'fatima-nagar', label: 'Fatima Nagar', lat: 18.5056, lng: 73.9035 },
  'sopan baug': { slug: 'sopan-baug', label: 'Sopan Baug', lat: 18.5162, lng: 73.9052 },
  'sahakarnagar': { slug: 'sahakarnagar', label: 'Sahakarnagar', lat: 18.4872, lng: 73.8511 },
  'sadashiv peth': { slug: 'sadashiv-peth', label: 'Sadashiv Peth', lat: 18.5094, lng: 73.8478 },
  'ganesh nagar': { slug: 'ganesh-nagar', label: 'Ganesh Nagar', lat: 18.5498, lng: 73.9308 },
};

const SLUG_TO_DIRECTORY_META = new Map<
  string,
  { slug: string; label: string; lat: number; lng: number }
>(Object.values(PUNE_AREA_DIRECTORY).map((m) => [m.slug, m]));

function slugifyArea(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/\b(pune|maharashtra|india)\b/gi, '')
    .replace(/\b\d{6}\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return cleaned.length >= 2 ? cleaned : 'other';
}

function titleCaseArea(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const upper = w.toUpperCase();
      if (upper === 'FC' || upper === 'JM' || upper === 'SB' || upper === 'NIBM' || upper === 'IT') {
        return upper;
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickCleanFallbackAreaLabel(location: string): string {
  const parts = location
    .split(',')
    .map((p) => p.replace(/\b\d{6}\b/g, '').trim())
    .filter(Boolean);

  const nonCityParts = parts.filter(
    (p) => !/^(pune|maharashtra|india)$/i.test(p)
  );

  // Prefer a segment that isn't a pure street/flat/landmark prefix like "Near ..." or "Flat No. ..."
  const cleanSegment =
    nonCityParts.find(
      (p) => !/^(near|opp\.?|opposite|behind|beside|next to|flat\s*no\.?|lane\s*no\.?|sr\.?\s*no\.?)\b/i.test(p)
    ) ||
    nonCityParts[0] ||
    parts[0] ||
    location.trim();

  const cleaned = cleanSegment
    .replace(/^(near|opp\.?|opposite|behind|beside)\s+/i, '')
    .trim()
    .slice(0, 50);

  return cleaned.length >= 2 ? titleCaseArea(cleaned) : 'Other Areas';
}

export function inferAreaMeta(location: string): {
  slug: string;
  label: string;
  subLocality: string;
  lat: number;
  lng: number;
} {
  const lower = location.toLowerCase();
  for (const [key, meta] of Object.entries(PUNE_AREA_DIRECTORY)) {
    const pattern = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i');
    if (pattern.test(lower)) {
      return {
        slug: meta.slug,
        label: meta.label,
        subLocality: meta.label,
        lat: meta.lat,
        lng: meta.lng,
      };
    }
  }

  const cleanLabel = pickCleanFallbackAreaLabel(location);
  return {
    slug: slugifyArea(cleanLabel),
    label: cleanLabel,
    subLocality: cleanLabel,
    lat: 18.5204,
    lng: 73.8567,
  };
}

export function resolvePropertyArea(property: PropertyListing): {
  slug: string;
  label: string;
  lat: number;
  lng: number;
} {
  const rawSlug = (property.localitySlug || '').trim().toLowerCase();
  if (rawSlug && rawSlug !== 'other') {
    const dirMeta = SLUG_TO_DIRECTORY_META.get(rawSlug);
    if (dirMeta) {
      return dirMeta;
    }
    const inferredFromText = inferAreaMeta(`${property.subLocality || ''}, ${property.locality || ''}`);
    if (inferredFromText.slug === rawSlug) {
      return {
        slug: inferredFromText.slug,
        label: inferredFromText.label,
        lat: inferredFromText.lat,
        lng: inferredFromText.lng,
      };
    }
    return {
      slug: rawSlug,
      label: titleCaseArea(rawSlug.replace(/-/g, ' ')),
      lat: property.coordinates?.lat ?? 18.5204,
      lng: property.coordinates?.lng ?? 73.8567,
    };
  }

  const inferred = inferAreaMeta(`${property.subLocality || ''}, ${property.locality || ''}`);
  return {
    slug: inferred.slug,
    label: inferred.label,
    lat: inferred.lat,
    lng: inferred.lng,
  };
}

export function matchesLocality(property: PropertyListing, locality: LocalityConfig): boolean {
  if (locality.slug === 'other') {
    return locality.matchSlugs.includes(property.localitySlug);
  }
  if (property.localitySlug && property.localitySlug !== 'other') {
    if (property.localitySlug === locality.slug || locality.matchSlugs.includes(property.localitySlug)) {
      return true;
    }
  }
  return resolvePropertyArea(property).slug === locality.slug;
}

/**
 * Dynamically builds area cards for ExploreAreasSection & Hero dropdown
 * strictly from the actual active flats data (zero hardcoded static area defaults).
 * Automatically supports all Pune areas today and any new area or city in the future.
 */
export function buildDynamicLocalities(allProperties: PropertyListing[]): LocalityConfig[] {
  const activeProperties = getActiveListings(allProperties);
  const areaMap = new Map<
    string,
    {
      config: LocalityConfig;
      availableCount: number;
      totalCount: number;
      hasAvailableImage: boolean;
    }
  >();

  for (const prop of activeProperties) {
    const resolved = resolvePropertyArea(prop);
    const slug = resolved.slug;
    const isAvailable = !isPropertyRentedOut(prop);
    const propImg = prop.images[0] || '';
    const fallbackImg = '/assets/properties/flat-1/photo-1.jpeg';

    const existing = areaMap.get(slug);
    if (existing) {
      existing.totalCount += 1;
      if (isAvailable) {
        existing.availableCount += 1;
        if (!existing.hasAvailableImage && propImg) {
          existing.config.image = propImg;
          existing.hasAvailableImage = true;
        }
      } else if (existing.config.image === fallbackImg && propImg) {
        existing.config.image = propImg;
      }
      if (
        prop.localitySlug &&
        prop.localitySlug !== 'other' &&
        !existing.config.matchSlugs.includes(prop.localitySlug)
      ) {
        existing.config.matchSlugs.push(prop.localitySlug);
      }
    } else {
      const matchSlugs = Array.from(
        new Set(
          [
            slug,
            prop.localitySlug && prop.localitySlug !== 'other' ? prop.localitySlug : '',
          ].filter(Boolean)
        )
      );

      areaMap.set(slug, {
        config: {
          id: `loc-${slug}`,
          name: resolved.label,
          slug,
          subtitle: `Rental flats in ${resolved.label}`,
          image: propImg || fallbackImg,
          center: prop.coordinates || { lat: resolved.lat, lng: resolved.lng },
          matchSlugs,
        },
        availableCount: isAvailable ? 1 : 0,
        totalCount: 1,
        hasAvailableImage: isAvailable && Boolean(propImg),
      });
    }
  }

  return Array.from(areaMap.values())
    .sort((a, b) => {
      if (b.availableCount !== a.availableCount) {
        return b.availableCount - a.availableCount;
      }
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount;
      }
      return a.config.name.localeCompare(b.config.name);
    })
    .map((entry) => entry.config);
}

export function filterProperties(
  properties: PropertyListing[],
  filters: SearchFiltersState,
  localities: LocalityConfig[] = LOCALITIES,
  savedIds: string[] = []
): PropertyListing[] {
  const active = getActiveListings(properties);

  const hasOtherBucket = localities.some((loc) => loc.slug === 'other');

  const filtered = active.filter((property) => {
    if (filters.location && filters.location !== 'all') {
      const matchedLocality = localities.find((loc) => loc.slug === filters.location);
      if (matchedLocality) {
        if (hasOtherBucket && property.localitySlug === 'other') {
          if (!matchedLocality.matchSlugs.includes(property.localitySlug)) {
            return false;
          }
        } else if (!matchesLocality(property, matchedLocality)) {
          return false;
        }
      } else if (
        property.localitySlug !== filters.location &&
        resolvePropertyArea(property).slug !== filters.location
      ) {
        return false;
      }
    }

    if (filters.propertyType !== 'all' && property.propertyType !== filters.propertyType) {
      return false;
    }

    if (filters.minRent !== undefined && filters.minRent !== null && filters.minRent > 0) {
      if (property.monthlyRent < filters.minRent) {
        return false;
      }
    }

    if (filters.maxRent !== null && filters.maxRent > 0 && property.monthlyRent > filters.maxRent) {
      return false;
    }

    if (
      filters.furnishing &&
      filters.furnishing !== 'all' &&
      property.furnishing !== filters.furnishing
    ) {
      return false;
    }

    if (
      filters.submitterRole &&
      filters.submitterRole !== 'all' &&
      property.submitterRole !== filters.submitterRole
    ) {
      return false;
    }

    if (filters.onlyAvailable && isPropertyRentedOut(property)) {
      return false;
    }

    if (filters.onlySaved && !savedIds.includes(property.id)) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const rentedDiff = Number(isPropertyRentedOut(a)) - Number(isPropertyRentedOut(b));
    if (rentedDiff !== 0) return rentedDiff;

    if (filters.sortBy === 'rent-asc') {
      return a.monthlyRent - b.monthlyRent;
    }
    if (filters.sortBy === 'rent-desc') {
      return b.monthlyRent - a.monthlyRent;
    }
    if (filters.sortBy === 'recent') {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return timeB - timeA;
    }
    return 0;
  });

  return sorted;
}

export function getLocalityListingCount(
  properties: PropertyListing[],
  locality: LocalityConfig
): number {
  const active = getActiveListings(properties);
  return active.filter(
    (item) => !isPropertyRentedOut(item) && matchesLocality(item, locality)
  ).length;
}

export function formatBrokerageLabel(property: PropertyListing): string {
  if (property.brokerageStatus === 'No Brokerage') {
    return 'No Brokerage';
  }
  if (property.brokerageAmount > 0) {
    return `${property.brokerageStatus} – ${formatINR(property.brokerageAmount)}`;
  }
  return property.brokerageStatus;
}

export function getPropertyDirectUrl(baseUrl: string, propertyId: string): string {
  const cleanId = encodeURIComponent(propertyId.trim());
  try {
    const parsed = new URL(baseUrl);
    return `${parsed.origin}/property/${cleanId}`;
  } catch {
    const cleanBase = baseUrl.split('#')[0].split('?')[0].replace(/\/+$/, '');
    return `${cleanBase}/property/${cleanId}`;
  }
}

/**
 * Always produces the canonical live Vercel property share URL:
 * https://withbroker.vercel.app/property/<propertyCode>
 */
export function getPublicPropertyShareUrl(propertyId: string): string {
  return getPropertyDirectUrl(WEBSITE_URL, propertyId);
}

/**
 * Canonical live Vercel Direct Owner Property Submission URL:
 * https://withbroker.vercel.app/owner-add-property
 */
export function getOwnerSubmissionShareUrl(): string {
  const cleanOrigin = WEBSITE_URL.replace(/\/+$/, '');
  return `${cleanOrigin}/owner-add-property`;
}

export function buildWhatsAppInquiryUrl(property: PropertyListing, currentUrl: string): string {
  const propCode = property.propertyCode || property.id;

  if (isPropertyRentedOut(property)) {
    const rentedMessage = [
      'Hi WithBroker,',
      '',
      `I saw that Property ID: ${propCode} (${property.title}) is currently marked as Rented Out.`,
      `Location: ${property.locality}`,
      `Budget Reference: ${formatINR(property.monthlyRent)}/month`,
      '',
      `Please share similar available ${property.propertyType} options in or near ${property.subLocality}.`,
      '',
      `Reference Link: ${currentUrl}`,
    ].join('\n');

    return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(rentedMessage)}`;
  }

  const brokerageText =
    property.brokerageStatus === 'No Brokerage'
      ? 'No Brokerage'
      : property.brokerageAmount > 0
        ? formatINR(property.brokerageAmount)
        : property.brokerageStatus;

  const message = [
    `Hi, I found your property on WithBroker. I am interested in Property ID: ${propCode}. Please share more details.`,
    '',
    `Property: ${property.title}`,
    `Location: ${property.locality}`,
    `Rent: ${formatINR(property.monthlyRent)}/month`,
    `Deposit: ${formatDepositLabel(property.securityDeposit)}`,
    `Brokerage: ${brokerageText}`,
    '',
    `Property Link: ${currentUrl}`,
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(message)}`;
}

export function buildOwnerContactWhatsAppUrl(params: {
  ownerPhone: string;
  ownerName: string;
  propertyCode: string;
  title: string;
  status: string;
}): string {
  const digits = params.ownerPhone.replace(/\D/g, '');
  const phoneWithCountry = digits.length === 10 ? `91${digits}` : digits;
  const message = [
    `Hello ${params.ownerName},`,
    '',
    `This is the WithBroker team contacting you regarding your submitted listing:`,
    `Property ID: ${params.propertyCode}`,
    `Property: ${params.title}`,
    `Current Status: ${params.status}`,
    '',
    'Please let us know if the flat is available for tenant visits.',
  ].join('\n');

  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
}

export function buildGeneralWhatsAppUrl(customGreeting?: string): string {
  const text =
    customGreeting ??
    'Hello WithBroker, I am looking for a rental apartment in Pune. Please share available flat options.';
  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(text)}`;
}

export function buildPropertyShareText(property: PropertyListing, propertyUrl?: string): string {
  const propCode = property.propertyCode || property.id;
  const directUrl = propertyUrl?.trim() || getPublicPropertyShareUrl(propCode);
  const brokerageText =
    property.brokerageStatus === 'No Brokerage'
      ? 'No Brokerage'
      : property.brokerageAmount > 0
        ? formatINR(property.brokerageAmount)
        : property.brokerageStatus;

  const facilitiesText =
    property.facilities.length > 0
      ? property.facilities.join(', ')
      : 'Basic Utilities Available';

  const locationDisplay = property.locality.toLowerCase().includes('pune')
    ? property.locality
    : `${property.locality}, Pune`;

  const statusTag = isPropertyRentedOut(property) ? 'Rented Out' : 'Available for Rent';

  return [
    `🏠 ${property.title} (${statusTag})`,
    `🆔 Property ID: ${propCode}`,
    `📍 ${locationDisplay}`,
    '',
    `💰 Rent: ${formatINR(property.monthlyRent)}/month | 🔐 Deposit: ${formatDepositLabel(property.securityDeposit)}`,
    `🤝 Brokerage: ${brokerageText} | 🛋️ ${property.furnishing}`,
    `👨‍👩‍👧 Suitable for: ${property.suitableFor}`,
    `🏡 Facilities: ${facilitiesText}`,
    '',
    `📲 WhatsApp: ${WHATSAPP_NUMBER_DISPLAY} (WithBroker)`,
    `🔗 View Flat on WithBroker: ${directUrl}`,
    `👥 WhatsApp Group — ${WHATSAPP_COMMUNITY_NAME}:`,
    WHATSAPP_COMMUNITY_URL,
    '',
    'WITHBROKER • RENT • SEARCH • CONNECT',
  ].join('\n');
}

export function buildWhatsAppPropertyShareText(
  property: PropertyListing,
  propertyUrl?: string
): string {
  const propCode = property.propertyCode || property.id;
  const directUrl = propertyUrl?.trim() || getPublicPropertyShareUrl(propCode);
  const locationDisplay = property.locality.toLowerCase().includes('pune')
    ? property.locality
    : `${property.locality}, Pune`;

  const headline = property.title.trim()
    ? property.title.trim()
    : `${property.propertyType} Flat for Rent – ${property.subLocality}`;

  return [
    `🏠 ${headline}`,
    `🆔 Property ID: ${propCode}`,
    '',
    `💰 Rent: ${formatINR(property.monthlyRent)}/month`,
    `📍 Location: ${locationDisplay}`,
    '',
    'View full details and photos:',
    directUrl,
    '',
    `👥 Join ${WHATSAPP_COMMUNITY_NAME} (WhatsApp Group):`,
    WHATSAPP_COMMUNITY_URL,
    '',
    'Listed on WITHBROKER',
    'RENT • SEARCH • CONNECT',
  ].join('\n');
}

export function buildWhatsAppSharePostUrl(shareText: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
}

export function buildTelegramSharePostUrl(shareText: string, shareUrl: string = WEBSITE_URL): string {
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
}

export function buildSmsSharePostUrl(shareText: string): string {
  return `sms:?&body=${encodeURIComponent(shareText)}`;
}

export function buildEmailSharePostUrl(property: PropertyListing, shareText: string): string {
  const subject = `${property.propertyType} Flat for Rent in ${property.locality} — WithBroker`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;
}

function isValidIndianMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(normalized);
}

export function validateSubmissionForm(
  input: PropertySubmissionInput
): SubmissionValidationErrors {
  const errors: SubmissionValidationErrors = {};

  if (!input.name.trim() || input.name.trim().length < 2) {
    errors.name = 'Please enter your full name.';
  }

  if (!isValidIndianMobile(input.mobile)) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (!isValidIndianMobile(input.whatsapp)) {
    errors.whatsapp = 'Enter a valid 10-digit WhatsApp number.';
  }

  if (!input.propertyType) {
    errors.propertyType = 'Select a property type (1RK, 1BHK, 2BHK, or 3BHK).';
  }

  if (!input.location.trim() || input.location.trim().length < 3) {
    errors.location = 'Please enter the property locality in Pune.';
  }

  const rentNum = Number(input.monthlyRent);
  if (!input.monthlyRent.trim() || Number.isNaN(rentNum) || rentNum < 1000) {
    errors.monthlyRent = 'Enter a valid monthly rent in ₹ (minimum ₹1,000).';
  }

  const depositNum = Number(input.securityDeposit);
  if (input.securityDeposit.trim() === '' || Number.isNaN(depositNum) || depositNum < 0) {
    errors.securityDeposit = 'Enter a valid security deposit amount in ₹.';
  }

  if (input.brokerageAmount.trim() !== '') {
    const brokerageNum = Number(input.brokerageAmount);
    if (Number.isNaN(brokerageNum) || brokerageNum < 0) {
      errors.brokerageAmount = 'Enter a valid brokerage amount in ₹ (0 for No Brokerage).';
    }
  }

  if (!input.availableFrom.trim()) {
    errors.availableFrom = 'Please specify the available from date.';
  }

  const bathNum = Number(input.bathrooms);
  if (!input.bathrooms.trim() || Number.isNaN(bathNum) || bathNum < 1 || bathNum > 10) {
    errors.bathrooms = 'Enter valid bathrooms count (1–10).';
  }

  if (input.balconies.trim() !== '') {
    const balcNum = Number(input.balconies);
    if (Number.isNaN(balcNum) || balcNum < 0 || balcNum > 10) {
      errors.balconies = 'Enter valid balconies count (0–10).';
    }
  }

  if (input.description.trim().length > 2500) {
    errors.description = 'Description must be under 2,500 characters.';
  }

  return errors;
}

/**
 * Automatically builds a clear, natural rental flat description from the form inputs
 * so owners & brokers never have to type a description manually.
 */
export function generateAutoPropertyDescription(
  input: PropertySubmissionInput
): string {
  const typeLabel = input.propertyType || 'Rental Flat';
  const furnishingLabel = input.furnishingStatus || 'Unfurnished';
  const locationLabel = input.location.trim() || 'Pune';
  const societyPart = input.societyName.trim() ? ` at ${input.societyName.trim()}` : '';

  const rentNum = Number(input.monthlyRent);
  const depositNum = Number(input.securityDeposit);
  const brokerageNum = Number(input.brokerageAmount || '0');

  const rentText =
    Number.isFinite(rentNum) && rentNum >= 1000
      ? `Monthly rent is ${formatINR(Math.round(rentNum))}`
      : 'Affordable monthly rent';
  const depositText =
    input.securityDeposit.trim() !== '' && Number.isFinite(depositNum) && depositNum >= 0
      ? ` with ${formatINR(Math.round(depositNum))} security deposit`
      : '';
  const brokerageText =
    Number.isFinite(brokerageNum) && brokerageNum > 0
      ? ` and brokerage of ${formatINR(Math.round(brokerageNum))}.`
      : ' with No Brokerage.';

  const specParts: string[] = [];
  const bathNum = Number(input.bathrooms);
  if (Number.isFinite(bathNum) && bathNum >= 1) {
    specParts.push(`${Math.round(bathNum)} bathroom${Math.round(bathNum) > 1 ? 's' : ''}`);
  }
  const balcNum = Number(input.balconies);
  if (Number.isFinite(balcNum) && balcNum > 0) {
    specParts.push(`${Math.round(balcNum)} balcon${Math.round(balcNum) > 1 ? 'ies' : 'y'}`);
  }
  if (input.carpetArea.trim()) {
    specParts.push(`${input.carpetArea.trim()} carpet area`);
  }
  if (input.floorNumber.trim() && input.totalFloors.trim()) {
    specParts.push(`floor ${input.floorNumber.trim()} of ${input.totalFloors.trim()}`);
  } else if (input.floorNumber.trim()) {
    specParts.push(`floor ${input.floorNumber.trim()}`);
  }

  const specsSentence =
    specParts.length > 0 ? ` Includes ${specParts.join(', ')}.` : '';
  const facilitiesSentence =
    input.facilities.length > 0
      ? ` Key facilities: ${input.facilities.slice(0, 6).join(', ')}.`
      : '';
  const availSentence = input.availableFrom.trim()
    ? ` Available from ${input.availableFrom.trim()}.`
    : ' Available immediately.';

  return `Well-maintained ${furnishingLabel} ${typeLabel} flat for rent${societyPart} in ${locationLabel}. ${rentText}${depositText}${brokerageText}${specsSentence}${facilitiesSentence}${availSentence}`.trim();
}

export function buildPropertySubmissionWhatsAppUrl(
  input: PropertySubmissionInput,
  propertyCode?: string
): string {
  const rentNum = Number(input.monthlyRent);
  const depositNum = Number(input.securityDeposit);
  const brokerageNum = Number(input.brokerageAmount || 0);
  const rentFormatted =
    Number.isFinite(rentNum) && rentNum > 0 ? formatINR(rentNum) : input.monthlyRent;
  const depositFormatted =
    Number.isFinite(depositNum) && depositNum >= 0 ? formatINR(depositNum) : input.securityDeposit;
  const brokerageFormatted =
    Number.isFinite(brokerageNum) && brokerageNum > 0 ? formatINR(brokerageNum) : 'No Brokerage';

  const lines = [
    'Hello WithBroker,',
    '',
    propertyCode
      ? `I have just submitted my property on WithBroker (Property ID: ${propertyCode}).`
      : 'I would like to submit a rental property listing for review:',
    '',
    `Submitted By: ${input.name.trim()} (${input.submitterRole})`,
    `Mobile: ${input.mobile.trim()} | WhatsApp: ${input.whatsapp.trim()}`,
    `Property Type: ${input.propertyType}`,
    `Location: ${input.location.trim()}, Pune`,
    ...(input.societyName.trim() ? [`Society / Building: ${input.societyName.trim()}`] : []),
    `Monthly Rent: ${rentFormatted}`,
    `Security Deposit: ${depositFormatted}`,
    `Brokerage: ${brokerageFormatted}`,
    `Furnishing: ${input.furnishingStatus}`,
    `Available From: ${input.availableFrom}`,
    '',
    'Please review and approve it on the dashboard.',
  ];

  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(lines.join('\n'))}`;
}
