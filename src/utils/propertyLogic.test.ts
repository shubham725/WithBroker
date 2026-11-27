import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCALITIES,
  SAMPLE_PROPERTIES,
  WEBSITE_URL,
  WHATSAPP_COMMUNITY_NAME,
  WHATSAPP_COMMUNITY_URL,
} from '../data/properties';
import {
  buildDynamicLocalities,
  buildEmailSharePostUrl,
  buildOwnerContactWhatsAppUrl,
  buildPropertyShareText,
  buildPropertySubmissionWhatsAppUrl,
  buildSmsSharePostUrl,
  buildTelegramSharePostUrl,
  buildWhatsAppInquiryUrl,
  buildWhatsAppPropertyShareText,
  filterProperties,
  formatBrokerageLabel,
  formatDepositLabel,
  formatINR,
  generateAutoPropertyDescription,
  getActiveListings,
  getLocalityListingCount,
  getOwnerSubmissionShareUrl,
  getPropertyDirectUrl,
  getPublicPropertyShareUrl,
  inferAreaMeta,
  isPropertyRentedOut,
  validateSubmissionForm,
} from './propertyLogic';
import {
  injectPropertyOgIntoHtml,
  injectRoommateOgIntoHtml,
  type OgPropertyData,
  type OgRoommateData,
} from '../lib/propertyOg';
import { BASELINE_ROOMMATE_LISTINGS } from '../data/roommates';
import { PropertySubmissionInput } from '../types/property';

test('getActiveListings excludes rented or inactive properties', () => {
  const active = getActiveListings(SAMPLE_PROPERTIES);
  assert.equal(active.some((p) => p.listingStatus !== 'active'), false);
  assert.equal(active.length, 9);
});

test('filterProperties filters by locality, type, min/max rent, source, and availability accurately', () => {
  const wadgaon = filterProperties(SAMPLE_PROPERTIES, {
    location: 'wadgaon-sheri',
    propertyType: 'all',
    maxRent: null,
  });
  assert.equal(wadgaon.length, 6);

  const range15to25 = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: 'all',
    minRent: 15000,
    maxRent: 25000,
  });
  assert.ok(range15to25.every((p) => p.monthlyRent >= 15000 && p.monthlyRent <= 25000));
  assert.equal(range15to25.length, 5);

  const ownerOnlyAvailable = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: 'all',
    maxRent: null,
    submitterRole: 'Owner',
    onlyAvailable: true,
  });
  assert.deepEqual(
    ownerOnlyAvailable.map((p) => p.propertyCode),
    ['WB-1003', 'WB-1009']
  );

  const nearby1rk = filterProperties(SAMPLE_PROPERTIES, {
    location: 'other',
    propertyType: '1RK',
    maxRent: 10000,
  });
  assert.equal(nearby1rk.length, 2);
  assert.deepEqual(
    nearby1rk.map((p) => p.id),
    ['wb-flat-7', 'wb-flat-4']
  );

  const sortedAsc = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: 'all',
    maxRent: null,
    sortBy: 'rent-asc',
  });
  assert.deepEqual(
    sortedAsc.map((p) => p.monthlyRent),
    [10000, 12000, 15500, 20000, 21000, 25000, 25000, 30000, 9000]
  );
  assert.equal(sortedAsc[sortedAsc.length - 1].id, 'wb-flat-4');

  const sortedDesc = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: 'all',
    maxRent: null,
    sortBy: 'rent-desc',
  });
  assert.deepEqual(
    sortedDesc.map((p) => p.monthlyRent),
    [30000, 25000, 25000, 21000, 20000, 15500, 12000, 10000, 9000]
  );
});

test('getLocalityListingCount calculates real available counts excluding rented-out flats', () => {
  const counts = LOCALITIES.map((loc) => ({
    slug: loc.slug,
    count: getLocalityListingCount(SAMPLE_PROPERTIES, loc),
  }));
  assert.deepEqual(counts, [
    { slug: 'wadgaon-sheri', count: 6 },
    { slug: 'viman-nagar', count: 0 },
    { slug: 'somnath-nagar', count: 0 },
    { slug: 'other', count: 2 },
  ]);
});

