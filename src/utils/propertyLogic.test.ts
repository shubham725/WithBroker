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
  buildPropertyShareText,
  buildPropertySubmissionWhatsAppUrl,
  buildSmsSharePostUrl,
  buildTelegramSharePostUrl,
  buildWhatsAppInquiryUrl,
  filterProperties,
  formatBrokerageLabel,
  formatDepositLabel,
  formatINR,
  getActiveListings,
  getLocalityListingCount,
  validateSubmissionForm,
} from './propertyLogic';
import { PropertySubmissionInput } from '../types/property';

test('getActiveListings excludes rented or inactive properties', () => {
  const active = getActiveListings(SAMPLE_PROPERTIES);
  assert.equal(active.some((p) => p.listingStatus !== 'active'), false);
  assert.equal(active.length, 9);
});

test('filterProperties filters by locality, propertyType, and maxRent accurately', () => {
  const wadgaon = filterProperties(SAMPLE_PROPERTIES, {
    location: 'wadgaon-sheri',
    propertyType: 'all',
    maxRent: null,
  });
  assert.equal(wadgaon.length, 6);

  const under15k = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: 'all',
    maxRent: 15000,
  });
  assert.equal(under15k.length, 3);
  assert.ok(under15k.every((p) => p.monthlyRent <= 15000));

  const nearby1rk = filterProperties(SAMPLE_PROPERTIES, {
    location: 'other',
    propertyType: '1RK',
    maxRent: 10000,
  });
  assert.equal(nearby1rk.length, 2);
  assert.deepEqual(
    nearby1rk.map((p) => p.id),
    ['wb-flat-4', 'wb-flat-7']
  );

  const twoBhk = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: '2BHK',
    maxRent: null,
  });
  assert.equal(twoBhk.length, 4);

  const furnished = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: 'all',
    maxRent: null,
    furnishing: 'Fully Furnished',
  });
  assert.equal(furnished.length, 2);
  assert.deepEqual(
    furnished.map((p) => p.id),
    ['wb-flat-1', 'wb-flat-7']
  );

  const sortedAsc = filterProperties(SAMPLE_PROPERTIES, {
    location: 'all',
    propertyType: 'all',
    maxRent: null,
    sortBy: 'rent-asc',
  });
  assert.deepEqual(
    sortedAsc.map((p) => p.monthlyRent),
    [9000, 10000, 12000, 15500, 20000, 21000, 25000, 25000, 30000]
  );

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

  const savedOnly = filterProperties(
    SAMPLE_PROPERTIES,
    { location: 'all', propertyType: 'all', maxRent: null, onlySaved: true },
    LOCALITIES,
    ['wb-flat-2', 'wb-flat-9']
  );
  assert.deepEqual(
    savedOnly.map((p) => p.id),
    ['wb-flat-2', 'wb-flat-9']
  );
});

test('getLocalityListingCount calculates real active counts from property data', () => {
  const counts = LOCALITIES.map((loc) => ({
    slug: loc.slug,
    count: getLocalityListingCount(SAMPLE_PROPERTIES, loc),
  }));
  assert.deepEqual(counts, [
    { slug: 'wadgaon-sheri', count: 6 },
    { slug: 'viman-nagar', count: 0 },
    { slug: 'somnath-nagar', count: 0 },
    { slug: 'other', count: 3 },
  ]);
});

test('formatINR, formatDepositLabel, and formatBrokerageLabel format rental terms properly', () => {
  assert.equal(formatINR(12000), '₹12,000');
  assert.equal(formatINR(125000), '₹1,25,000');
  assert.equal(formatDepositLabel(null), 'On Inquiry');
  assert.equal(formatDepositLabel(20000), '₹20,000');
  assert.equal(formatBrokerageLabel(SAMPLE_PROPERTIES[0]), 'Applicable');
});

