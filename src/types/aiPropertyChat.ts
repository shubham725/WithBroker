import type { FurnishingStatus, PropertyType, SubmitterRole, SuitableFor } from './property';

export interface AiExtractedPropertyDraft {
  title: string;
  propertyType: PropertyType | '';
  location: string;
  societyName: string;
  monthlyRent: number | null;
  securityDeposit: number | null;
  brokerageAmount: number | null;
  furnishingStatus: FurnishingStatus;
  carpetArea: string;
  bathrooms: number;
  balconies: number;
  floorNumber: string;
  totalFloors: string;
  availableFrom: string;
  suitableFor: SuitableFor;
  parking: string;
  waterAvailability: string;
  liftAvailability: string;
  description: string;
  facilities: string[];
  submitterName: string;
  submitterMobile: string;
  submitterWhatsapp: string;
  submitterRole: SubmitterRole;
}

export interface AdminAiChatMessageInput {
  role: 'user' | 'assistant';
  text: string;
}

export interface AdminAiChatImageInput {
  mimeType: string;
  dataBase64: string;
}

export interface AdminAiChatRequestPayload {
  messages: AdminAiChatMessageInput[];
  images?: AdminAiChatImageInput[];
  currentDraft?: Partial<AiExtractedPropertyDraft> | null;
  attachedPhotoCount?: number;
}

export interface AdminAiChatResponsePayload {
  assistantReply: string;
  readyToCreate: boolean;
  userConfirmedPublish: boolean;
  publishMode: 'Available' | 'Pending';
  missingFields: string[];
  photoInsights: string;
  draft: AiExtractedPropertyDraft;
}

export function createEmptyAiDraft(): AiExtractedPropertyDraft {
  return {
    title: '',
    propertyType: '',
    location: '',
    societyName: '',
    monthlyRent: null,
    securityDeposit: null,
    brokerageAmount: 0,
    furnishingStatus: 'Unfurnished',
    carpetArea: '',
    bathrooms: 1,
    balconies: 0,
    floorNumber: '',
    totalFloors: '',
    availableFrom: 'Immediate',
    suitableFor: 'Family / Bachelors',
    parking: 'Ask on inquiry',
    waterAvailability: '24 Hours Water Supply',
    liftAvailability: 'Ask on inquiry',
    description: '',
    facilities: [],
    submitterName: 'WithBroker Team',
    submitterMobile: '9834626078',
    submitterWhatsapp: '9834626078',
    submitterRole: 'Owner',
  };
}

export function computeMissingDraftFields(draft: AiExtractedPropertyDraft): string[] {
  const missing: string[] = [];
  if (!draft.propertyType) missing.push('Property Type (1RK, 1BHK, 2BHK, or 3BHK)');
  if (draft.location.trim().length < 2) missing.push('Location / Area in Pune');
  if (!draft.monthlyRent || draft.monthlyRent < 1000) missing.push('Monthly Rent (₹)');
  return missing;
}