test('wb-flat-4 is marked Rented Out and generates similar-flats WhatsApp inquiry with Property ID', () => {
  const flat4 = SAMPLE_PROPERTIES.find((p) => p.id === 'wb-flat-4');
  assert.ok(flat4);
  assert.equal(flat4.availabilityLabel, 'Rented Out');
  assert.equal(isPropertyRentedOut(flat4), true);

  const waUrl = buildWhatsAppInquiryUrl(flat4, 'https://withbroker.vercel.app/?flat=WB-1004#flats');
  const decoded = decodeURIComponent(waUrl.split('?text=')[1]);
  assert.ok(decoded.includes('Property ID: WB-1004'));
  assert.ok(decoded.includes('marked as Rented Out'));
  assert.ok(decoded.includes('similar available 1RK options'));
});

test('formatINR, formatDepositLabel, and formatBrokerageLabel format rental terms properly', () => {
  assert.equal(formatINR(12000), '₹12,000');
  assert.equal(formatINR(125000), '₹1,25,000');
  assert.equal(formatDepositLabel(null), 'On Inquiry');
  assert.equal(formatDepositLabel(20000), '₹20,000');
  assert.equal(formatBrokerageLabel(SAMPLE_PROPERTIES[0]), 'Applicable');
});

test('buildWhatsAppInquiryUrl encodes Property ID and details to 919834626078', () => {
  const prop = SAMPLE_PROPERTIES[1];
  const url = buildWhatsAppInquiryUrl(prop, 'https://withbroker.example/?flat=WB-1002');
  assert.ok(url.startsWith('https://wa.me/919834626078?text='));
  const decoded = decodeURIComponent(url.split('?text=')[1]);
  assert.ok(decoded.includes('Property ID: WB-1002'));
  assert.ok(decoded.includes('1BHK Flat Near Wadgaon Sheri Post Office'));
  assert.ok(decoded.includes('₹12,000'));
  assert.ok(decoded.includes('₹20,000'));
});

test('buildOwnerContactWhatsAppUrl builds direct admin-to-owner WhatsApp link', () => {
  const url = buildOwnerContactWhatsAppUrl({
    ownerPhone: '9823012345',
    ownerName: 'Rohan Kulkarni',
    propertyCode: 'WB-1010',
    title: '2BHK Flat in Viman Nagar',
    status: 'Pending',
  });
  assert.ok(url.startsWith('https://wa.me/919823012345?text='));
  const decoded = decodeURIComponent(url.split('?text=')[1]);
  assert.ok(decoded.includes('Hello Rohan Kulkarni'));
  assert.ok(decoded.includes('Property ID: WB-1010'));
});

test('buildPropertyShareText includes Property ID, direct flat link, group name, and group link', () => {
  const prop = SAMPLE_PROPERTIES[0];
  const propUrl = 'https://withbroker.vercel.app/property/WB-1001';
  const ad = buildPropertyShareText(prop, propUrl);
  assert.ok(ad.includes('🆔 Property ID: WB-1001'));
  assert.ok(ad.includes(`🔗 View Flat on WithBroker: ${propUrl}`));
  assert.ok(ad.includes(`👥 WhatsApp Group — ${WHATSAPP_COMMUNITY_NAME}:`));
  assert.ok(ad.includes(WHATSAPP_COMMUNITY_URL));
  assert.equal(ad.includes('withbroker.vercel.app//'), false);
  assert.ok(ad.includes('WITHBROKER • RENT • SEARCH • CONNECT'));

  // Default call without explicit URL also embeds the canonical per-flat deep link
  const adDefault = buildPropertyShareText(prop);
  assert.ok(adDefault.includes('https://withbroker.vercel.app/property/WB-1001'));

  assert.ok(buildTelegramSharePostUrl(ad, propUrl).startsWith('https://t.me/share/url?url='));
  assert.ok(buildSmsSharePostUrl(ad).startsWith('sms:?&body='));
  assert.ok(buildEmailSharePostUrl(prop, ad).startsWith('mailto:?subject='));
});

