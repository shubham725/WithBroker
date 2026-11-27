export type RoommateListingType = 'have_room' | 'need_room';

export type RoommateFlatOccupancy = 'Pre-Occupied Flat' | 'New Flat';

export type RoommateGender = 'Male' | 'Female' | 'Prefer not to say';

export type PreferredGender = 'Male' | 'Female' | 'Any';

export type RoommateOccupation = 'Working Professional' | 'Student' | 'Other';

export type PreferredOccupation = 'Working Professional' | 'Student' | 'Any';

export type RoommateRoomType =
  | '1RK'
  | '1BHK'
  | '2BHK'
  | '3BHK'
  | 'Independent Room'
  | 'Shared Room'
  | 'Hall / Living Room Space'
  | '1BHK Sharing'
  | '2BHK Sharing'
  | '3BHK Sharing'
  | 'Other';

export type RoommateFurnishing = 'Furnished' | 'Semi-Furnished' | 'Unfurnished';

export type RoommateStatus = 'Pending' | 'Active' | 'Rejected' | 'Fulfilled' | 'Unavailable';

export type RoommateSortOrder = 'recent' | 'rent-asc' | 'rent-desc';

export type RoommateReportStatus = 'open' | 'reviewed' | 'dismissed';

export const ROOMMATE_ROOM_TYPES: RoommateRoomType[] = [
  '1BHK',
  '2BHK',
  '3BHK',
  '1RK',
  'Independent Room',
  'Shared Room',
  'Hall / Living Room Space',
  '1BHK Sharing',
  '2BHK Sharing',
  '3BHK Sharing',
  'Other',
];

export const ROOMMATE_FACILITY_OPTIONS: string[] = [
  'Parking Available',
  'Peaceful Society Surroundings',
  'Comfortable Living Environment',
  'WiFi Available',
  '24/7 Water Supply',
  'Kitchen / Cooking Allowed',
  'Washing Machine',
  'Fridge',
  'Bed & Cupboard',
  'Lift & Power Backup',
  'AC Available',
  'No Brokerage',
];

export const ROOMMATE_PUNE_LOCATIONS = [
  'Karve Nagar',
  'Kothrud',
  'Wadgaon Sheri',
  'Viman Nagar',
  'Somnath Nagar',
  'Kharadi',
  'Kalyani Nagar',
  'Chandan Nagar',
  'Keshav Nagar',
  'Magarpatta',
  'Hadapsar',
  'Baner',
  'Wakad',
  'Hinjewadi',
  'Aundh',
  'Shivajinagar',
  'Deccan',
  'Pimple Saudagar',
  'Koregaon Park',
  'Wagholi',
  'Dhanori',
  'Lohegaon',
];

/**
 * Sanitized public roommate listing stored in `/public_roommates`.
 * Private phone numbers and exact building names are stripped unless explicitly opted in.
 */
