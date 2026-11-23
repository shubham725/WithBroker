export type PropertyType = '1RK' | '1BHK' | '2BHK' | '3BHK';

export type FurnishingStatus = 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';

export type ListingStatus = 'active' | 'rented' | 'draft';

export type WorkflowStatus = 'Pending' | 'Available' | 'Rejected' | 'Rented';

export type SubmitterRole = 'Owner' | 'Broker';

export type SuitableFor = 'Family' | 'Bachelors' | 'Working Professionals' | 'Family / Bachelors';

export interface PropertyListing {
  id: string;
  dbId?: number;
  propertyCode: string; // e.g. WB-1001
  title: string;
  propertyType: PropertyType;
  locality: string;
  subLocality: string;
  localitySlug: string;
  societyName?: string | null;
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
  floorNumber?: string;
  totalFloors?: string;
  floorInfo?: string;
  facing?: string;
  bathrooms?: number;
  bathroomType: string;
  balconies?: number;
  parking: string;
  waterAvailability: string;
  liftAvailability: string;
  suitableFor: SuitableFor;
  availableFrom: string;
  availabilityLabel: 'Available' | 'Rented Out';
  listingStatus: ListingStatus;
  workflowStatus?: WorkflowStatus;
  submitterRole?: SubmitterRole;
  submittedAt?: string;
  approvedAt?: string | null;
  isDemoListing: boolean;
  shortDescription: string;
  fullDescription: string;
  additionalNotes: string;
  facilities: string[];
  images: string[];
}

export interface AdminPropertyRecord extends PropertyListing {
  dbId: number;
  workflowStatus: WorkflowStatus;
  submitterName: string;
  submitterMobile: string;
  submitterWhatsapp: string;
  submitterRole: SubmitterRole;
  rejectionReason: string | null;
  submittedAt: string;
  approvedAt: string | null;
  updatedAt: string;
}

export interface AdminDashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  available: number;
  rented: number;
  ownerSubmissions: number;
  brokerSubmissions: number;
}

export interface AdminNotification {
  id: number;
  type: 'submission' | 'approved' | 'rejected' | 'rented' | 'available' | 'deleted';
  propertyId: number | null;
  propertyCode: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
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

export type SortOrder = 'recent' | 'featured' | 'rent-asc' | 'rent-desc';

export interface SearchFiltersState {
  location: string; // 'all' | 'viman-nagar' | 'wadgaon-sheri' | 'somnath-nagar' | 'other'
  propertyType: 'all' | PropertyType;
  minRent?: number | null;
  maxRent: number | null;
  furnishing?: 'all' | FurnishingStatus;
  submitterRole?: 'all' | SubmitterRole;
  onlyAvailable?: boolean;
  sortBy?: SortOrder;
  onlySaved?: boolean;
}

export interface PropertySubmissionInput {
  name: string;
  mobile: string;
  whatsapp: string;
  submitterRole: SubmitterRole;
  propertyType: PropertyType | '';
  location: string;
  societyName: string;
  monthlyRent: string;
  securityDeposit: string;
  brokerageAmount: string;
  brokerageDetails?: string;
  furnishingStatus: FurnishingStatus;
  availableFrom: string;
  bathrooms: string;
  balconies: string;
  floorNumber: string;
  totalFloors: string;
  carpetArea: string;
  description: string;
  facilities: string[];
  photoNames: string[];
}

export interface SubmissionValidationErrors {
  name?: string;
  mobile?: string;
  whatsapp?: string;
  propertyType?: string;
  location?: string;
  monthlyRent?: string;
  securityDeposit?: string;
  brokerageAmount?: string;
  availableFrom?: string;
  bathrooms?: string;
  balconies?: string;
  description?: string;
  photos?: string;
}
