import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  PublicRoommateListing,
  RoommateListingRecord,
  RoommateReportRecord,
  RoommateSubmissionInput,
} from '../types/roommate';
import {
  INITIAL_ROOMMATE_FILTERS,
  buildDirectRoommateWhatsAppUrl,
  buildRoommateAdminContactUrl,
  buildRoommateShareText,
  buildRoommateWhatsAppUrl,
  canUserManageRoommateListing,
  computeRoommateStats,
  detectDuplicateRoommateSubmission,
  filterAndSortRoommates,
  generateAutoRoommateDescription,
  getActivePublicRoommates,
  getPublicRoommateShareUrl,
  getRoommateDirectUrl,
  isRoommateListingExpired,
  sanitizeRoommateForPublic,
  validateRoommateSubmission,
} from './roommateLogic';

const NOW = new Date('2026-11-27T12:00:00.000Z');
const FUTURE_ISO = '2026-12-27T12:00:00.000Z';
const PAST_ISO = '2026-11-01T12:00:00.000Z';

function makePublicListing(
  overrides: Partial<PublicRoommateListing> = {}
): PublicRoommateListing {
  return {
    id: 'WB-RM-1001',
    listingCode: 'WB-RM-1001',
    userId: 'user-owner-1',
    listingType: 'have_room',
    posterFirstName: 'Aarav',
    gender: 'Male',
    age: 26,
    occupation: 'Working Professional',
    roomType: '2BHK Sharing',
    location: 'Wadgaon Sheri',
    localitySlug: 'wadgaon-sheri',
    publicBuildingName: null,
    showExactAddress: false,
    showPublicContact: false,
    publicWhatsappNumber: null,
    rent: 9500,
    deposit: 20000,
    brokerage: 0,
    furnishing: 'Semi-Furnished',
    availableFrom: '2026-12-01',
    existingRoommates: 1,
    peopleRequired: 1,
    preferredGender: 'Male',
    preferredOccupation: 'Working Professional',
    preferredAgeRange: '22-30',
    foodPreference: 'Any',
    smokingPreference: 'Non-Smoker',
    description: 'Clean sunlit master room available in a quiet gated society near Wadgaon Sheri.',
    images: [],
    status: 'Active',
    createdAt: '2026-11-25T10:00:00.000Z',
    approvedAt: '2026-11-25T11:00:00.000Z',
    updatedAt: '2026-11-25T11:00:00.000Z',
    expiresAt: FUTURE_ISO,
    ...overrides,
  };
}

function makeMasterRecord(
  overrides: Partial<RoommateListingRecord> = {}
): RoommateListingRecord {
  return {
    id: 'WB-RM-1001',
    listingCode: 'WB-RM-1001',
    userId: 'user-owner-1',
    listingType: 'have_room',
    name: 'Aarav Kulkarni',
    contactNumber: '9876543210',
    whatsappNumber: '9876543210',
    gender: 'Male',
    age: 26,
    occupation: 'Working Professional',
    roomType: '2BHK Sharing',
    location: 'Wadgaon Sheri',
    localitySlug: 'wadgaon-sheri',
    buildingName: 'Satyam Serenity Flat 402',
    showExactAddress: false,
    showPublicContact: false,
    rent: 9500,
    deposit: 20000,
    brokerage: 0,
    furnishing: 'Semi-Furnished',
    availableFrom: '2026-12-01',
    existingRoommates: 1,
    peopleRequired: 1,
    preferredGender: 'Male',
    preferredOccupation: 'Working Professional',
    preferredAgeRange: '22-30',
    foodPreference: 'Any',
    smokingPreference: 'Non-Smoker',
    description: 'Clean sunlit master room available in a quiet gated society near Wadgaon Sheri.',
    images: [],
    status: 'Active',
    rejectionReason: null,
    reportCount: 0,
    createdAt: '2026-11-25T10:00:00.000Z',
    approvedAt: '2026-11-25T11:00:00.000Z',
    updatedAt: '2026-11-25T11:00:00.000Z',
    expiresAt: FUTURE_ISO,
    ...overrides,
  };
}

