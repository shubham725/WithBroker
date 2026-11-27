import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  PublicRoommateListing,
  RoommateDashboardStats,
  RoommateFlatOccupancy,
  RoommateFurnishing,
  RoommateGender,
  RoommateListingRecord,
  RoommateListingType,
  RoommateOccupation,
  RoommateReportRecord,
  RoommateReportStatus,
  RoommateRoomType,
  RoommateStatus,
  RoommateSubmissionInput,
  PreferredGender,
  PreferredOccupation,
} from '../types/roommate';
import {
  ROOMMATE_DEFAULT_EXPIRY_DAYS,
  computeRoommateStats,
  detectDuplicateRoommateSubmission,
  generateAutoRoommateDescription,
  getActivePublicRoommates,
  normalizeIndianPhone10,
  sanitizeRoommateForPublic,
} from '../utils/roommateLogic';
import { OperationType, db, handleFirestoreError } from './firebase';
import { compressImageFileToDataUrl, inferAreaMeta } from './firestoreRepo';

const ROOMMATE_MASTER_COLLECTION = 'roommate_listings';
const ROOMMATE_PUBLIC_COLLECTION = 'public_roommates';
const ROOMMATE_REPORTS_COLLECTION = 'roommate_reports';
const PHOTOS_COLLECTION = 'property_photos';
const NOTIFICATIONS_COLLECTION = 'admin_notifications';
const PHOTO_PREFIX = 'fbphoto://';
const ROOMMATE_COOLDOWN_KEY = 'withbroker-roommate-last-submit-ts';

function generateRoommateCode(): string {
  const rand = Math.floor(1000 + Math.random() * 8999);
  const suffix = String(Date.now()).slice(-2);
  return `WB-RM-${rand}${suffix}`;
}