test('validateSubmissionForm validates all owner/broker & property fields thoroughly', () => {
  const invalid: PropertySubmissionInput = {
    name: '',
    mobile: '12345',
    whatsapp: '555',
    submitterRole: 'Owner',
    propertyType: '',
    location: '',
    societyName: '',
    monthlyRent: '0',
    securityDeposit: '-5',
    brokerageAmount: '-100',
    furnishingStatus: 'Unfurnished',
    availableFrom: '',
    bathrooms: '0',
    balconies: '-1',
    floorNumber: '',
    totalFloors: '',
    carpetArea: '',
    description: 'short',
    facilities: [],
    photoNames: [],
  };
  const errors = validateSubmissionForm(invalid);
  assert.ok(errors.name);
  assert.ok(errors.mobile);
  assert.ok(errors.whatsapp);
  assert.ok(errors.propertyType);
  assert.ok(errors.location);
  assert.ok(errors.monthlyRent);
  assert.ok(errors.securityDeposit);
  assert.ok(errors.brokerageAmount);
  assert.ok(errors.availableFrom);
  assert.ok(errors.bathrooms);
  assert.ok(errors.balconies);
  // Description is optional and auto-generated automatically
  assert.equal(errors.description, undefined);

  const validWithEmptyDesc: PropertySubmissionInput = {
    name: 'Rohan Kulkarni',
    mobile: '9823012345',
    whatsapp: '9823012345',
    submitterRole: 'Broker',
    propertyType: '1BHK',
    location: 'Viman Nagar, Pune',
    societyName: 'Ganga Nebula',
    monthlyRent: '18000',
    securityDeposit: '35000',
    brokerageAmount: '18000',
    furnishingStatus: 'Semi-Furnished',
    availableFrom: '2026-12-01',
    bathrooms: '1',
    balconies: '1',
    floorNumber: '3',
    totalFloors: '7',
    carpetArea: '560 Sq. Ft.',
    description: '',
    facilities: ['24 Hours Water', 'Lift'],
    photoNames: ['living.jpg'],
  };
  const noErrors = validateSubmissionForm(validWithEmptyDesc);
  assert.deepEqual(noErrors, {});

  const autoDesc = generateAutoPropertyDescription(validWithEmptyDesc);
  assert.ok(autoDesc.includes('Semi-Furnished 1BHK'));
  assert.ok(autoDesc.includes('Ganga Nebula'));
  assert.ok(autoDesc.includes('Viman Nagar, Pune'));
  assert.ok(autoDesc.includes('₹18,000'));
  assert.ok(autoDesc.includes('24 Hours Water, Lift'));
  assert.ok(autoDesc.length >= 40);

  const waUrl = buildPropertySubmissionWhatsAppUrl(validWithEmptyDesc, 'WB-1010');
  const decoded = decodeURIComponent(waUrl.split('?text=')[1]);
  assert.ok(decoded.includes('Property ID: WB-1010'));
  assert.ok(decoded.includes('Rohan Kulkarni (Broker)'));
  assert.ok(decoded.includes('₹18,000'));
});

