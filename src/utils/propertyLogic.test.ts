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
  buildEmailSharePostUrl,
  buildOwnerContactWhatsAppUrl,
  buildPropertyShareText,
  buildPropertySubmissionWhatsAppUrl,
  buildSmsSharePostUrl,
  buildTelegramSharePostUrl,
  buildWhatsAppInquiryUrl,
  filterProperties,
  formatBrokerageLabel,
  formatDepositLabel,
  formatINR,
  generateAutoPropertyDescription,
  getActiveListings,
  getLocalityListingCount,
  isPropertyRentedOut,
  validateSubmissionForm,
} from './propertyLogic';
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

test('buildPropertyShareText includes Property ID, group name, group link, and website link', () => {
  const prop = SAMPLE_PROPERTIES[0];
  const propUrl = 'https://withbroker.vercel.app/?flat=WB-1001#flats';
  const ad = buildPropertyShareText(prop, propUrl);
  assert.ok(ad.includes('🆔 Property ID: WB-1001'));
  assert.ok(ad.includes(`👥 WhatsApp Group — ${WHATSAPP_COMMUNITY_NAME}:`));
  assert.ok(ad.includes(WHATSAPP_COMMUNITY_URL));
  assert.ok(ad.includes(`🌐 Website: ${WEBSITE_URL}`));
  assert.ok(ad.includes('WITHBROKER • RENT • SEARCH • CONNECT'));

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