function generateDocId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now()}-${randomPart}`;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.length > 0) {
    return val;
  }
  return new Date().toISOString();
}

function toOptionalIsoString(val: unknown): string | null {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.length > 0) {
    return val;
  }
  return null;
}

function buildExpiryTimestamp(days: number = ROOMMATE_DEFAULT_EXPIRY_DAYS): Timestamp {
  const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return Timestamp.fromDate(target);
}

function mapDocToPublicRoommate(
  id: string,
  data: Record<string, unknown>
): PublicRoommateListing {
  return {
    id,
    listingCode: String(data.listingCode || id),
    userId: String(data.userId || ''),
    listingType: (data.listingType as RoommateListingType) || 'have_room',
    flatOccupancy:
      (data.flatOccupancy as RoommateFlatOccupancy) || 'Pre-Occupied Flat',
    electricityBill: data.electricityBill ? String(data.electricityBill) : null,
    facilities: Array.isArray(data.facilities)
      ? data.facilities.map(String).slice(0, 15)
      : [],
    urgent: Boolean(data.urgent),
    shiftingNow: Boolean(data.shiftingNow),
    posterFirstName: String(data.posterFirstName || 'Tenant'),
    gender: (data.gender as RoommateGender) || 'Prefer not to say',
    age: typeof data.age === 'number' ? data.age : null,
    occupation: (data.occupation as RoommateOccupation) || 'Working Professional',
    roomType: (data.roomType as RoommateRoomType) || '1BHK',
    location: String(data.location || 'Pune'),
    localitySlug: String(data.localitySlug || 'wadgaon-sheri'),
    publicBuildingName: data.publicBuildingName ? String(data.publicBuildingName) : null,
    showExactAddress: Boolean(data.showExactAddress),
    showPublicContact: Boolean(data.showPublicContact),
    publicWhatsappNumber: data.publicWhatsappNumber ? String(data.publicWhatsappNumber) : null,
    publicSecondaryContact: data.publicSecondaryContact
      ? String(data.publicSecondaryContact)
      : null,
    rent: Number(data.rent || 0),
    deposit: Number(data.deposit || 0),
    brokerage: Number(data.brokerage || 0),
    furnishing: (data.furnishing as RoommateFurnishing) || 'Semi-Furnished',
    availableFrom: String(data.availableFrom || ''),
    existingRoommates: Number(data.existingRoommates || 0),
    peopleRequired: Number(data.peopleRequired || 1),
    preferredGender: (data.preferredGender as PreferredGender) || 'Any',
    preferredOccupation: (data.preferredOccupation as PreferredOccupation) || 'Any',
    preferredAgeRange: data.preferredAgeRange ? String(data.preferredAgeRange) : null,
    foodPreference: data.foodPreference ? String(data.foodPreference) : null,
    smokingPreference: data.smokingPreference ? String(data.smokingPreference) : null,
    description: String(data.description || ''),
    images: Array.isArray(data.images) ? data.images.map(String).slice(0, 8) : [],
    status: 'Active',
    createdAt: toIsoString(data.createdAt),
    approvedAt: toOptionalIsoString(data.approvedAt),
    updatedAt: toIsoString(data.updatedAt),
    expiresAt: toIsoString(data.expiresAt),
  };
}

function mapDocToMasterRoommate(
  id: string,
  data: Record<string, unknown>
): RoommateListingRecord {
  return {
    id,
    listingCode: String(data.listingCode || id),
    userId: String(data.userId || ''),
    listingType: (data.listingType as RoommateListingType) || 'have_room',
    flatOccupancy:
      (data.flatOccupancy as RoommateFlatOccupancy) || 'Pre-Occupied Flat',
    electricityBill: data.electricityBill ? String(data.electricityBill) : null,
    facilities: Array.isArray(data.facilities)
      ? data.facilities.map(String).slice(0, 15)
      : [],
    urgent: Boolean(data.urgent),
    shiftingNow: Boolean(data.shiftingNow),
    name: String(data.name || 'Tenant'),
    contactNumber: String(data.contactNumber || ''),
    whatsappNumber: String(data.whatsappNumber || ''),
    secondaryContact: data.secondaryContact ? String(data.secondaryContact) : null,
    gender: (data.gender as RoommateGender) || 'Prefer not to say',
    age: typeof data.age === 'number' ? data.age : null,
    occupation: (data.occupation as RoommateOccupation) || 'Working Professional',
    roomType: (data.roomType as RoommateRoomType) || '1BHK',
    location: String(data.location || 'Pune'),
    localitySlug: String(data.localitySlug || 'wadgaon-sheri'),
    buildingName: data.buildingName ? String(data.buildingName) : null,
    showExactAddress: Boolean(data.showExactAddress),
    showPublicContact: Boolean(data.showPublicContact),
    rent: Number(data.rent || 0),
    deposit: Number(data.deposit || 0),
    brokerage: Number(data.brokerage || 0),
    furnishing: (data.furnishing as RoommateFurnishing) || 'Semi-Furnished',
    availableFrom: String(data.availableFrom || ''),
    existingRoommates: Number(data.existingRoommates || 0),
    peopleRequired: Number(data.peopleRequired || 1),
    preferredGender: (data.preferredGender as PreferredGender) || 'Any',
    preferredOccupation: (data.preferredOccupation as PreferredOccupation) || 'Any',
    preferredAgeRange: data.preferredAgeRange ? String(data.preferredAgeRange) : null,
    foodPreference: data.foodPreference ? String(data.foodPreference) : null,
    smokingPreference: data.smokingPreference ? String(data.smokingPreference) : null,
    description: String(data.description || ''),
    images: Array.isArray(data.images) ? data.images.map(String).slice(0, 8) : [],
    status: (data.status as RoommateStatus) || 'Pending',
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : null,
    reportCount: Number(data.reportCount || 0),
    createdAt: toIsoString(data.createdAt),
    approvedAt: toOptionalIsoString(data.approvedAt),
    updatedAt: toIsoString(data.updatedAt),
    expiresAt: toIsoString(data.expiresAt),
  };
}

/**
 * Real-time public subscription to approved, active, non-expired roommate listings.
 */
export function subscribePublicRoommates(
  onUpdate: (listings: PublicRoommateListing[]) => void,
  onError?: (err: Error) => void
): () => void {
  const publicQuery = query(
    collection(db, ROOMMATE_PUBLIC_COLLECTION),
    where('status', '==', 'Active')
  );

  return onSnapshot(
    publicQuery,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapDocToPublicRoommate(d.id, d.data() as Record<string, unknown>)
      );
      const activeNonExpired = getActivePublicRoommates(items);
      activeNonExpired.sort((a, b) => {
        const tA = new Date(a.approvedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.approvedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
      onUpdate(activeNonExpired);
    },
    (error) => {
      console.error('Public roommates snapshot error:', error);
      onUpdate([]);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

/**
 * Real-time subscription for a signed-in user's OWN roommate listings (enforced by Firestore rules).
 */
export function subscribeMyRoommateListings(
  userUid: string,
  onUpdate: (listings: RoommateListingRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const myQuery = query(
    collection(db, ROOMMATE_MASTER_COLLECTION),
    where('userId', '==', userUid)
  );

  return onSnapshot(
    myQuery,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapDocToMasterRoommate(d.id, d.data() as Record<string, unknown>)
      );
      items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(items);
    },
    (error) => {
      console.error('My roommate listings snapshot error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

async function uploadRoommatePhotos(
  listingCode: string,
  ownerUid: string | null,
  photoFiles: File[],
  onProgress?: (stage: string) => void
): Promise<string[]> {
  const filesToUpload = photoFiles.slice(0, 6);
  const refs: string[] = [];

  for (let i = 0; i < filesToUpload.length; i += 1) {
    const file = filesToUpload[i];
    onProgress?.(`Compressing photo ${i + 1} of ${filesToUpload.length}...`);
    await new Promise((r) => window.setTimeout(r, 0));
    const compressed = await compressImageFileToDataUrl(file);

    onProgress?.(`Uploading photo ${i + 1} of ${filesToUpload.length}...`);
    const photoId = generateDocId('rmphoto');
    try {
      await setDoc(doc(db, PHOTOS_COLLECTION, photoId), {
        propertyCode: listingCode,
        filename: compressed.filename,
        mimeType: compressed.mimeType,
        dataUrl: compressed.dataUrl,
        isPublic: false,
        ownerUid: ownerUid || null,
        createdAt: serverTimestamp(),
      });
      refs.push(`${PHOTO_PREFIX}${photoId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${PHOTOS_COLLECTION}/${photoId}`);
    }
  }

  return refs;
}

/**
 * Submit a new Roommate Vacancy Listing (supports BOTH signed-in users and fast zero-login posting).
 * Strictly enforces status = Pending and 30-day expiresAt, uploads compressed photos, and notifies Admin.
 */
export async function submitRoommateListing(
  input: RoommateSubmissionInput,
  photoFiles: File[],
  userUid: string | null,
  existingUserListings: RoommateListingRecord[] = [],
  onProgress?: (stage: string) => void
): Promise<{ listingCode: string; photoCount: number }> {
  // Light client anti-spam cooldown (15s)
  if (typeof window !== 'undefined') {
    try {
      const lastTs = Number(window.localStorage.getItem(ROOMMATE_COOLDOWN_KEY) || '0');
      if (lastTs && Date.now() - lastTs < 15_000) {
        throw new Error('Please wait a few seconds before submitting another roommate listing.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Please wait')) {
        throw err;
      }
    }
  }

  // Duplicate submission guard
  const duplicateCode = detectDuplicateRoommateSubmission(input, existingUserListings);
  if (duplicateCode) {
    throw new Error(
      `You already have a similar listing (${duplicateCode}). You can edit or renew it from My Roommate Listings.`
    );
  }

  const listingCode = generateRoommateCode();
  const area = inferAreaMeta(input.location);
  const contactNumber = normalizeIndianPhone10(input.contactNumber);
  const whatsappNumber = normalizeIndianPhone10(input.whatsappNumber || input.contactNumber);
  const altDigits = input.secondaryContact ? normalizeIndianPhone10(input.secondaryContact) : '';
  const secondaryContact = /^[6-9]\d{9}$/.test(altDigits) ? altDigits : null;

  const photoRefs = await uploadRoommatePhotos(listingCode, userUid, photoFiles, onProgress);

  onProgress?.('Saving roommate vacancy...');

  const parsedAge = input.age.trim() ? Math.round(Number(input.age)) : null;
  const posterName = (input.name.trim() || 'Flatmate').slice(0, 100);
  const finalDescription = (
    input.description.trim().length >= 10
      ? input.description.trim()
      : generateAutoRoommateDescription(input)
  ).slice(0, 2000);

  const masterPayload = {
    listingCode,
    userId: userUid || 'guest',
    listingType: 'have_room' as RoommateListingType,
    flatOccupancy: (input.flatOccupancy || 'Pre-Occupied Flat') as RoommateFlatOccupancy,
    electricityBill: input.electricityBill?.trim()
      ? input.electricityBill.trim().slice(0, 80)
      : null,
    facilities: Array.isArray(input.facilities) ? input.facilities.slice(0, 15) : [],
    urgent: Boolean(input.urgent),
    shiftingNow: Boolean(input.shiftingNow),
    name: posterName.length >= 2 ? posterName : 'Flatmate',
    contactNumber,
    whatsappNumber,
    secondaryContact,
    gender: input.gender,
    age: parsedAge && parsedAge >= 18 && parsedAge <= 99 ? parsedAge : null,
    occupation: input.occupation,
    roomType: input.roomType,
    location: input.location.trim().slice(0, 160),
    localitySlug: area.slug,
    buildingName: input.buildingName.trim() ? input.buildingName.trim().slice(0, 160) : null,
    showExactAddress: Boolean(input.showExactAddress),
    showPublicContact: Boolean(input.showPublicContact),
    rent: Math.round(Number(input.rent)),
    deposit: Math.round(Number(input.deposit || '0')),
    brokerage: Math.round(Number(input.brokerage || '0')),
    furnishing: input.furnishing,
    availableFrom: input.availableFrom.trim().slice(0, 40),
    existingRoommates: Math.max(0, Math.min(20, Math.round(Number(input.existingRoommates || '1')))),
    peopleRequired: Math.max(1, Math.min(10, Math.round(Number(input.peopleRequired || '1')))),
    preferredGender: input.preferredGender,
    preferredOccupation: input.preferredOccupation,
    preferredAgeRange: input.preferredAgeRange.trim()
      ? input.preferredAgeRange.trim().slice(0, 40)
      : null,
    foodPreference: input.foodPreference.trim() ? input.foodPreference.trim().slice(0, 60) : null,
    smokingPreference: input.smokingPreference.trim()
      ? input.smokingPreference.trim().slice(0, 60)
      : null,
    description: finalDescription,
    images: photoRefs,
    status: 'Pending' as RoommateStatus,
    rejectionReason: null,
    reportCount: 0,
    createdAt: serverTimestamp(),
    approvedAt: null,
    updatedAt: serverTimestamp(),
    expiresAt: buildExpiryTimestamp(ROOMMATE_DEFAULT_EXPIRY_DAYS),
  };

  try {
    await setDoc(doc(db, ROOMMATE_MASTER_COLLECTION, listingCode), masterPayload);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `${ROOMMATE_MASTER_COLLECTION}/${listingCode}`
    );
  }

  // Notify admin
  const notifId = generateDocId('notif');
  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), {
      type: 'roommate_submission',
      propertyCode: listingCode,
      title: `New Roommate Vacancy (${listingCode})`,
      message: `${masterPayload.peopleRequired} ${masterPayload.preferredGender} roommate required (${masterPayload.flatOccupancy} · ${masterPayload.roomType}) in ${masterPayload.location} at ₹${masterPayload.rent.toLocaleString('en-IN')}/mo.`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Roommate admin notification skipped:', error);
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ROOMMATE_COOLDOWN_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors
    }
  }

  return { listingCode, photoCount: photoRefs.length };
}

/**
 * Owner updates their own roommate listing (Pending, Active, or Rejected -> resubmits to Pending).
 * Automatically syncs sanitized fields to `/public_roommates` if currently Active!
 */
export async function updateMyRoommateListing(
  existing: RoommateListingRecord,
  input: RoommateSubmissionInput,
  keptImages: string[],
  newPhotoFiles: File[],
  userUid: string,
  onProgress?: (stage: string) => void
): Promise<void> {
  if (existing.userId !== userUid) {
    throw new Error('You do not have permission to edit this roommate listing.');
  }

  const uploadedRefs =
    newPhotoFiles.length > 0
      ? await uploadRoommatePhotos(existing.listingCode, userUid, newPhotoFiles, onProgress)
      : [];
  const mergedImages = [...keptImages, ...uploadedRefs].slice(0, 8);

  onProgress?.('Updating roommate listing...');

  const area = inferAreaMeta(input.location);
  const contactNumber = normalizeIndianPhone10(input.contactNumber);
  const whatsappNumber = normalizeIndianPhone10(input.whatsappNumber || input.contactNumber);
  const parsedAge = input.age.trim() ? Math.round(Number(input.age)) : null;

  const nextStatus: RoommateStatus =
    existing.status === 'Rejected' ? 'Pending' : existing.status;

  const altDigits = input.secondaryContact ? normalizeIndianPhone10(input.secondaryContact) : '';
  const secondaryContact = /^[6-9]\d{9}$/.test(altDigits) ? altDigits : null;
  const posterName = (input.name.trim() || existing.name || 'Flatmate').slice(0, 100);
  const finalDescription = (
    input.description.trim().length >= 10
      ? input.description.trim()
      : generateAutoRoommateDescription(input)
  ).slice(0, 2000);

  const editableFields = {
    listingType: 'have_room' as RoommateListingType,
    flatOccupancy: (input.flatOccupancy || existing.flatOccupancy || 'Pre-Occupied Flat') as RoommateFlatOccupancy,
    electricityBill: input.electricityBill?.trim()
      ? input.electricityBill.trim().slice(0, 80)
      : null,
    facilities: Array.isArray(input.facilities) ? input.facilities.slice(0, 15) : [],
    urgent: Boolean(input.urgent),
    shiftingNow: Boolean(input.shiftingNow),
    name: posterName.length >= 2 ? posterName : 'Flatmate',
    contactNumber,
    whatsappNumber,
    secondaryContact,
    gender: input.gender,
    age: parsedAge && parsedAge >= 18 && parsedAge <= 99 ? parsedAge : null,
    occupation: input.occupation,
    roomType: input.roomType,
    location: input.location.trim().slice(0, 160),
    localitySlug: area.slug,
    buildingName: input.buildingName.trim() ? input.buildingName.trim().slice(0, 160) : null,
    showExactAddress: Boolean(input.showExactAddress),
    showPublicContact: Boolean(input.showPublicContact),
    rent: Math.round(Number(input.rent)),
    deposit: Math.round(Number(input.deposit || '0')),
    brokerage: Math.round(Number(input.brokerage || '0')),
    furnishing: input.furnishing,
    availableFrom: input.availableFrom.trim().slice(0, 40),
    existingRoommates: Math.max(0, Math.min(20, Math.round(Number(input.existingRoommates || '1')))),
    peopleRequired: Math.max(1, Math.min(10, Math.round(Number(input.peopleRequired || '1')))),
    preferredGender: input.preferredGender,
    preferredOccupation: input.preferredOccupation,
    preferredAgeRange: input.preferredAgeRange.trim()
      ? input.preferredAgeRange.trim().slice(0, 40)
      : null,
    foodPreference: input.foodPreference.trim() ? input.foodPreference.trim().slice(0, 60) : null,
    smokingPreference: input.smokingPreference.trim()
      ? input.smokingPreference.trim().slice(0, 60)
      : null,
    description: finalDescription,
    images: mergedImages,
    status: nextStatus,
    rejectionReason: nextStatus === 'Pending' ? null : existing.rejectionReason,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, ROOMMATE_MASTER_COLLECTION, existing.listingCode), editableFields);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${ROOMMATE_MASTER_COLLECTION}/${existing.listingCode}`
    );
  }

  // If currently Active, sync the sanitized public fields as well
  if (existing.status === 'Active') {
    const mergedRecord: RoommateListingRecord = {
      ...existing,
      ...editableFields,
      status: 'Active',
      updatedAt: new Date().toISOString(),
    };
    const sanitized = sanitizeRoommateForPublic(mergedRecord);
    try {
      await updateDoc(doc(db, ROOMMATE_PUBLIC_COLLECTION, existing.listingCode), {
        listingType: sanitized.listingType,
        flatOccupancy: sanitized.flatOccupancy,
        electricityBill: sanitized.electricityBill,
        facilities: sanitized.facilities,
        urgent: sanitized.urgent,
        shiftingNow: sanitized.shiftingNow,
        posterFirstName: sanitized.posterFirstName,
        gender: sanitized.gender,
        age: sanitized.age,
        occupation: sanitized.occupation,
        roomType: sanitized.roomType,
        location: sanitized.location,
        localitySlug: sanitized.localitySlug,
        publicBuildingName: sanitized.publicBuildingName,
        showExactAddress: sanitized.showExactAddress,
        showPublicContact: sanitized.showPublicContact,
        publicWhatsappNumber: sanitized.publicWhatsappNumber,
        publicSecondaryContact: sanitized.publicSecondaryContact,
        rent: sanitized.rent,
        deposit: sanitized.deposit,
        brokerage: sanitized.brokerage,
        furnishing: sanitized.furnishing,
        availableFrom: sanitized.availableFrom,
        existingRoommates: sanitized.existingRoommates,
        peopleRequired: sanitized.peopleRequired,
        preferredGender: sanitized.preferredGender,
        preferredOccupation: sanitized.preferredOccupation,
        preferredAgeRange: sanitized.preferredAgeRange,
        foodPreference: sanitized.foodPreference,
        smokingPreference: sanitized.smokingPreference,
        description: sanitized.description,
        images: sanitized.images,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Public roommate sync warning:', error);
    }
  }
}

/**
 * Owner marks their own Active listing as Fulfilled or Unavailable -> removes from public search immediately!
 */
export async function updateMyRoommateStatus(
  listing: RoommateListingRecord,
  nextStatus: 'Fulfilled' | 'Unavailable',
  userUid: string
): Promise<void> {
  if (listing.userId !== userUid) {
    throw new Error('You do not have permission to update this listing.');
  }

  try {
    await updateDoc(doc(db, ROOMMATE_MASTER_COLLECTION, listing.listingCode), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${ROOMMATE_MASTER_COLLECTION}/${listing.listingCode}`
    );
  }

  try {
    await deleteDoc(doc(db, ROOMMATE_PUBLIC_COLLECTION, listing.listingCode));
  } catch {
    // Public doc might already be absent
  }
}

/**
 * Owner renews an expired (or active/fulfilled/unavailable) listing for another 30 days.
 */
export async function renewMyRoommateListing(
  listing: RoommateListingRecord,
  userUid: string
): Promise<void> {
  if (listing.userId !== userUid) {
    throw new Error('You do not have permission to renew this listing.');
  }

  const newExpiry = buildExpiryTimestamp(ROOMMATE_DEFAULT_EXPIRY_DAYS);
  const nextStatus: RoommateStatus = listing.status === 'Active' ? 'Active' : 'Pending';

  try {
    await updateDoc(doc(db, ROOMMATE_MASTER_COLLECTION, listing.listingCode), {
      expiresAt: newExpiry,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${ROOMMATE_MASTER_COLLECTION}/${listing.listingCode}`
    );
  }

  if (listing.status === 'Active') {
    try {
      await updateDoc(doc(db, ROOMMATE_PUBLIC_COLLECTION, listing.listingCode), {
        expiresAt: newExpiry,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Public roommate renewal sync skipped:', error);
    }
  }
}

/**
 * Owner permanently deletes their own roommate listing and cleans up photos & public copy.
 */
export async function deleteMyRoommateListing(
  listing: RoommateListingRecord,
  userUid: string
): Promise<void> {
  if (listing.userId !== userUid) {
    throw new Error('You do not have permission to delete this listing.');
  }

  for (const img of listing.images) {
    if (!img.startsWith(PHOTO_PREFIX)) continue;
    const photoId = img.slice(PHOTO_PREFIX.length);
    try {
      await deleteDoc(doc(db, PHOTOS_COLLECTION, photoId));
    } catch {
      // Ignore already-deleted photos
    }
  }

  try {
    await deleteDoc(doc(db, ROOMMATE_PUBLIC_COLLECTION, listing.listingCode));
  } catch {
    // Ignore if not public
  }

  try {
    await deleteDoc(doc(db, ROOMMATE_MASTER_COLLECTION, listing.listingCode));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `${ROOMMATE_MASTER_COLLECTION}/${listing.listingCode}`
    );
  }
}

/**
 * Any visitor can report a suspicious or outdated roommate listing for admin review.
 */
export async function submitRoommateReport(
  listingCode: string,
  reason: string,
  details: string,
  reporterUid: string | null
): Promise<void> {
  const reportId = generateDocId('rmrep');
  try {
    await setDoc(doc(db, ROOMMATE_REPORTS_COLLECTION, reportId), {
      listingCode,
      reason: reason.trim().slice(0, 120),
      details: details.trim() ? details.trim().slice(0, 600) : null,
      reporterUid: reporterUid || null,
      status: 'open' as RoommateReportStatus,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `${ROOMMATE_REPORTS_COLLECTION}/${reportId}`
    );
  }

  const notifId = generateDocId('notif');
  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), {
      type: 'roommate_report',
      propertyCode: listingCode,
      title: `Roommate Listing Reported (${listingCode})`,
      message: `Reason: ${reason.trim().slice(0, 100)}. Please review in Roommate Management.`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Report saved safely
  }
}

/* ============================================================================
 * SOLE ADMIN ROOMMATE MANAGEMENT OPERATIONS
 * ============================================================================ */

async function setRoommatePhotosPublicFlag(images: string[], isPublic: boolean): Promise<void> {
  for (const img of images) {
    if (!img.startsWith(PHOTO_PREFIX)) continue;
    const photoId = img.slice(PHOTO_PREFIX.length);
    try {
      await updateDoc(doc(db, PHOTOS_COLLECTION, photoId), { isPublic });
    } catch (error) {
      console.warn('Could not update roommate photo visibility:', photoId, error);
    }
  }
}

export async function listAllAdminRoommatesAndReports(): Promise<{
  listings: RoommateListingRecord[];
  reports: RoommateReportRecord[];
  stats: RoommateDashboardStats;
}> {
  try {
    const [listingsSnap, reportsSnap] = await Promise.all([
      getDocs(collection(db, ROOMMATE_MASTER_COLLECTION)),
      getDocs(collection(db, ROOMMATE_REPORTS_COLLECTION)),
    ]);

    const listings = listingsSnap.docs.map((d) =>
      mapDocToMasterRoommate(d.id, d.data() as Record<string, unknown>)
    );
    listings.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const reports: RoommateReportRecord[] = reportsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        listingCode: String(data.listingCode || ''),
        reason: String(data.reason || 'Reported'),
        details: data.details ? String(data.details) : null,
        reporterUid: data.reporterUid ? String(data.reporterUid) : null,
        status: (data.status as RoommateReportStatus) || 'open',
        createdAt: toIsoString(data.createdAt),
      };
    });
    reports.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const stats = computeRoommateStats(listings, reports);
    return { listings, reports, stats };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ROOMMATE_MASTER_COLLECTION);
  }
}

