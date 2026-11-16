import {
  LOCALITIES,
  WEBSITE_URL,
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_NUMBER_DIGITS,
  WHATSAPP_NUMBER_LOCAL,
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

    if (filters.maxRent !== null && filters.maxRent > 0 && property.monthlyRent > filters.maxRent) {
      return false;
    }

    if (filters.furnishing && filters.furnishing !== 'all' && property.furnishing !== filters.furnishing) {
      return false;
    }

    if (filters.onlySaved && !savedIds.includes(property.id)) {
      return false;
    }

    return true;
  });

  if (filters.sortBy === 'rent-asc') {
    return [...filtered].sort((a, b) => a.monthlyRent - b.monthlyRent);
  }
  if (filters.sortBy === 'rent-desc') {
    return [...filtered].sort((a, b) => b.monthlyRent - a.monthlyRent);
  }

  return filtered;
}

export function getLocalityListingCount(
  properties: PropertyListing[],
  locality: LocalityConfig
): number {
  const active = getActiveListings(properties);
  return active.filter((item) => locality.matchSlugs.includes(item.localitySlug)).length;
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
  const cleanBase = baseUrl.split('#')[0].split('?')[0];
  return `${cleanBase}?flat=${encodeURIComponent(propertyId)}#flats`;
}

export function buildWhatsAppInquiryUrl(property: PropertyListing, currentUrl: string): string {
  const brokerageText =
    property.brokerageStatus === 'No Brokerage'
      ? 'No Brokerage'
      : property.brokerageAmount > 0
        ? formatINR(property.brokerageAmount)
        : property.brokerageStatus;

  const message = [
    'Hello WithBroker,',
    '',
    'I am interested in this rental property.',
    '',
    `Property: ${property.title}`,
    `Location: ${property.locality}`,
    `Rent: ${formatINR(property.monthlyRent)}`,
    `Deposit: ${formatDepositLabel(property.securityDeposit)}`,
    `Brokerage: ${brokerageText}`,
    '',
    'Please share more details and property photos.',
    '',
    `Property Link: ${currentUrl}`,
    '',
    'Thank you.',
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(message)}`;
}

export function buildGeneralWhatsAppUrl(customGreeting?: string): string {
  const text =
    customGreeting ??
    'Hello WithBroker, I am looking for a rental apartment in Pune. Please share available flat options.';
  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(text)}`;
}

export function buildPropertyShareText(property: PropertyListing, propertyUrl: string): string {
  const brokerageText =
    property.brokerageStatus === 'No Brokerage'
      ? 'No Brokerage'
      : property.brokerageAmount > 0
        ? formatINR(property.brokerageAmount)
        : property.brokerageStatus;

  const facilitiesLines =
    property.facilities.length > 0
      ? property.facilities.map((facility) => `✅ ${facility}`)
      : ['✅ Basic Utilities Available'];

  const locationDisplay = property.locality.toLowerCase().includes('pune')
    ? property.locality
    : `${property.locality}, Pune`;

  return [
    `🏠 ${property.propertyType} FLAT AVAILABLE FOR RENT`,
    '',
    `📍 Location: ${locationDisplay}`,
    '',
    `💰 Rent: ${formatINR(property.monthlyRent)}`,
    `🔐 Deposit: ${formatDepositLabel(property.securityDeposit)}`,
    `🤝 Brokerage: ${brokerageText}`,
    `🛋️ Furnishing: ${property.furnishing}`,
    '',
    '🏡 Facilities:',
    ...facilitiesLines,
    '',
    `👨‍👩‍👧 Suitable for: ${property.suitableFor}`,
    '',
    '📞 Contact: WithBroker',
    `📲 WhatsApp: ${WHATSAPP_NUMBER_LOCAL}`,
    `💬 Join WhatsApp Group: ${WHATSAPP_COMMUNITY_URL}`,
    `🌐 Website: ${WEBSITE_URL}`,
    '',
    `🔗 View Property: ${propertyUrl}`,
    '',
    'WITHBROKER',
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

export function validateSubmissionForm(
  input: PropertySubmissionInput
): SubmissionValidationErrors {
  const errors: SubmissionValidationErrors = {};

  if (!input.name.trim() || input.name.trim().length < 2) {
    errors.name = 'Please enter your full name.';
  }

  const digits = input.mobile.replace(/\D/g, '');
  const normalizedMobile = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (!input.propertyType) {
    errors.propertyType = 'Select a property type (1RK, 1BHK, 2BHK, or 3BHK).';
  }

  if (!input.location.trim()) {
    errors.location = 'Please enter or select the locality in Pune.';
  }

  const rentNum = Number(input.monthlyRent);
  if (!input.monthlyRent.trim() || Number.isNaN(rentNum) || rentNum < 1000) {
    errors.monthlyRent = 'Enter a valid monthly rent in ₹ (minimum ₹1,000).';
  }

  const depositNum = Number(input.securityDeposit);
  if (input.securityDeposit.trim() === '' || Number.isNaN(depositNum) || depositNum < 0) {
    errors.securityDeposit = 'Enter a valid security deposit amount in ₹.';
  }

  return errors;
}

export function buildPropertySubmissionWhatsAppUrl(input: PropertySubmissionInput): string {
  const rentNum = Number(input.monthlyRent);
  const depositNum = Number(input.securityDeposit);
  const rentFormatted = Number.isFinite(rentNum) && rentNum > 0 ? formatINR(rentNum) : input.monthlyRent;
  const depositFormatted =
    Number.isFinite(depositNum) && depositNum >= 0 ? formatINR(depositNum) : input.securityDeposit;

  const facilitiesText =
    input.facilities.length > 0 ? input.facilities.join(', ') : 'Not specified';

  const photoNote =
    input.photoNames.length > 0
      ? `${input.photoNames.length} photo(s) selected (${input.photoNames.join(', ')}) — I will attach them here in WhatsApp.`
      : 'Will share property photos directly on WhatsApp if available.';

  const lines = [
    'Hello WithBroker,',
    '',
    'I would like to submit a rental property listing for review:',
    '',
    `Submitted By: ${input.name.trim()} (${input.submitterRole})`,
    `Contact Number: ${input.mobile.trim()}`,
    `Property Type: ${input.propertyType}`,
    `Location: ${input.location.trim()}, Pune`,
    `Monthly Rent: ${rentFormatted}`,
    `Security Deposit: ${depositFormatted}`,
    `Brokerage Details: ${input.brokerageDetails.trim() || 'To be discussed'}`,
    `Furnishing Status: ${input.furnishingStatus}`,
    `Facilities: ${facilitiesText}`,
    `Description: ${input.description.trim() || 'Not provided'}`,
    `Photos: ${photoNote}`,
    '',
    'Please review and let me know when it can be published on WithBroker.',
  ];

  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(lines.join('\n'))}`;
}
