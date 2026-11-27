import {
  WEBSITE_URL,
  WHATSAPP_COMMUNITY_NAME,
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_NUMBER_DIGITS,
} from '../data/properties';
import type {
  PublicRoommateListing,
  RoommateDashboardStats,
  RoommateFiltersState,
  RoommateListingRecord,
  RoommateListingType,
  RoommateReportRecord,
  RoommateSubmissionInput,
  RoommateValidationErrors,
} from '../types/roommate';
import { formatINR } from './propertyLogic';

export const ROOMMATE_DEFAULT_EXPIRY_DAYS = 30;

export const INITIAL_ROOMMATE_FILTERS: RoommateFiltersState = {
  listingType: 'all',
  flatOccupancy: 'all',
  location: 'all',
  preferredGender: 'all',
  roomType: 'all',
  minBudget: null,
  maxBudget: null,
  occupation: 'all',
  furnishing: 'all',
  availableFrom: '',
  sortBy: 'recent',
};

export function normalizeIndianPhone10(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  return digits.slice(0, 10);
}

export function extractPosterFirstName(fullName: string): string {
  const cleaned = (fullName || '').trim();
  if (!cleaned) return 'Tenant';
  return cleaned.split(/\s+/)[0].slice(0, 40) || 'Tenant';
}

export function getListingTypeLabel(type: RoommateListingType): string {
  return type === 'have_room'
    ? 'Room Available · Partner Needed'
    : 'Looking for Room / Roommate';
}

export function getListingTypeShortLabel(type: RoommateListingType): string {
  return type === 'have_room' ? 'I Have a Room' : 'Need a Room';
}

export function isRoommateListingExpired(
  listing: Pick<PublicRoommateListing | RoommateListingRecord, 'expiresAt'>,
  now: Date = new Date()
): boolean {
  if (!listing.expiresAt) return false;
  const expiryMs = new Date(listing.expiresAt).getTime();
  if (!Number.isFinite(expiryMs)) return false;
  return expiryMs <= now.getTime();
}

export function getActivePublicRoommates(
  listings: PublicRoommateListing[],
  now: Date = new Date()
): PublicRoommateListing[] {
  return listings.filter(
    (item) => item.status === 'Active' && !isRoommateListingExpired(item, now)
  );
}