export interface PublicRoommateListing {
  id: string;
  listingCode: string; // e.g. WB-RM-1001
  userId: string;
  listingType: RoommateListingType;
  flatOccupancy?: RoommateFlatOccupancy;
  electricityBill?: string | null;
  facilities?: string[];
  urgent?: boolean;
  shiftingNow?: boolean;
  posterFirstName: string;
  gender: RoommateGender;
  age: number | null;
  occupation: RoommateOccupation;
  roomType: RoommateRoomType;
  location: string;
  localitySlug: string;
  publicBuildingName: string | null;
  showExactAddress: boolean;
  showPublicContact: boolean;
  publicWhatsappNumber: string | null;
  publicSecondaryContact?: string | null;
  rent: number;
  deposit: number;
  brokerage: number;
  furnishing: RoommateFurnishing;
  availableFrom: string; // YYYY-MM-DD
  existingRoommates: number;
  peopleRequired: number;
  preferredGender: PreferredGender;
  preferredOccupation: PreferredOccupation;
  preferredAgeRange: string | null;
  foodPreference: string | null;
  smokingPreference: string | null;
  description: string;
  images: string[];
  status: 'Active';
  createdAt: string;
  approvedAt: string | null;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Full master roommate listing stored in `/roommate_listings` (Owner + Sole Admin only).
 */
export interface RoommateListingRecord {
  id: string;
  listingCode: string;
  userId: string;
  listingType: RoommateListingType;
  flatOccupancy?: RoommateFlatOccupancy;
  electricityBill?: string | null;
  facilities?: string[];
  urgent?: boolean;
  shiftingNow?: boolean;
  name: string;
  contactNumber: string;
  whatsappNumber: string;
  secondaryContact?: string | null;
  gender: RoommateGender;
  age: number | null;
  occupation: RoommateOccupation;
  roomType: RoommateRoomType;
  location: string;
  localitySlug: string;
  buildingName: string | null;
  showExactAddress: boolean;
  showPublicContact: boolean;
  rent: number;
  deposit: number;
  brokerage: number;
  furnishing: RoommateFurnishing;
  availableFrom: string;
  existingRoommates: number;
  peopleRequired: number;
  preferredGender: PreferredGender;
  preferredOccupation: PreferredOccupation;
  preferredAgeRange: string | null;
  foodPreference: string | null;
  smokingPreference: string | null;
  description: string;
  images: string[];
  status: RoommateStatus;
  rejectionReason: string | null;
  reportCount: number;
  createdAt: string;
  approvedAt: string | null;
  updatedAt: string;
  expiresAt: string;
}

export interface RoommateReportRecord {
  id: string;
  listingCode: string;
  reason: string;
  details: string | null;
  reporterUid: string | null;
  status: RoommateReportStatus;
  createdAt: string;
}

export interface RoommateSubmissionInput {
  listingType: RoommateListingType;
  flatOccupancy?: RoommateFlatOccupancy;
  electricityBill?: string;
  facilities?: string[];
  urgent?: boolean;
  shiftingNow?: boolean;
  name: string;
  contactNumber: string;
  whatsappNumber: string;
  secondaryContact?: string;
  gender: RoommateGender;
  age: string;
  occupation: RoommateOccupation;
  roomType: RoommateRoomType;
  location: string;
  buildingName: string;
  showExactAddress: boolean;
  showPublicContact: boolean;
  rent: string;
  deposit: string;
  brokerage: string;
  furnishing: RoommateFurnishing;
  availableFrom: string;
  existingRoommates: string;
  peopleRequired: string;
  preferredGender: PreferredGender;
  preferredOccupation: PreferredOccupation;
  preferredAgeRange: string;
  foodPreference: string;
  smokingPreference: string;
  description: string;
}

export interface RoommateValidationErrors {
  name?: string;
  contactNumber?: string;
  whatsappNumber?: string;
  secondaryContact?: string;
  age?: string;
  location?: string;
  rent?: string;
  deposit?: string;
  brokerage?: string;
  availableFrom?: string;
  existingRoommates?: string;
  peopleRequired?: string;
  description?: string;
}

export interface RoommateFiltersState {
  listingType: 'all' | RoommateListingType;
  flatOccupancy?: 'all' | RoommateFlatOccupancy;
  location: string; // 'all' or locality text/slug
  preferredGender: 'all' | PreferredGender;
  roomType: 'all' | RoommateRoomType;
  minBudget: number | null;
  maxBudget: number | null;
  occupation: 'all' | PreferredOccupation;
  furnishing: 'all' | RoommateFurnishing;
  availableFrom: string; // '' or YYYY-MM-DD
  sortBy: RoommateSortOrder;
}

export interface RoommateDashboardStats {
  total: number;
  pending: number;
  active: number;
  maleRequirements: number;
  femaleRequirements: number;
  roomsAvailable: number;
  fulfilled: number;
  unavailable: number;
  rejected: number;
  openReports: number;
}