test('getPropertyDirectUrl, buildWhatsAppPropertyShareText, and injectPropertyOgIntoHtml generate unique per-property metadata', () => {
  const flatA = SAMPLE_PROPERTIES[0];
  const flatB = SAMPLE_PROPERTIES[2];
  const urlA = getPropertyDirectUrl('https://withbroker.vercel.app/?foo=1', flatA.propertyCode);
  const urlB = getPropertyDirectUrl('https://withbroker.vercel.app/', flatB.propertyCode);

  assert.equal(urlA, 'https://withbroker.vercel.app/property/WB-1001');
  assert.equal(urlB, 'https://withbroker.vercel.app/property/WB-1003');
  assert.equal(getPublicPropertyShareUrl('WB-1001'), 'https://withbroker.vercel.app/property/WB-1001');
  assert.equal(getOwnerSubmissionShareUrl(), 'https://withbroker.vercel.app/owner-add-property');

  const waShare = buildWhatsAppPropertyShareText(flatA);
  assert.ok(waShare.includes(`🏠 ${flatA.title}`));
  assert.ok(waShare.includes(`🆔 Property ID: ${flatA.propertyCode}`));
  assert.ok(waShare.includes('💰 Rent: ₹21,000/month'));
  assert.ok(waShare.includes('📍 Location: Near Phoenix Mall, Wadgaon Sheri, Pune'));
  assert.ok(waShare.includes('View full details and photos:\nhttps://withbroker.vercel.app/property/WB-1001'));
  assert.ok(waShare.includes(WHATSAPP_COMMUNITY_URL));
  assert.ok(waShare.includes('Listed on WITHBROKER'));

  const baseHtml = '<!doctype html><html><head><title>Old</title><meta property="og:title" content="Old" /></head><body><div id="root"></div></body></html>';

  const ogDataA: OgPropertyData = {
    propertyCode: 'WB-1001',
    title: flatA.title,
    propertyType: flatA.propertyType,
    locality: flatA.locality,
    subLocality: flatA.subLocality,
    monthlyRent: flatA.monthlyRent,
    furnishing: flatA.furnishing,
    availabilityLabel: 'Available',
    workflowStatus: 'Available',
    shortDescription: flatA.shortDescription,
    fullDescription: flatA.fullDescription,
    firstImage: flatA.images[0],
    updatedAtVersion: '1764057600',
  };

  const ogDataUploaded: OgPropertyData = {
    propertyCode: 'WB-9999',
    title: '2BHK Flat in "Viman Nagar" <Pune>',
    propertyType: '2BHK',
    locality: 'Viman Nagar, Pune',
    subLocality: 'Viman Nagar',
    monthlyRent: 28000,
    furnishing: 'Semi-Furnished',
    availabilityLabel: 'Available',
    workflowStatus: 'Available',
    shortDescription: 'Spacious 2BHK near Symbiosis.',
    fullDescription: 'Spacious 2BHK near Symbiosis.',
    firstImage: 'fbphoto://photo-12345-abcdef',
    updatedAtVersion: '1764057999',
  };

  const htmlA = injectPropertyOgIntoHtml(baseHtml, ogDataA, 'https://withbroker.vercel.app');
  const htmlB = injectPropertyOgIntoHtml(baseHtml, ogDataUploaded, 'https://withbroker.vercel.app');

  assert.ok(htmlA.includes('property="og:title" content="1BHK Furnished Flat Near Phoenix Mall – ₹21,000/month | WithBroker"'));
  assert.ok(htmlA.includes('property="og:image" content="https://withbroker.vercel.app/assets/properties/flat-1/photo-2.jpeg?v=1764057600"'));
  assert.ok(htmlA.includes('property="og:url" content="https://withbroker.vercel.app/property/WB-1001"'));
  assert.ok(htmlA.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(htmlA.includes('property="og:site_name" content="WithBroker"'));

  // Uploaded Firestore photo resolves to public HTTPS image endpoint & special chars are safely escaped
  assert.ok(htmlB.includes('property="og:image" content="https://withbroker.vercel.app/api/property-image/photo-12345-abcdef?v=1764057999"'));
  assert.ok(htmlB.includes('name="twitter:image" content="https://withbroker.vercel.app/api/property-image/photo-12345-abcdef?v=1764057999"'));
  assert.ok(!htmlB.includes('<Pune>'));
  assert.ok(htmlB.includes('&lt;Pune&gt;'));
  assert.notEqual(htmlA, htmlB);
});

test('Admin AI Property Assistant draft sanitizer normalizes types, currency, phones, and detects missing fields', async () => {
  const { sanitizeAiDraft, computeMissingDraftFields } = await import('../lib/adminAiPropertyChat.ts');

  const partial = sanitizeAiDraft({
    propertyType: '2 bhk',
    furnishingStatus: 'semi furnished',
    location: 'Wadgaon Sheri, Pune',
    monthlyRent: 24000,
    securityDeposit: 50000,
    brokerageAmount: 24000,
    submitterRole: 'Broker',
    submitterMobile: '+91 98230-12345',
    bathrooms: 2,
    balconies: 1,
    facilities: ['Lift', 'Covered Parking', 'Lift'],
  });

  assert.equal(partial.propertyType, '2BHK');
  assert.equal(partial.furnishingStatus, 'Semi-Furnished');
  assert.equal(partial.monthlyRent, 24000);
  assert.equal(partial.submitterMobile, '9823012345');
  assert.equal(partial.submitterWhatsapp, '9823012345');
  assert.deepEqual(partial.facilities, ['Lift', 'Covered Parking']);
  assert.deepEqual(computeMissingDraftFields(partial), []);

  const incomplete = sanitizeAiDraft({
    propertyType: 'invalid',
    location: '',
    monthlyRent: 200,
    submitterMobile: '123',
  });
  assert.equal(incomplete.propertyType, '');
  assert.equal(incomplete.monthlyRent, null);
  assert.equal(incomplete.submitterMobile, '9834626078');
  assert.equal(computeMissingDraftFields(incomplete).length, 3);
});

test('parseAppRoute handles /property/:id deep links, known routes, and 404 paths gracefully; buildClientPageMetadata updates OG tags per property', async () => {
  const { parseAppRoute, buildClientPageMetadata } = await import('./seoMetadata.ts');

  const propRoute = parseAppRoute('/property/WB-385631', '', '');
  assert.equal(propRoute.view, 'public');
  assert.equal(propRoute.propertyId, 'WB-385631');
  assert.equal(propRoute.isUnknownRoute, false);

  const queryRoute = parseAppRoute('/', '?flat=WB-1001', '#flats');
  assert.equal(queryRoute.view, 'public');
  assert.equal(queryRoute.propertyId, 'WB-1001');
  assert.equal(queryRoute.isUnknownRoute, false);

  const adminRoute = parseAppRoute('/admin', '', '');
  assert.equal(adminRoute.view, 'admin');
  assert.equal(adminRoute.isUnknownRoute, false);

  const ownerRoute = parseAppRoute('/owner-add-property', '', '');
  assert.equal(ownerRoute.view, 'owner-form');
  assert.equal(ownerRoute.isUnknownRoute, false);

  const notFoundRoute = parseAppRoute('/some/missing-404-path', '', '');
  assert.equal(notFoundRoute.view, 'public');
  assert.equal(notFoundRoute.propertyId, null);
  assert.equal(notFoundRoute.isUnknownRoute, true);

  const flat = SAMPLE_PROPERTIES[0];
  const propMeta = buildClientPageMetadata(flat, 'public', 'https://withbroker.vercel.app');
  assert.ok(propMeta.ogTitle.includes(flat.title));
  assert.ok(propMeta.ogDescription.includes('₹21,000/month'));
  assert.equal(propMeta.ogImage, 'https://withbroker.vercel.app/assets/properties/flat-1/photo-2.jpeg');
  assert.equal(propMeta.ogUrl, 'https://withbroker.vercel.app/property/WB-1001');

  const uploadedMeta = buildClientPageMetadata(
    { ...flat, propertyCode: 'WB-385631', images: ['fbphoto://photo-abc-123'] },
    'public',
    'https://withbroker.vercel.app'
  );
  assert.equal(
    uploadedMeta.ogImage,
    'https://withbroker.vercel.app/api/property-image/photo-abc-123'
  );

  const homeMeta = buildClientPageMetadata(null, 'public', 'https://withbroker.vercel.app');
  assert.equal(homeMeta.ogUrl, 'https://withbroker.vercel.app/');
  assert.equal(homeMeta.ogImage, 'https://withbroker.vercel.app/assets/properties/flat-1/photo-1.jpeg');
  assert.ok(!homeMeta.title.includes('Viman Nagar'));
  assert.ok(!homeMeta.description.includes('Viman Nagar'));

  // Roommate deep links (/roommate/:code, /roommates/:code, ?roommate=:code)
  const rmRoute = parseAppRoute('/roommate/WB-RM-1001', '', '');
  assert.equal(rmRoute.view, 'public');
  assert.equal(rmRoute.roommateId, 'WB-RM-1001');
  assert.equal(rmRoute.isUnknownRoute, false);

  const rmPluralRoute = parseAppRoute('/roommates/WB-RM-1001', '', '');
  assert.equal(rmPluralRoute.roommateId, 'WB-RM-1001');
  assert.equal(rmPluralRoute.isUnknownRoute, false);

  const rmQueryRoute = parseAppRoute('/', '?roommate=WB-RM-1001', '#roommates');
  assert.equal(rmQueryRoute.roommateId, 'WB-RM-1001');
  assert.equal(rmQueryRoute.isUnknownRoute, false);

  const baselineRm = BASELINE_ROOMMATE_LISTINGS[0];
  const rmMeta = buildClientPageMetadata(null, 'public', 'https://withbroker.vercel.app', baselineRm);
  assert.equal(rmMeta.ogUrl, 'https://withbroker.vercel.app/roommate/WB-RM-1001');
  assert.ok(rmMeta.ogTitle.includes('1 Female Roommate Required'));
  assert.ok(rmMeta.ogDescription.includes('₹6,000/person'));
  assert.equal(
    rmMeta.ogImage,
    'https://withbroker.vercel.app/assets/aistudio/6255714068601705157_c9b15d20.jpg'
  );

  // Server-side roommate OG injection
  const rmOgData: OgRoommateData = {
    listingCode: baselineRm.listingCode,
    roomType: baselineRm.roomType,
    flatOccupancy: baselineRm.flatOccupancy || 'Pre-Occupied Flat',
    location: baselineRm.location,
    publicBuildingName: baselineRm.publicBuildingName || '',
    rent: baselineRm.rent,
    deposit: baselineRm.deposit,
    furnishing: baselineRm.furnishing,
    preferredGender: baselineRm.preferredGender,
    peopleRequired: baselineRm.peopleRequired,
    urgent: Boolean(baselineRm.urgent),
    status: baselineRm.status,
    description: baselineRm.description,
    firstImage: baselineRm.images[0] || '',
    updatedAtVersion: '',
  };
  const rmHtml = injectRoommateOgIntoHtml(
    '<!doctype html><html><head><title>Default</title></head><body><div id="root"></div></body></html>',
    rmOgData,
    'https://withbroker.vercel.app'
  );
  assert.ok(rmHtml.includes('property="og:url" content="https://withbroker.vercel.app/roommate/WB-RM-1001"'));
  assert.ok(rmHtml.includes('1 Female Roommate Required'));
  assert.ok(rmHtml.includes('/assets/aistudio/6255714068601705157_c9b15d20.jpg'));
});

test('buildDynamicLocalities derives areas strictly from actual flats data with zero hardcoded defaults and supports all Pune areas plus future cities', () => {
  // 1. Empty flats data -> zero area cards (no hardcoded Viman Nagar / Wadgaon Sheri / Somnath Nagar)
  assert.deepEqual(buildDynamicLocalities([]), []);

  // 2. Sample properties -> only areas that actually exist in active flats data, sorted by available count descending
  const sampleLocs = buildDynamicLocalities(SAMPLE_PROPERTIES);
  const sampleSlugs = sampleLocs.map((l) => l.slug);
  assert.equal(sampleSlugs.includes('viman-nagar'), false);
  assert.equal(sampleSlugs.includes('somnath-nagar'), false);
  assert.equal(sampleSlugs[0], 'wadgaon-sheri');
  assert.ok(sampleSlugs.includes('keshav-nagar'));
  assert.ok(sampleSlugs.includes('wanowrie'));

  // 3. Flats across wider Pune (Baner, Kothrud, Karve Nagar) and future expansion outside Pune (Andheri West, Mumbai)
  const baseFlat = SAMPLE_PROPERTIES[0];
  const customFlats = [
    {
      ...baseFlat,
      id: 'p-baner-1',
      propertyCode: 'WB-2001',
      locality: 'High Street, Baner, Pune',
      subLocality: 'Baner',
      localitySlug: 'baner',
    },
    {
      ...baseFlat,
      id: 'p-baner-2',
      propertyCode: 'WB-2002',
      locality: 'Pancard Club Road, Baner, Pune',
      subLocality: 'Baner',
      localitySlug: 'baner',
    },
    {
      ...baseFlat,
      id: 'p-karve-1',
      propertyCode: 'WB-2003',
      locality: 'Lane No. 8, Canal Road, Karve Nagar, Pune',
      subLocality: 'Karve Nagar',
      localitySlug: 'other',
    },
    {
      ...baseFlat,
      id: 'p-mumbai-1',
      propertyCode: 'WB-2004',
      locality: 'Lokhandwala, Andheri West, Mumbai 400053',
      subLocality: 'Andheri West',
      localitySlug: 'other',
    },
  ];

  const dynamicLocs = buildDynamicLocalities(customFlats);
  assert.deepEqual(
    dynamicLocs.map((l) => l.name),
    ['Baner', 'Andheri West', 'Karve Nagar']
  );

  // Filtering by a dynamically inferred 'other' slug matches ONLY that exact area without colliding
  const karveFiltered = filterProperties(
    customFlats,
    { location: 'karve-nagar', propertyType: 'all', maxRent: null },
    dynamicLocs
  );
  assert.deepEqual(
    karveFiltered.map((p) => p.id),
    ['p-karve-1']
  );

  const mumbaiFiltered = filterProperties(
    customFlats,
    { location: 'andheri-west', propertyType: 'all', maxRent: null },
    dynamicLocs
  );
  assert.deepEqual(
    mumbaiFiltered.map((p) => p.id),
    ['p-mumbai-1']
  );

  assert.equal(inferAreaMeta('Paud Road, Kothrud, Pune').label, 'Kothrud');
  assert.equal(inferAreaMeta('Hinjewadi Phase 2, Pune').slug, 'hinjewadi');
  assert.equal(inferAreaMeta('Whitefield, Bengaluru').slug, 'whitefield');
});




