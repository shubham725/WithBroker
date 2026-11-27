import type { PublicRoommateListing } from '../types/roommate';

/**
 * Verified baseline roommate vacancies published on WithBroker Pune.
 * Shown immediately to visitors and automatically synced into Firestore
 * (`roommate_listings` + `public_roommates`) when the sole admin signs in
 * so every entry is fully editable, fulfillable, and deletable from Admin.
 */
export const BASELINE_ROOMMATE_LISTINGS: PublicRoommateListing[] = [
  {
    id: 'WB-RM-1001',
    listingCode: 'WB-RM-1001',
    userId: 'withbroker-admin',
    listingType: 'have_room',
    flatOccupancy: 'Pre-Occupied Flat',
    electricityBill: 'Shared',
    facilities: [
      'No Brokerage',
      'No Restrictions',
      'Master Bedroom (Single Occupancy)',
      'Attached Washroom & Balcony',
      'WiFi',
      'Fridge',
      'Cot + Mattress',
      'Wardrobe',
      'Water Purifier',
      'Geyser',
      'Near Mumbai-Pune Highway',
    ],
    urgent: true,
    shiftingNow: true,
    posterFirstName: 'WithBroker',
    gender: 'Female',
    age: null,
    occupation: 'Working Professional',
    roomType: '2BHK',
    location: 'Tathawade, Wakad',
    localitySlug: 'tathawade',
    publicBuildingName: 'Silver Twins Decks - 2, Near Bhumkar Chowk',
    showExactAddress: true,
    showPublicContact: false,
    publicWhatsappNumber: null,
    publicSecondaryContact: null,
    rent: 6000,
    deposit: 10000,
    brokerage: 0,
    furnishing: 'Furnished',
    availableFrom: '2026-11-27',
    existingRoommates: 1,
    peopleRequired: 1,
    preferredGender: 'Female',
    preferredOccupation: 'Any',
    preferredAgeRange: null,
    foodPreference: 'No Restrictions',
    smokingPreference: null,
    description:
      'Urgent requirement for 1 Female flatmate in a spacious Furnished 2BHK at Silver Twins Decks - 2, near Bhumkar Chowk, Tathawade, Wakad, Pune - 411033. Master Bedroom with attached washroom and balcony available for single occupancy. No Brokerage & No Restrictions. Monthly Rent: ₹6,000, Deposit: ₹10,000, Agreement charges: ₹300. Amenities include WiFi, Fridge, Bed (Cot + Mattress), Wardrobe, Water Purifier, and Geyser. Located right near the Mumbai-Pune Highway — available immediately.',
    images: [
      '/assets/aistudio/6255714068601705157_c9b15d20.jpg',
      '/assets/aistudio/6237801190234200811_670310a9.jpg',
      '/assets/aistudio/6237801190234200807_97c9ca2a.jpg',
      '/assets/aistudio/6255714068601705158_1b80f756.jpg',
      '/assets/aistudio/6237801190234200810_3fc5ae1f.jpg',
    ],
    status: 'Active',
    createdAt: '2026-11-27T07:51:00.000Z',
    approvedAt: '2026-11-27T07:51:00.000Z',
    updatedAt: '2026-11-27T07:51:00.000Z',
    expiresAt: '2027-01-27T23:59:59.000Z',
  },
];