test('validateRoommateSubmission validates Telegram-style vacancy inputs including optional secondaryContact and auto-description', () => {
  const validInput: RoommateSubmissionInput = {
    listingType: 'have_room',
    flatOccupancy: 'Pre-Occupied Flat',
    electricityBill: 'Shared separately',
    facilities: ['Parking Available', 'Peaceful Society Surroundings'],
    urgent: true,
    shiftingNow: true,
    name: '',
    contactNumber: '8262037529',
    whatsappNumber: '8262037529',
    secondaryContact: '8767679125',
    gender: 'Male',
    age: '',
    occupation: 'Working Professional',
    roomType: '1BHK',
    location: 'Karve Nagar',
    buildingName: 'Lane No. 8, Canal Road',
    showExactAddress: true,
    showPublicContact: true,
    rent: '2900',
    deposit: '7200',
    brokerage: '0',
    furnishing: 'Semi-Furnished',
    availableFrom: '2026-12-01',
    existingRoommates: '1',
    peopleRequired: '1',
    preferredGender: 'Male',
    preferredOccupation: 'Any',
    preferredAgeRange: '',
    foodPreference: 'Any',
    smokingPreference: 'Any',
    description: '',
  };

  // Blank name and blank description are allowed (auto-filled cleanly)
  assert.deepEqual(validateRoommateSubmission(validInput), {});

  const autoDesc = generateAutoRoommateDescription(validInput);
  assert.ok(autoDesc.includes('1 Male roommate required urgently'));
  assert.ok(autoDesc.includes('Karve Nagar'));
  assert.ok(autoDesc.includes('Parking Available'));
  assert.ok(autoDesc.includes('Shared separately'));

  const invalidErrors = validateRoommateSubmission({
    ...validInput,
    name: 'A',
    contactNumber: '12345',
    secondaryContact: '999',
    rent: '100',
    peopleRequired: '0',
  });
  assert.ok(invalidErrors.name);
  assert.ok(invalidErrors.contactNumber);
  assert.ok(invalidErrors.secondaryContact);
  assert.ok(invalidErrors.rent);
  assert.ok(invalidErrors.peopleRequired);
});

test('sanitizeRoommateForPublic hides personal phones and exact building name by default unless consented', () => {
  const privateRec = makeMasterRecord({
    flatOccupancy: 'New Flat',
    electricityBill: 'Shared separately',
    facilities: ['Parking Available'],
    urgent: true,
    shiftingNow: true,
    secondaryContact: '8767679125',
    showExactAddress: false,
    showPublicContact: false,
  });
  const sanitizedDefault = sanitizeRoommateForPublic(privateRec);
  assert.equal(sanitizedDefault.posterFirstName, 'Aarav');
  assert.equal(sanitizedDefault.publicBuildingName, null);
  assert.equal(sanitizedDefault.publicWhatsappNumber, null);
  assert.equal(sanitizedDefault.publicSecondaryContact, null);
  assert.equal(sanitizedDefault.flatOccupancy, 'New Flat');
  assert.equal(sanitizedDefault.urgent, true);
  assert.equal(sanitizedDefault.shiftingNow, true);

  const consentedRec = makeMasterRecord({
    secondaryContact: '8767679125',
    showExactAddress: true,
    showPublicContact: true,
  });
  const sanitizedConsented = sanitizeRoommateForPublic(consentedRec);
  assert.equal(sanitizedConsented.publicBuildingName, 'Satyam Serenity Flat 402');
  assert.equal(sanitizedConsented.publicWhatsappNumber, '9876543210');
  assert.equal(sanitizedConsented.publicSecondaryContact, '8767679125');
});

test('expired listings automatically disappear from active search results', () => {
  const activeItem = makePublicListing({ listingCode: 'WB-RM-1001', expiresAt: FUTURE_ISO });
  const expiredItem = makePublicListing({ listingCode: 'WB-RM-1002', expiresAt: PAST_ISO });

  assert.equal(isRoommateListingExpired(activeItem, NOW), false);
  assert.equal(isRoommateListingExpired(expiredItem, NOW), true);

  const visible = getActivePublicRoommates([activeItem, expiredItem], NOW);
  assert.deepEqual(
    visible.map((v) => v.listingCode),
    ['WB-RM-1001']
  );
});

