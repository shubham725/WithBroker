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

export function filterProperties(
  properties: PropertyListing[],
  filters: SearchFiltersState,
  localities: LocalityConfig[] = LOCALITIES,
  savedIds: string[] = []
): PropertyListing[] {
  const active = getActiveListings(properties);

  const filtered = active.filter((property) => {
    if (filters.location && filters.location !== 'all') {
      const matchedLocality = localities.find((loc) => loc.slug === filters.location);
      if (matchedLocality) {
        if (!matchedLocality.matchSlugs.includes(property.localitySlug)) {
          return false;
        }
      } else if (property.localitySlug !== filters.location) {
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
    (item) => !isPropertyRentedOut(item) && locality.matchSlugs.includes(item.localitySlug)
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

export function buildPropertyShareText(property: PropertyListing, propertyUrl: string): string {
  const propCode = property.propertyCode || property.id;
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
    `👥 WhatsApp Group — ${WHATSAPP_COMMUNITY_NAME}:`,
    WHATSAPP_COMMUNITY_URL,
    `🌐 Website: ${WEBSITE_URL}`,
    `🔗 Property Link: ${propertyUrl}`,
    '',
    'WITHBROKER • RENT • SEARCH • CONNECT',
  ].join('\n');
}

export function buildWhatsAppPropertyShareText(
  property: PropertyListing,
  propertyUrl: string
): string {
  const locationDisplay = property.locality.toLowerCase().includes('pune')
    ? property.locality
    : `${property.locality}, Pune`;

  const headline = property.title.trim()
    ? property.title.trim()
    : `${property.propertyType} Flat for Rent – ${property.subLocality}`;

  return [
    `🏠 ${headline}`,
    '',
    `💰 Rent: ${formatINR(property.monthlyRent)}/month`,
    `📍 Location: ${locationDisplay}`,
    '',
    'View full details and photos:',
    propertyUrl,
    '',
    'Listed on WITHBROKER',
    'RENT • SEARCH • CONNECT',
  ].join('\n');
}

export function buildWhatsAppSharePostUrl(shareText: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
}

export function buildTelegramSharePostUrl(shareText: string, propertyUrl: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(propertyUrl)}&text=${encodeURIComponent(shareText)}`;
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