/**
 * Sole Admin: Approve (auto-publishes sanitized doc to `/public_roommates`),
 * Reject, Mark Fulfilled, or Mark Unavailable (auto-removes from `/public_roommates`).
 */
export async function adminUpdateRoommateStatus(
  listingCode: string,
  nextStatus: RoommateStatus,
  rejectionReason?: string
): Promise<void> {
  const masterRef = doc(db, ROOMMATE_MASTER_COLLECTION, listingCode);
  let snap;
  try {
    snap = await getDoc(masterRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ROOMMATE_MASTER_COLLECTION}/${listingCode}`);
  }

  if (!snap.exists()) {
    throw new Error('Roommate listing not found.');
  }

  const raw = snap.data() as Record<string, unknown>;
  const existingRecord = mapDocToMasterRoommate(listingCode, raw);

  const updatedMasterData: Record<string, unknown> = {
    ...raw,
    status: nextStatus,
    rejectionReason:
      nextStatus === 'Rejected' && rejectionReason?.trim()
        ? rejectionReason.trim().slice(0, 500)
        : null,
    approvedAt:
      nextStatus === 'Active'
        ? raw.approvedAt instanceof Timestamp
          ? raw.approvedAt
          : serverTimestamp()
        : raw.approvedAt ?? null,
    expiresAt:
      nextStatus === 'Active' &&
      raw.expiresAt instanceof Timestamp &&
      raw.expiresAt.toMillis() <= Date.now()
        ? buildExpiryTimestamp(ROOMMATE_DEFAULT_EXPIRY_DAYS)
        : raw.expiresAt instanceof Timestamp
          ? raw.expiresAt
          : buildExpiryTimestamp(ROOMMATE_DEFAULT_EXPIRY_DAYS),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(masterRef, updatedMasterData);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${ROOMMATE_MASTER_COLLECTION}/${listingCode}`
    );
  }

  const publicRef = doc(db, ROOMMATE_PUBLIC_COLLECTION, listingCode);
  if (nextStatus === 'Active') {
    const sanitized = sanitizeRoommateForPublic(existingRecord);
    const publicPayload = {
      ...sanitized,
      createdAt: raw.createdAt instanceof Timestamp ? raw.createdAt : serverTimestamp(),
      approvedAt: raw.approvedAt instanceof Timestamp ? raw.approvedAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: updatedMasterData.expiresAt,
    };
    try {
      await setDoc(publicRef, publicPayload);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${ROOMMATE_PUBLIC_COLLECTION}/${listingCode}`
      );
    }
    await setRoommatePhotosPublicFlag(existingRecord.images, true);
  } else {
    try {
      await deleteDoc(publicRef);
    } catch {
      // Ignore if not published
    }
    await setRoommatePhotosPublicFlag(existingRecord.images, false);
  }
}

export async function adminEditRoommateListing(
  existing: RoommateListingRecord,
  edits: {
    listingType: RoommateListingType;
    flatOccupancy?: RoommateFlatOccupancy;
    electricityBill?: string | null;
    urgent?: boolean;
    shiftingNow?: boolean;
    roomType: RoommateRoomType;
    location: string;
    buildingName: string | null;
    rent: number;
    deposit: number;
    brokerage: number;
    furnishing: RoommateFurnishing;
    availableFrom: string;
    existingRoommates: number;
    peopleRequired: number;
    preferredGender: PreferredGender;
    preferredOccupation: PreferredOccupation;
    description: string;
  }
): Promise<void> {
  const masterRef = doc(db, ROOMMATE_MASTER_COLLECTION, existing.listingCode);
  const snap = await getDoc(masterRef);
  if (!snap.exists()) {
    throw new Error('Roommate listing not found.');
  }
  const raw = snap.data() as Record<string, unknown>;
  const area = inferAreaMeta(edits.location);

  const patch = {
    listingType: edits.listingType,
    flatOccupancy: edits.flatOccupancy || existing.flatOccupancy || 'Pre-Occupied Flat',
    electricityBill:
      edits.electricityBill !== undefined
        ? edits.electricityBill?.trim()
          ? edits.electricityBill.trim().slice(0, 80)
          : null
        : existing.electricityBill ?? null,
    urgent: edits.urgent !== undefined ? Boolean(edits.urgent) : Boolean(existing.urgent),
    shiftingNow:
      edits.shiftingNow !== undefined ? Boolean(edits.shiftingNow) : Boolean(existing.shiftingNow),
    roomType: edits.roomType,
    location: edits.location.trim().slice(0, 160),
    localitySlug: area.slug,
    buildingName: edits.buildingName?.trim() ? edits.buildingName.trim().slice(0, 160) : null,
    rent: Math.round(edits.rent),
    deposit: Math.round(edits.deposit),
    brokerage: Math.round(edits.brokerage),
    furnishing: edits.furnishing,
    availableFrom: edits.availableFrom.trim().slice(0, 40),
    existingRoommates: Math.max(0, Math.min(20, Math.round(edits.existingRoommates))),
    peopleRequired: Math.max(1, Math.min(10, Math.round(edits.peopleRequired))),
    preferredGender: edits.preferredGender,
    preferredOccupation: edits.preferredOccupation,
    description: edits.description.trim().slice(0, 2000),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(masterRef, patch);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${ROOMMATE_MASTER_COLLECTION}/${existing.listingCode}`
    );
  }

  if (existing.status === 'Active') {
    const mergedRecord: RoommateListingRecord = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const sanitized = sanitizeRoommateForPublic(mergedRecord);
    try {
      await setDoc(doc(db, ROOMMATE_PUBLIC_COLLECTION, existing.listingCode), {
        ...sanitized,
        createdAt: raw.createdAt instanceof Timestamp ? raw.createdAt : serverTimestamp(),
        approvedAt: raw.approvedAt instanceof Timestamp ? raw.approvedAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt:
          raw.expiresAt instanceof Timestamp
            ? raw.expiresAt
            : buildExpiryTimestamp(ROOMMATE_DEFAULT_EXPIRY_DAYS),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${ROOMMATE_PUBLIC_COLLECTION}/${existing.listingCode}`
      );
    }
  }
}

export async function adminDeleteRoommateListing(listing: RoommateListingRecord): Promise<void> {
  for (const img of listing.images) {
    if (!img.startsWith(PHOTO_PREFIX)) continue;
    const photoId = img.slice(PHOTO_PREFIX.length);
    try {
      await deleteDoc(doc(db, PHOTOS_COLLECTION, photoId));
    } catch {
      // Ignore already-deleted photo
    }
  }

  try {
    await deleteDoc(doc(db, ROOMMATE_PUBLIC_COLLECTION, listing.listingCode));
  } catch {
    // Ignore if not public
  }

  try {
    await deleteDoc(doc(db, ROOMMATE_MASTER_COLLECTION, listing.listingCode));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `${ROOMMATE_MASTER_COLLECTION}/${listing.listingCode}`
    );
  }
}

export async function adminUpdateRoommateReportStatus(
  reportId: string,
  status: RoommateReportStatus
): Promise<void> {
  try {
    await updateDoc(doc(db, ROOMMATE_REPORTS_COLLECTION, reportId), { status });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${ROOMMATE_REPORTS_COLLECTION}/${reportId}`
    );
  }
}