test('filterAndSortRoommates filters by location, gender, roomType, budget, occupation, furnishing, date, listingType, and sorts accurately', () => {
  const items: PublicRoommateListing[] = [
    makePublicListing({
      listingCode: 'WB-RM-2001',
      listingType: 'have_room',
      location: 'Wadgaon Sheri',
      localitySlug: 'wadgaon-sheri',
      roomType: '2BHK Sharing',
      rent: 9500,
      preferredGender: 'Male',
      preferredOccupation: 'Working Professional',
      furnishing: 'Semi-Furnished',
      availableFrom: '2026-12-01',
      approvedAt: '2026-11-24T10:00:00.000Z',
    }),
    makePublicListing({
      listingCode: 'WB-RM-2002',
      listingType: 'need_room',
      location: 'Viman Nagar',
      localitySlug: 'viman-nagar',
      roomType: 'Independent Room',
      rent: 14000,
      preferredGender: 'Female',
      preferredOccupation: 'Student',
      occupation: 'Student',
      furnishing: 'Furnished',
      availableFrom: '2026-12-10',
      approvedAt: '2026-11-26T10:00:00.000Z',
    }),
    makePublicListing({
      listingCode: 'WB-RM-2003',
      listingType: 'have_room',
      location: 'Kharadi',
      localitySlug: 'kharadi',
      roomType: 'Hall / Living Room Space',
      rent: 5500,
      preferredGender: 'Any',
      preferredOccupation: 'Any',
      furnishing: 'Unfurnished',
      availableFrom: '2026-11-28',
      approvedAt: '2026-11-25T10:00:00.000Z',
    }),
  ];

  // Filter by Female + Viman Nagar + need_room
  const femaleNeed = filterAndSortRoommates(
    items,
    {
      ...INITIAL_ROOMMATE_FILTERS,
      listingType: 'need_room',
      location: 'Viman Nagar',
      preferredGender: 'Female',
      roomType: 'Independent Room',
    },
    NOW
  );
  assert.deepEqual(
    femaleNeed.map((i) => i.listingCode),
    ['WB-RM-2002']
  );

  // Budget range + Hall space
  const budgetHall = filterAndSortRoommates(
    items,
    {
      ...INITIAL_ROOMMATE_FILTERS,
      roomType: 'Hall / Living Room Space',
      minBudget: 4000,
      maxBudget: 7000,
    },
    NOW
  );
  assert.deepEqual(
    budgetHall.map((i) => i.listingCode),
    ['WB-RM-2003']
  );

  // Sorting: Lowest Rent, Highest Rent, Recently Posted
  const lowToHigh = filterAndSortRoommates(
    items,
    { ...INITIAL_ROOMMATE_FILTERS, sortBy: 'rent-asc' },
    NOW
  );
  assert.deepEqual(
    lowToHigh.map((i) => i.listingCode),
    ['WB-RM-2003', 'WB-RM-2001', 'WB-RM-2002']
  );

  const highToLow = filterAndSortRoommates(
    items,
    { ...INITIAL_ROOMMATE_FILTERS, sortBy: 'rent-desc' },
    NOW
  );
  assert.deepEqual(
    highToLow.map((i) => i.listingCode),
    ['WB-RM-2002', 'WB-RM-2001', 'WB-RM-2003']
  );

  const recent = filterAndSortRoommates(
    items,
    { ...INITIAL_ROOMMATE_FILTERS, sortBy: 'recent' },
    NOW
  );
  assert.deepEqual(
    recent.map((i) => i.listingCode),
    ['WB-RM-2002', 'WB-RM-2003', 'WB-RM-2001']
  );
});

test('buildRoommateWhatsAppUrl targets 9834626078 with exact pre-filled Listing ID message', () => {
  const url = buildRoommateWhatsAppUrl({ listingCode: 'WB-RM-1001' });
  assert.ok(url.startsWith('https://wa.me/919834626078?text='));
  const decoded = decodeURIComponent(url.split('?text=')[1]);
  assert.equal(
    decoded,
    'Hi, I found your roommate listing on WithBroker. I am interested in Listing ID WB-RM-1001. Please share more details.'
  );

  // Direct owner WhatsApp returns null when not consented
  assert.equal(
    buildDirectRoommateWhatsAppUrl({
      listingCode: 'WB-RM-1001',
      showPublicContact: false,
      publicWhatsappNumber: null,
    }),
    null
  );

  const adminUrl = buildRoommateAdminContactUrl(makeMasterRecord());
  assert.ok(adminUrl.startsWith('https://wa.me/919876543210?text='));

  const shareText = buildRoommateShareText(
    makePublicListing({
      flatOccupancy: 'Pre-Occupied Flat',
      roomType: '1BHK',
      location: 'Karve Nagar',
      publicBuildingName: 'Lane No. 8, Canal Road',
      rent: 2900,
      deposit: 7200,
      electricityBill: 'Shared separately',
      facilities: ['Parking Available', 'Peaceful Society Surroundings'],
      urgent: true,
      shiftingNow: true,
    })
  );
  assert.equal(
    getRoommateDirectUrl('https://withbroker.vercel.app/', 'WB-RM-1001'),
    'https://withbroker.vercel.app/roommate/WB-RM-1001'
  );
  assert.equal(
    getPublicRoommateShareUrl('WB-RM-1001'),
    'https://withbroker.vercel.app/roommate/WB-RM-1001'
  );
  assert.ok(shareText.includes('1 MALE ROOMMATE REQUIRED Urgently'));
  assert.ok(shareText.includes('Karve Nagar'));
  assert.ok(shareText.includes('Shared separately'));
  assert.ok(shareText.includes('Parking Available'));
  assert.ok(shareText.includes('Available for shifting now'));
  assert.ok(shareText.includes('WB-RM-1001'));
  assert.ok(shareText.includes('View on WithBroker:\nhttps://withbroker.vercel.app/roommate/WB-RM-1001'));
  assert.equal(shareText.includes('withbroker.vercel.app//'), false);
});