test('buildWhatsAppInquiryUrl encodes dynamic property details to 919834626078', () => {
  const prop = SAMPLE_PROPERTIES[1];
  const url = buildWhatsAppInquiryUrl(prop, 'https://withbroker.example/?flat=wb-flat-2');
  assert.ok(url.startsWith('https://wa.me/919834626078?text='));
  const decoded = decodeURIComponent(url.split('?text=')[1]);
  assert.ok(decoded.includes('1BHK Flat Near Wadgaon Sheri Post Office'));
  assert.ok(decoded.includes('Near Wadgaon Sheri Post Office, Pune'));
  assert.ok(decoded.includes('₹12,000'));
  assert.ok(decoded.includes('₹20,000'));
  assert.ok(decoded.includes('Brokerage: Applicable'));
  assert.ok(decoded.includes('https://withbroker.example/?flat=wb-flat-2'));
});

test('buildPropertyShareText produces optimized advertisement with group name, group link, and website link', () => {
  const prop = SAMPLE_PROPERTIES[0];
  const propUrl = 'https://withbroker.vercel.app/?flat=wb-flat-1#flats';
  const ad = buildPropertyShareText(prop, propUrl);
  assert.ok(ad.includes('🏠 1BHK Furnished Flat Near Phoenix Mall (Available for Rent)'));
  assert.ok(ad.includes('📍 Near Phoenix Mall, Wadgaon Sheri, Pune'));
  assert.ok(ad.includes('💰 Rent: ₹21,000/month | 🔐 Deposit: On Inquiry'));
  assert.ok(ad.includes('🤝 Brokerage: Applicable | 🛋️ Fully Furnished'));
  assert.ok(ad.includes('📲 WhatsApp: +91 9834626078 (WithBroker)'));
  assert.ok(ad.includes(`👥 WhatsApp Group — ${WHATSAPP_COMMUNITY_NAME}:`));
  assert.ok(ad.includes(WHATSAPP_COMMUNITY_URL));
  assert.ok(ad.includes(`🌐 Website: ${WEBSITE_URL}`));
  assert.ok(ad.includes(`🔗 Property Link: ${propUrl}`));
  assert.ok(ad.includes('WITHBROKER • RENT • SEARCH • CONNECT'));

  const tgUrl = buildTelegramSharePostUrl(ad, propUrl);
  assert.ok(tgUrl.startsWith('https://t.me/share/url?url='));
  assert.ok(decodeURIComponent(tgUrl).includes(WHATSAPP_COMMUNITY_URL));

  const smsUrl = buildSmsSharePostUrl(ad);
  assert.ok(smsUrl.startsWith('sms:?&body='));
  assert.ok(decodeURIComponent(smsUrl).includes('1BHK Furnished Flat Near Phoenix Mall'));

  const mailUrl = buildEmailSharePostUrl(prop, ad);
  assert.ok(mailUrl.startsWith('mailto:?subject='));
});

test('validateSubmissionForm catches invalid inputs and passes valid submission', () => {
  const invalid: PropertySubmissionInput = {
    name: '',
    mobile: '12345',
    submitterRole: 'Owner',
    propertyType: '',
    location: '',
    monthlyRent: '0',
    securityDeposit: '-5',
    brokerageDetails: '',
    furnishingStatus: 'Unfurnished',
    description: '',
    facilities: [],
    photoNames: [],
  };
  const errors = validateSubmissionForm(invalid);
  assert.ok(errors.name);
  assert.ok(errors.mobile);
  assert.ok(errors.propertyType);
  assert.ok(errors.location);
  assert.ok(errors.monthlyRent);
  assert.ok(errors.securityDeposit);

  const valid: PropertySubmissionInput = {
    name: 'Rohan Kulkarni',
    mobile: '9823012345',
    submitterRole: 'Broker',
    propertyType: '1BHK',
    location: 'Viman Nagar',
    monthlyRent: '18000',
    securityDeposit: '35000',
    brokerageDetails: 'One month rent',
    furnishingStatus: 'Semi-Furnished',
    description: 'Near Symbiosis campus',
    facilities: ['24 Hours Water', 'Lift'],
    photoNames: ['living.jpg'],
  };
  const noErrors = validateSubmissionForm(valid);
  assert.deepEqual(noErrors, {});

  const waUrl = buildPropertySubmissionWhatsAppUrl(valid);
  const decoded = decodeURIComponent(waUrl.split('?text=')[1]);
  assert.ok(decoded.includes('Rohan Kulkarni (Broker)'));
  assert.ok(decoded.includes('₹18,000'));
  assert.ok(decoded.includes('1 photo(s) selected (living.jpg)'));
});
