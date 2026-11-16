export type PropertyType = '1RK' | '1BHK' | '2BHK' | '3BHK';

export type FurnishingStatus = 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';

export type ListingStatus = 'active' | 'rented' | 'draft';

export type SuitableFor = 'Family' | 'Bachelors' | 'Working Professionals' | 'Family / Bachelors';

export interface PropertyListing {
  id: string;
  title: string;
  propertyType: PropertyType;
  locality: string;
  subLocality: string;
  localitySlug: string;
  /** Approximate public area description (never expose private owner door/flat number unless explicitly approved). */
  publicAreaNote: string;
  /** Approximate neighborhood pin coordinates for map discovery. */
  coordinates: {
    lat: number;
    lng: number;
  };
  monthlyRent: number;
  securityDeposit: number | null;
  brokerageStatus: 'Applicable' | 'No Brokerage' | 'Half Month';
  brokerageAmount: number;
  maintenanceCharges?: string;
  furnishing: FurnishingStatus;
  carpetArea?: string;
  builtUpArea?: string;
  floorInfo?: string;
  facing?: string;
  bathroomType: string;
  parking: string;
  waterAvailability: string;
  liftAvailability: string;
  suitableFor: SuitableFor;
  availableFrom: string;
  availabilityLabel: 'Available' | 'Rented Out';
  listingStatus: ListingStatus;
  isDemoListing: boolean;
  shortDescription: string;
  fullDescription: string;
  additionalNotes: string;
  facilities: string[];
  images: string[];
}

export interface LocalityConfig {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  image: string;
  center: {
    lat: number;
    lng: number;
  };
  /** Matches listings whose localitySlug is in matchSlugs */
  matchSlugs: string[];
}

export type SortOrder = 'featured' | 'rent-asc' | 'rent-desc';

export interface SearchFiltersState {
  location: string; // 'all' | 'viman-nagar' | 'wadgaon-sheri' | 'somnath-nagar' | 'other'
  propertyType: 'all' | PropertyType;
  maxRent: number | null;
  furnishing?: 'all' | FurnishingStatus;
  sortBy?: SortOrder;
  onlySaved?: boolean;
}

export interface PropertySubmissionInput {
  name: string;
  mobile: string;
  submitterRole: 'Owner' | 'Broker';
  propertyType: PropertyType | '';
  location: string;
  monthlyRent: string;
  securityDeposit: string;
  brokerageDetails: string;
  furnishingStatus: FurnishingStatus;
  description: string;
  facilities: string[];
  photoNames: string[];
}

export interface SubmissionValidationErrors {
  name?: string;
  mobile?: string;
  propertyType?: string;
  location?: string;
  monthlyRent?: string;
  securityDeposit?: string;
}