test('filterAndSortRoommates filters accurately by Pre-Occupied Flat vs New Flat', () => {
  const preOccupied = makePublicListing({
    listingCode: 'WB-RM-PRE',
    flatOccupancy: 'Pre-Occupied Flat',
    preferredGender: 'Male',
  });
  const newFlat = makePublicListing({
    listingCode: 'WB-RM-NEW',
    flatOccupancy: 'New Flat',
    preferredGender: 'Female',
  });

  const onlyNew = filterAndSortRoommates(
    [preOccupied, newFlat],
    { ...INITIAL_ROOMMATE_FILTERS, flatOccupancy: 'New Flat' },
    NOW
  );
  assert.deepEqual(
    onlyNew.map((i) => i.listingCode),
    ['WB-RM-NEW']
  );

  const onlyPreOccupied = filterAndSortRoommates(
    [preOccupied, newFlat],
    { ...INITIAL_ROOMMATE_FILTERS, flatOccupancy: 'Pre-Occupied Flat' },
    NOW
  );
  assert.deepEqual(
    onlyPreOccupied.map((i) => i.listingCode),
    ['WB-RM-PRE']
  );
});

test('detectDuplicateRoommateSubmission blocks duplicate pending/active submissions from same user', () => {
  const existing = [
    makeMasterRecord({
      listingCode: 'WB-RM-3001',
      listingType: 'have_room',
      roomType: '2BHK Sharing',
      location: 'Wadgaon Sheri',
      rent: 9500,
      status: 'Pending',
    }),
  ];

  const dupCode = detectDuplicateRoommateSubmission(
    {
      listingType: 'have_room',
      roomType: '2BHK Sharing',
      location: 'wadgaon sheri',
      rent: '9500',
    },
    existing
  );
  assert.equal(dupCode, 'WB-RM-3001');

  // Editing the same listing should NOT flag itself as a duplicate
  const selfEditCheck = detectDuplicateRoommateSubmission(
    {
      listingType: 'have_room',
      roomType: '2BHK Sharing',
      location: 'Wadgaon Sheri',
      rent: '9500',
    },
    existing,
    'WB-RM-3001'
  );
  assert.equal(selfEditCheck, null);
});

test('computeRoommateStats calculates all Admin KPIs and ownership guard rejects unauthorised users', () => {
  const listings: RoommateListingRecord[] = [
    makeMasterRecord({ listingCode: 'WB-RM-1', status: 'Pending', preferredGender: 'Male' }),
    makeMasterRecord({
      listingCode: 'WB-RM-2',
      status: 'Active',
      listingType: 'have_room',
      preferredGender: 'Female',
      expiresAt: FUTURE_ISO,
    }),
    makeMasterRecord({
      listingCode: 'WB-RM-3',
      status: 'Fulfilled',
      listingType: 'need_room',
      preferredGender: 'Female',
    }),
    makeMasterRecord({
      listingCode: 'WB-RM-4',
      status: 'Active',
      listingType: 'have_room',
      preferredGender: 'Male',
      expiresAt: PAST_ISO, // Expired should not count as active
    }),
  ];

  const reports: RoommateReportRecord[] = [
    {
      id: 'rep-1',
      listingCode: 'WB-RM-2',
      reason: 'Fake listing',
      details: 'Suspicious details',
      reporterUid: null,
      status: 'open',
      createdAt: NOW.toISOString(),
    },
  ];

  const stats = computeRoommateStats(listings, reports, NOW);
  assert.equal(stats.total, 4);
  assert.equal(stats.pending, 1);
  assert.equal(stats.active, 1);
  assert.equal(stats.maleRequirements, 2);
  assert.equal(stats.femaleRequirements, 2);
  assert.equal(stats.roomsAvailable, 1);
  assert.equal(stats.fulfilled, 1);
  assert.equal(stats.openReports, 1);

  // Ownership check: owner and admin allowed, other users and guests blocked
  assert.equal(canUserManageRoommateListing({ userId: 'uid-alice' }, 'uid-alice', false), true);
  assert.equal(canUserManageRoommateListing({ userId: 'uid-alice' }, 'uid-bob', false), false);
  assert.equal(canUserManageRoommateListing({ userId: 'uid-alice' }, null, false), false);
  assert.equal(canUserManageRoommateListing({ userId: 'uid-alice' }, 'uid-admin', true), true);
});