export function filterAndSortRoommates(
  listings: PublicRoommateListing[],
  filters: RoommateFiltersState,
  now: Date = new Date()
): PublicRoommateListing[] {
  const active = getActivePublicRoommates(listings, now);

  const filtered = active.filter((item) => {
    if (filters.listingType !== 'all' && item.listingType !== filters.listingType) {
      return false;
    }

    if (filters.flatOccupancy && filters.flatOccupancy !== 'all') {
      const itemOcc = item.flatOccupancy || 'Pre-Occupied Flat';
      if (itemOcc !== filters.flatOccupancy) {
        return false;
      }
    }

    if (filters.location && filters.location !== 'all') {
      const target = filters.location.trim().toLowerCase();
      const locLower = item.location.toLowerCase();
      const slugLower = item.localitySlug.toLowerCase();
      if (!locLower.includes(target) && slugLower !== target && !slugLower.includes(target)) {
        return false;
      }
    }

    if (filters.preferredGender !== 'all') {
      if (filters.preferredGender === 'Any') {
        if (item.preferredGender !== 'Any') return false;
      } else if (item.preferredGender !== filters.preferredGender && item.preferredGender !== 'Any') {
        return false;
      }
    }

    if (filters.roomType !== 'all' && item.roomType !== filters.roomType) {
      return false;
    }

    if (filters.minBudget !== null && Number.isFinite(filters.minBudget)) {
      if (item.rent < filters.minBudget) return false;
    }

    if (filters.maxBudget !== null && Number.isFinite(filters.maxBudget)) {
      if (item.rent > filters.maxBudget) return false;
    }

    if (filters.occupation !== 'all') {
      if (filters.occupation === 'Any') {
        if (item.preferredOccupation !== 'Any') return false;
      } else if (
        item.preferredOccupation !== filters.occupation &&
        item.preferredOccupation !== 'Any' &&
        item.occupation !== filters.occupation
      ) {
        return false;
      }
    }

    if (filters.furnishing !== 'all' && item.furnishing !== filters.furnishing) {
      return false;
    }

    if (filters.availableFrom && filters.availableFrom.trim()) {
      const filterDateMs = new Date(filters.availableFrom).getTime();
      const listingDateMs = new Date(item.availableFrom).getTime();
      if (Number.isFinite(filterDateMs) && Number.isFinite(listingDateMs)) {
        // Show listings available on or before the user's desired move-in date
        if (listingDateMs > filterDateMs) return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sortBy === 'rent-asc') {
      return a.rent - b.rent;
    }
    if (filters.sortBy === 'rent-desc') {
      return b.rent - a.rent;
    }
    const timeA = new Date(a.approvedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.approvedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Auto-generates a clean, Telegram-style roommate vacancy description from form details
 * so posters never have to type long descriptions manually.
 */
export function generateAutoRoommateDescription(
  input: Pick<
    RoommateSubmissionInput,
    | 'peopleRequired'
    | 'preferredGender'
    | 'flatOccupancy'
    | 'roomType'
    | 'location'
    | 'buildingName'
    | 'rent'
    | 'deposit'
    | 'electricityBill'
    | 'furnishing'
    | 'facilities'
    | 'availableFrom'
    | 'urgent'
    | 'shiftingNow'
  >
): string {
  const count = Math.max(1, Number(input.peopleRequired) || 1);
  const genderLabel =
    input.preferredGender === 'Any' ? '' : `${input.preferredGender} `;
  const occ = input.flatOccupancy || 'Pre-Occupied Flat';
  const loc = [input.buildingName?.trim(), input.location?.trim()]
    .filter(Boolean)
    .join(', ');
  const rentNum = Number(input.rent);
  const depNum = Number(input.deposit);
  const parts: string[] = [
    `${count} ${genderLabel}roommate${count > 1 ? 's' : ''} required${input.urgent ? ' urgently' : ''} for a ${input.furnishing.toLowerCase()} ${input.roomType} (${occ})${loc ? ` at ${loc}` : ''}.`,
  ];
  if (Number.isFinite(rentNum) && rentNum > 0) {
    const depText =
      Number.isFinite(depNum) && depNum > 0
        ? `, Deposit: ${formatINR(depNum)} per person`
        : '';
    const billText = input.electricityBill?.trim()
      ? `, Electricity Bill: ${input.electricityBill.trim()}`
      : '';
    parts.push(`Monthly Rent: ${formatINR(rentNum)} per person${depText}${billText}.`);
  }
  if (input.facilities && input.facilities.length > 0) {
    parts.push(`Facilities: ${input.facilities.join(', ')}.`);
  }
  if (input.availableFrom) {
    parts.push(
      `Joining from ${formatRoommateDate(input.availableFrom)}${input.shiftingNow ? ' (available for shifting now)' : ''}.`
    );
  }
  return parts.join(' ').slice(0, 1950);
}

export function validateRoommateSubmission(
  input: RoommateSubmissionInput
): RoommateValidationErrors {
  const errors: RoommateValidationErrors = {};

  if (input.name.trim() && input.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (input.name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  const mobile = normalizeIndianPhone10(input.contactNumber);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    errors.contactNumber = 'Enter a valid 10-digit Indian mobile number.';
  }

  const whatsapp = normalizeIndianPhone10(input.whatsappNumber || input.contactNumber);
  if (!/^[6-9]\d{9}$/.test(whatsapp)) {
    errors.whatsappNumber = 'Enter a valid 10-digit WhatsApp number.';
  }

  if (input.secondaryContact && input.secondaryContact.trim()) {
    const alt = normalizeIndianPhone10(input.secondaryContact);
    if (!/^[6-9]\d{9}$/.test(alt)) {
      errors.secondaryContact = 'Enter a valid 10-digit alternate mobile number.';
    }
  }

  if (input.age.trim()) {
    const parsedAge = Number(input.age);
    if (!Number.isFinite(parsedAge) || parsedAge < 18 || parsedAge > 99) {
      errors.age = 'Age must be between 18 and 99.';
    }
  }

  if (!input.location.trim() || input.location.trim().length < 2) {
    errors.location = 'Please select or enter a Pune area / location.';
  }

  const rentVal = Number(input.rent);
  if (!input.rent.trim() || !Number.isFinite(rentVal) || rentVal < 500 || rentVal > 250000) {
    errors.rent = 'Enter monthly rent per person between ₹500 and ₹2,50,000.';
  }

  if (input.deposit.trim()) {
    const depVal = Number(input.deposit);
    if (!Number.isFinite(depVal) || depVal < 0 || depVal > 2000000) {
      errors.deposit = 'Enter a valid security deposit amount (0 or higher).';
    }
  }

  if (input.brokerage.trim()) {
    const brokVal = Number(input.brokerage);
    if (!Number.isFinite(brokVal) || brokVal < 0 || brokVal > 500000) {
      errors.brokerage = 'Enter a valid brokerage amount (0 if none).';
    }
  }

  if (!input.availableFrom.trim()) {
    errors.availableFrom = 'Please choose a joining / available date.';
  }

  const existingCount = Number(input.existingRoommates || '0');
  if (!Number.isFinite(existingCount) || existingCount < 0 || existingCount > 20) {
    errors.existingRoommates = 'Enter existing roommates between 0 and 20.';
  }

  const neededCount = Number(input.peopleRequired);
  if (!Number.isFinite(neededCount) || neededCount < 1 || neededCount > 10) {
    errors.peopleRequired = 'People required must be between 1 and 10.';
  }

  if (input.description.trim().length > 2000) {
    errors.description = 'Description must be 2,000 characters or fewer.';
  }

  return errors;
}

/**
 * Click-to-WhatsApp link using WithBroker's business WhatsApp number (9834626078)
 * with exact pre-filled message format containing the Listing ID.
 */
export function buildRoommateWhatsAppUrl(
  listing: Pick<PublicRoommateListing | RoommateListingRecord, 'listingCode'>
): string {
  const message = `Hi, I found your roommate listing on WithBroker. I am interested in Listing ID ${listing.listingCode}. Please share more details.`;
  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(message)}`;
}

/**
 * Optional direct owner WhatsApp link (ONLY used if the listing owner explicitly opted into showPublicContact).
 */
export function buildDirectRoommateWhatsAppUrl(
  listing: Pick<PublicRoommateListing, 'listingCode' | 'publicWhatsappNumber' | 'showPublicContact'>
): string | null {
  if (!listing.showPublicContact || !listing.publicWhatsappNumber) return null;
  const digits = normalizeIndianPhone10(listing.publicWhatsappNumber);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  const message = `Hi, I saw your roommate listing (${listing.listingCode}) on WithBroker. Is it still available?`;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Admin-only WhatsApp link to contact the person who posted the roommate listing.
 */
export function buildRoommateAdminContactUrl(
  record: Pick<RoommateListingRecord, 'listingCode' | 'name' | 'whatsappNumber' | 'contactNumber' | 'location'>
): string {
  const digits = normalizeIndianPhone10(record.whatsappNumber || record.contactNumber);
  const target = /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : WHATSAPP_NUMBER_DIGITS;
  const message = `Hello ${record.name}, this is WithBroker Admin regarding your roommate listing ${record.listingCode} (${record.location}).`;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

export function getRoommateDirectUrl(baseUrl: string, listingCode: string): string {
  const cleanCode = encodeURIComponent(listingCode.trim());
  try {
    const parsed = new URL(baseUrl);
    return `${parsed.origin}/roommate/${cleanCode}`;
  } catch {
    const cleanBase = baseUrl.split('#')[0].split('?')[0].replace(/\/+$/, '');
    return `${cleanBase}/roommate/${cleanCode}`;
  }
}

/**
 * Always produces the canonical live Vercel direct roommate listing share URL:
 * https://withbroker.vercel.app/roommate/<listingCode>
 */
export function getPublicRoommateShareUrl(listingCode: string): string {
  return getRoommateDirectUrl(WEBSITE_URL, listingCode);
}

/**
 * Shareable Telegram/WhatsApp-style vacancy post with direct listing link on WithBroker.
 */
export function buildRoommateShareText(
  listing: Pick<
    PublicRoommateListing,
    | 'listingCode'
    | 'listingType'
    | 'flatOccupancy'
    | 'roomType'
    | 'location'
    | 'publicBuildingName'
    | 'rent'
    | 'deposit'
    | 'electricityBill'
    | 'facilities'
    | 'urgent'
    | 'shiftingNow'
    | 'preferredGender'
    | 'furnishing'
    | 'peopleRequired'
    | 'availableFrom'
    | 'showPublicContact'
    | 'publicWhatsappNumber'
    | 'publicSecondaryContact'
  >,
  listingUrl?: string
): string {
  const genderHeading =
    listing.preferredGender === 'Any'
      ? 'ROOMMATE'
      : `${listing.preferredGender.toUpperCase()} ROOMMATE`;
  const count = Math.max(1, listing.peopleRequired || 1);
  const headline = `🏠 ${count} ${genderHeading}${count > 1 ? 'S' : ''} REQUIRED${listing.urgent ? ' Urgently' : ''}`;
  const fullLoc = [listing.publicBuildingName, listing.location]
    .filter(Boolean)
    .join(', ');
  const occupancy = listing.flatOccupancy || 'Pre-Occupied Flat';
  const directUrl = listingUrl?.trim() || getPublicRoommateShareUrl(listing.listingCode);

  const lines: string[] = [
    headline,
    '',
    `📍 Location: ${fullLoc}`,
    `🏡 Flat Type: ${listing.roomType} (${occupancy} · ${listing.furnishing})`,
    '',
    '💰 Rent & Deposit Per Person:',
    `🔹 Monthly Rent: ${formatINR(listing.rent)}`,
    `🔹 Deposit: ${listing.deposit > 0 ? formatINR(listing.deposit) : 'No / Negotiable'}`,
  ];

  if (listing.electricityBill) {
    lines.push(`🔹 Electricity Bill: ${listing.electricityBill}`);
  }

  if (listing.facilities && listing.facilities.length > 0) {
    lines.push('', '✨ Facilities:');
    for (const fac of listing.facilities) {
      lines.push(`✅ ${fac}`);
    }
  }

  lines.push('', `📅 Joining: ${formatRoommateDate(listing.availableFrom)}`);
  if (listing.shiftingNow) {
    lines.push('🚀 Available for shifting now');
  }

  lines.push('');
  if (listing.showPublicContact && listing.publicWhatsappNumber) {
    const contacts = [listing.publicWhatsappNumber, listing.publicSecondaryContact]
      .filter(Boolean)
      .join(' / ');
    lines.push(`📞 Interested? ${contacts}`);
  } else {
    lines.push(`📞 Interested? Listing ID: ${listing.listingCode}`);
  }

  lines.push(
    '',
    'View on WithBroker:',
    directUrl,
    '',
    `👥 Join ${WHATSAPP_COMMUNITY_NAME} (WhatsApp Group):`,
    WHATSAPP_COMMUNITY_URL,
    '',
    'WITHBROKER — RENT • SEARCH • CONNECT'
  );

  return lines.join('\n');
}

export function buildRoommateShareWhatsAppUrl(
  listing: Parameters<typeof buildRoommateShareText>[0],
  listingUrl?: string
): string {
  return `https://wa.me/?text=${encodeURIComponent(buildRoommateShareText(listing, listingUrl))}`;
}

export function formatRoommateDate(dateStr: string): string {
  if (!dateStr) return 'Immediate';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Prevents duplicate / spam submissions by checking if the same user already has
 * an active/pending listing with identical listingType, roomType, location, and rent.
 */
export function detectDuplicateRoommateSubmission(
  input: Pick<RoommateSubmissionInput, 'listingType' | 'roomType' | 'location' | 'rent'>,
  userExistingListings: Array<
    Pick<RoommateListingRecord, 'listingCode' | 'listingType' | 'roomType' | 'location' | 'rent' | 'status'>
  >,
  editingListingCode?: string | null
): string | null {
  const targetLoc = input.location.trim().toLowerCase();
  const targetRent = Math.round(Number(input.rent || 0));

  const duplicate = userExistingListings.find((existing) => {
    if (editingListingCode && existing.listingCode === editingListingCode) {
      return false;
    }
    if (existing.status !== 'Pending' && existing.status !== 'Active') {
      return false;
    }
    return (
      existing.listingType === input.listingType &&
      existing.roomType === input.roomType &&
      existing.location.trim().toLowerCase() === targetLoc &&
      Math.round(existing.rent) === targetRent
    );
  });

  return duplicate ? duplicate.listingCode : null;
}

/**
 * Builds the sanitized public roommate payload from a private master record.
 * Strictly hides private phone numbers & exact building name unless opted in.
 */
export function sanitizeRoommateForPublic(
  record: Pick<
    RoommateListingRecord,
    | 'listingCode'
    | 'userId'
    | 'listingType'
    | 'flatOccupancy'
    | 'electricityBill'
    | 'facilities'
    | 'urgent'
    | 'shiftingNow'
    | 'name'
    | 'whatsappNumber'
    | 'secondaryContact'
    | 'gender'
    | 'age'
    | 'occupation'
    | 'roomType'
    | 'location'
    | 'localitySlug'
    | 'buildingName'
    | 'showExactAddress'
    | 'showPublicContact'
    | 'rent'
    | 'deposit'
    | 'brokerage'
    | 'furnishing'
    | 'availableFrom'
    | 'existingRoommates'
    | 'peopleRequired'
    | 'preferredGender'
    | 'preferredOccupation'
    | 'preferredAgeRange'
    | 'foodPreference'
    | 'smokingPreference'
    | 'description'
    | 'images'
  >
): Omit<PublicRoommateListing, 'id' | 'createdAt' | 'approvedAt' | 'updatedAt' | 'expiresAt'> {
  return {
    listingCode: record.listingCode,
    userId: record.userId,
    listingType: record.listingType,
    flatOccupancy: record.flatOccupancy || 'Pre-Occupied Flat',
    electricityBill: record.electricityBill ?? null,
    facilities: Array.isArray(record.facilities) ? record.facilities.slice(0, 15) : [],
    urgent: Boolean(record.urgent),
    shiftingNow: Boolean(record.shiftingNow),
    posterFirstName: extractPosterFirstName(record.name),
    gender: record.gender,
    age: record.age ?? null,
    occupation: record.occupation,
    roomType: record.roomType,
    location: record.location,
    localitySlug: record.localitySlug,
    publicBuildingName:
      record.showExactAddress && record.buildingName ? record.buildingName : null,
    showExactAddress: Boolean(record.showExactAddress),
    showPublicContact: Boolean(record.showPublicContact),
    publicWhatsappNumber:
      record.showPublicContact && record.whatsappNumber
        ? normalizeIndianPhone10(record.whatsappNumber)
        : null,
    publicSecondaryContact:
      record.showPublicContact && record.secondaryContact
        ? normalizeIndianPhone10(record.secondaryContact)
        : null,
    rent: record.rent,
    deposit: record.deposit,
    brokerage: record.brokerage,
    furnishing: record.furnishing,
    availableFrom: record.availableFrom,
    existingRoommates: record.existingRoommates,
    peopleRequired: record.peopleRequired,
    preferredGender: record.preferredGender,
    preferredOccupation: record.preferredOccupation,
    preferredAgeRange: record.preferredAgeRange ?? null,
    foodPreference: record.foodPreference ?? null,
    smokingPreference: record.smokingPreference ?? null,
    description: record.description,
    images: record.images,
    status: 'Active',
  };
}

/**
 * Computes all requested Admin Roommate Management KPI statistics.
 */
export function computeRoommateStats(
  listings: RoommateListingRecord[],
  reports: RoommateReportRecord[] = [],
  now: Date = new Date()
): RoommateDashboardStats {
  const activeList = listings.filter(
    (l) => l.status === 'Active' && !isRoommateListingExpired(l, now)
  );
  return {
    total: listings.length,
    pending: listings.filter((l) => l.status === 'Pending').length,
    active: activeList.length,
    maleRequirements: listings.filter((l) => l.preferredGender === 'Male').length,
    femaleRequirements: listings.filter((l) => l.preferredGender === 'Female').length,
    roomsAvailable: activeList.filter((l) => l.listingType === 'have_room').length,
    fulfilled: listings.filter((l) => l.status === 'Fulfilled').length,
    unavailable: listings.filter((l) => l.status === 'Unavailable').length,
    rejected: listings.filter((l) => l.status === 'Rejected').length,
    openReports: reports.filter((r) => r.status === 'open').length,
  };
}

/**
 * Enforces client-side ownership check mirroring Firestore security rules.
 */
export function canUserManageRoommateListing(
  listing: Pick<RoommateListingRecord, 'userId'>,
  currentUid: string | null | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!currentUid) return false;
  return listing.userId === currentUid;
}
