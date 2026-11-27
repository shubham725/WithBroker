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
  writeBatch,
} from 'firebase/firestore';
import { SAMPLE_PROPERTIES } from '../data/properties';
import type {
  AdminDashboardStats,
  AdminNotification,
  AdminPropertyRecord,
  FurnishingStatus,
  PropertyListing,
  PropertySubmissionInput,
  PropertyType,
  SubmitterRole,
  SuitableFor,
  WorkflowStatus,
} from '../types/property';
import {
  buildDynamicLocalities,
  generateAutoPropertyDescription,
  inferAreaMeta,
} from '../utils/propertyLogic';
import type { AiExtractedPropertyDraft } from '../types/aiPropertyChat';
import { OperationType, db, handleFirestoreError } from './firebase';

export { buildDynamicLocalities, inferAreaMeta };

const PUBLIC_COLLECTION = 'public_properties';
const SUBMISSIONS_COLLECTION = 'property_submissions';
const PHOTOS_COLLECTION = 'property_photos';
const NOTIFICATIONS_COLLECTION = 'admin_notifications';
const META_COLLECTION = 'app_meta';
const CATALOG_META_DOC = 'catalog';

const PHOTO_PREFIX = 'fbphoto://';
const photoDataUrlCache = new Map<string, string>();
const SPAM_COOLDOWN_KEY = 'withbroker-last-submit-ts';

function normalizePhone10(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  return digits.slice(0, 10);
}

function generatePropertyCode(): string {
  const rand = Math.floor(2000 + Math.random() * 7999);
  const suffix = String(Date.now()).slice(-2);
  return `WB-${rand}${suffix}`;
}

function generateDocId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
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

function mapDocToPublicProperty(
  id: string,
  data: Record<string, unknown>
): PropertyListing {
  const workflowStatus = (data.workflowStatus as WorkflowStatus) || 'Available';
  const isRented = workflowStatus === 'Rented';
  const propertyCode = String(data.propertyCode || id);
  const locality = String(data.locality || 'Pune');
  const subLocality = String(data.subLocality || locality);
  const inferred = inferAreaMeta(`${subLocality} ${locality}`);
  const rawSlug = String(data.localitySlug || '');
  const localitySlug = rawSlug && rawSlug !== 'other' ? rawSlug : inferred.slug;

  return {
    id: propertyCode,
    propertyCode,
    title: String(data.title || 'Rental Flat in Pune'),
    propertyType: (data.propertyType as PropertyType) || '1BHK',
    locality,
    subLocality,
    localitySlug,
    societyName: data.societyName ? String(data.societyName) : null,
    publicAreaNote: String(data.publicAreaNote || `${locality} (exact address shared upon inquiry)`),
    coordinates: {
      lat: typeof data.lat === 'number' ? data.lat : inferred.lat,
      lng: typeof data.lng === 'number' ? data.lng : inferred.lng,
    },
    monthlyRent: Number(data.monthlyRent || 0),
    securityDeposit:
      typeof data.securityDeposit === 'number' ? data.securityDeposit : null,
    brokerageStatus: (data.brokerageStatus as PropertyListing['brokerageStatus']) || 'Applicable',
    brokerageAmount: Number(data.brokerageAmount || 0),
    maintenanceCharges: data.maintenanceCharges ? String(data.maintenanceCharges) : undefined,
    furnishing: (data.furnishing as FurnishingStatus) || 'Unfurnished',
    carpetArea: data.carpetArea ? String(data.carpetArea) : undefined,
    builtUpArea: data.builtUpArea ? String(data.builtUpArea) : undefined,
    floorNumber: data.floorNumber ? String(data.floorNumber) : undefined,
    totalFloors: data.totalFloors ? String(data.totalFloors) : undefined,
    floorInfo: data.floorInfo ? String(data.floorInfo) : undefined,
    facing: data.facing ? String(data.facing) : undefined,
    bathrooms: Number(data.bathrooms || 1),
    bathroomType: String(data.bathroomType || '1 Bathroom'),
    balconies: Number(data.balconies || 0),
    parking: String(data.parking || 'Ask on inquiry'),
    waterAvailability: String(data.waterAvailability || '24 Hours Water Supply'),
    liftAvailability: String(data.liftAvailability || 'Ask on inquiry'),
    suitableFor: (data.suitableFor as SuitableFor) || 'Family / Bachelors',
    availableFrom: isRented ? 'Rented Out' : String(data.availableFrom || 'Immediate'),
    availabilityLabel: isRented ? 'Rented Out' : 'Available',
    listingStatus: 'active',
    workflowStatus,
    submitterRole: (data.submitterRole as SubmitterRole) || 'Owner',
    submittedAt: toIsoString(data.submittedAt),
    approvedAt: toOptionalIsoString(data.approvedAt),
    isDemoListing: false,
    shortDescription: String(data.shortDescription || ''),
    fullDescription: String(data.fullDescription || ''),
    additionalNotes: String(data.additionalNotes || ''),
    facilities: Array.isArray(data.facilities)
      ? data.facilities.map((f) => String(f)).slice(0, 15)
      : [],
    images: Array.isArray(data.images)
      ? data.images.map((img) => String(img)).slice(0, 15)
      : [],
  };
}

function mapDocToAdminSubmission(
  docId: string,
  data: Record<string, unknown>,
  index: number
): AdminPropertyRecord {
  const base = mapDocToPublicProperty(docId, data);
  const workflowStatus = (data.workflowStatus as WorkflowStatus) || 'Pending';
  return {
    ...base,
    id: docId,
    dbId: index + 1,
    workflowStatus,
    availabilityLabel: workflowStatus === 'Rented' ? 'Rented Out' : 'Available',
    submitterName: String(data.submitterName || 'WithBroker'),
    submitterMobile: String(data.submitterMobile || '9834626078'),
    submitterWhatsapp: String(data.submitterWhatsapp || '9834626078'),
    submitterRole: (data.submitterRole as SubmitterRole) || 'Owner',
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : null,
    submittedAt: toIsoString(data.submittedAt),
    approvedAt: toOptionalIsoString(data.approvedAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

/**
 * Compresses an uploaded image file cleanly under 380KB for Firestore document storage.
 * Uses zero-copy Object URLs + immediate canvas buffer release so mobile devices never spike RAM or blank out.
 */
export async function compressImageFileToDataUrl(
  file: File
): Promise<{ dataUrl: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; filename: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'photo.jpg';

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (cb: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      cb();
    };

    const timer = window.setTimeout(() => {
      finish(() =>
        reject(new Error(`Photo "${file.name}" took too long to process. Please try a JPG or PNG photo.`))
      );
    }, 15_000);

    const img = new Image();
    img.decoding = 'async';
    img.onerror = () =>
      finish(() =>
        reject(new Error(`Photo "${file.name}" could not be read. Please select a JPG, PNG, or WebP photo.`))
      );

    img.onload = () => {
      try {
        let maxDim = 1024;
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const renderToJpeg = (w: number, h: number, q: number): string => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          if (!ctx) {
            throw new Error('Browser canvas unavailable for image compression.');
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const result = c.toDataURL('image/jpeg', q);
          // Immediately free mobile GPU/RAM backing store
          c.width = 0;
          c.height = 0;
          return result;
        };

        let quality = 0.76;
        let dataUrl = renderToJpeg(width, height, quality);

        while (dataUrl.length > 380_000 && quality > 0.32) {
          quality -= 0.14;
          dataUrl = renderToJpeg(width, height, quality);
        }

        // Guarantee <= 380KB even for ultra-detailed phone camera shots (Firestore rule ceiling is 450KB)
        let attempts = 0;
        while (dataUrl.length > 380_000 && attempts < 4) {
          attempts += 1;
          width = Math.max(240, Math.round(width * 0.72));
          height = Math.max(180, Math.round(height * 0.72));
          dataUrl = renderToJpeg(width, height, 0.55);
        }

        if (dataUrl.length > 440_000) {
          throw new Error(`Photo "${file.name}" is too large even after compression.`);
        }

        finish(() =>
          resolve({
            dataUrl,
            mimeType: 'image/jpeg',
            filename: safeName,
          })
        );
      } catch (err) {
        finish(() =>
          reject(err instanceof Error ? err : new Error(`Could not compress "${file.name}".`))
        );
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Resolves `fbphoto://<photoId>` URLs via Firestore with in-memory caching.
 */
export async function resolveFirestorePhotoUrl(rawUrl: string): Promise<string> {
  if (!rawUrl || !rawUrl.startsWith(PHOTO_PREFIX)) {
    return rawUrl;
  }
  const photoId = rawUrl.slice(PHOTO_PREFIX.length);
  const cached = photoDataUrlCache.get(photoId);
  if (cached) return cached;

  try {
    const snap = await getDoc(doc(db, PHOTOS_COLLECTION, photoId));
    if (!snap.exists()) return '';
    const dataUrl = String(snap.data()?.dataUrl || '');
    if (dataUrl) {
      photoDataUrlCache.set(photoId, dataUrl);
    }
    return dataUrl;
  } catch (error) {
    console.warn('Unable to load Firestore photo:', photoId, error);
    return '';
  }
}

function getFallbackSeedListings(): PropertyListing[] {
  return SAMPLE_PROPERTIES.filter((prop) => prop.listingStatus === 'active').map((prop) => {
    const inferred = inferAreaMeta(`${prop.subLocality} ${prop.locality}`);
    const isRented =
      prop.availabilityLabel === 'Rented Out' || prop.propertyCode === 'WB-1006';
    return {
      ...prop,
      localitySlug:
        prop.localitySlug && prop.localitySlug !== 'other'
          ? prop.localitySlug
          : inferred.slug,
      workflowStatus: isRented ? 'Rented' : 'Available',
      availabilityLabel: isRented ? 'Rented Out' : 'Available',
      availableFrom: isRented ? 'Rented Out' : prop.availableFrom,
    };
  });
}

/**
 * Real-time public subscription to approved properties (`Available` and `Rented`).
 * Works natively on Vercel & AI Studio with zero Express backend required!
 */
export function subscribePublicProperties(
  onUpdate: (listings: PropertyListing[]) => void,
  onError?: (err: Error) => void
): () => void {
  const publicQuery = query(
    collection(db, PUBLIC_COLLECTION),
    where('workflowStatus', 'in', ['Available', 'Rented'])
  );

  let seededFlagChecked = false;
  let isCatalogSeeded = false;

  const checkSeededMeta = async () => {
    if (seededFlagChecked) return isCatalogSeeded;
    seededFlagChecked = true;
    try {
      const metaSnap = await getDoc(doc(db, META_COLLECTION, CATALOG_META_DOC));
      isCatalogSeeded = metaSnap.exists() && metaSnap.data()?.seeded === true;
    } catch {
      isCatalogSeeded = false;
    }
    return isCatalogSeeded;
  };

  return onSnapshot(
    publicQuery,
    async (snapshot) => {
      const firestoreItems = snapshot.docs.map((d) =>
        mapDocToPublicProperty(d.id, d.data() as Record<string, unknown>)
      );

      // Sort newest approved / submitted first
      firestoreItems.sort((a, b) => {
        const tA = new Date(a.approvedAt || a.submittedAt || 0).getTime();
        const tB = new Date(b.approvedAt || b.submittedAt || 0).getTime();
        return tB - tA;
      });

      if (firestoreItems.length > 0) {
        onUpdate(firestoreItems);
        return;
      }

      // Before the sole admin's first sign-in seeds the 9 real Pune listings into Firestore,
      // show the 9 real Pune listings immediately so Vercel never shows empty or error!
      const alreadySeeded = await checkSeededMeta();
      if (!alreadySeeded) {
        onUpdate(getFallbackSeedListings());
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.error('Public properties snapshot error:', error);
      // Graceful fallback to verified baseline listings rather than locking visitors out
      onUpdate(getFallbackSeedListings());
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );
}

/**
 * Public property submission (NO login required — owners & brokers submit free!).
 * Strictly saved as workflowStatus: 'Pending' + private photos (`isPublic: false`).
 */
export async function submitPublicProperty(
  input: PropertySubmissionInput,
  photoFiles: File[],
  onProgress?: (stage: string) => void
): Promise<{ propertyCode: string; submittedAt: string; photoCount: number }> {
  // Light client anti-spam cooldown (15s between submissions from the same browser)
  if (typeof window !== 'undefined') {
    try {
      const lastTs = Number(window.localStorage.getItem(SPAM_COOLDOWN_KEY) || '0');
      if (lastTs && Date.now() - lastTs < 15_000) {
        throw new Error('Please wait a few seconds before submitting another property.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Please wait')) {
        throw err;
      }
    }
  }

  const propertyCode = generatePropertyCode();
  const area = inferAreaMeta(input.location);
  const mobile = normalizePhone10(input.mobile);
  const whatsapp = normalizePhone10(input.whatsapp || input.mobile);

  const monthlyRent = Math.round(Number(input.monthlyRent));
  const securityDeposit = Math.round(Number(input.securityDeposit));
  const brokerageAmount = Math.round(Number(input.brokerageAmount || '0'));
  const bathrooms = Math.max(1, Math.min(10, Math.round(Number(input.bathrooms || '1'))));
  const balconies = Math.max(0, Math.min(10, Math.round(Number(input.balconies || '0'))));

  const titlePrefix = input.furnishingStatus === 'Unfurnished' ? '' : `${input.furnishingStatus} `;
  const title = `${titlePrefix}${input.propertyType} in ${input.societyName.trim() || area.label}`.slice(
    0,
    180
  );
  const floorInfo =
    input.floorNumber.trim() && input.totalFloors.trim()
      ? `Floor ${input.floorNumber.trim()} of ${input.totalFloors.trim()}`
      : input.floorNumber.trim()
        ? `Floor ${input.floorNumber.trim()}`
        : null;

  // Compress & upload photos ONE AT A TIME on mobile so RAM never spikes and the screen stays responsive
  const filesToUpload = photoFiles.slice(0, 8);
  const photoRefs: string[] = [];
  for (let i = 0; i < filesToUpload.length; i += 1) {
    const file = filesToUpload[i];
    onProgress?.(`Processing photo ${i + 1} of ${filesToUpload.length}...`);
    // Yield to browser paint loop so mobile UI never freezes
    await new Promise((r) => window.setTimeout(r, 0));
    const compressed = await compressImageFileToDataUrl(file);

    onProgress?.(`Uploading photo ${i + 1} of ${filesToUpload.length}...`);
    const photoId = generateDocId('photo');
    try {
      await setDoc(doc(db, PHOTOS_COLLECTION, photoId), {
        propertyCode,
        filename: compressed.filename,
        mimeType: compressed.mimeType,
        dataUrl: compressed.dataUrl,
        isPublic: false,
        createdAt: serverTimestamp(),
      });
      photoDataUrlCache.set(photoId, compressed.dataUrl);
      photoRefs.push(`${PHOTO_PREFIX}${photoId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${PHOTOS_COLLECTION}/${photoId}`);
    }
  }

  onProgress?.('Saving property listing...');

  const hasExactCoords =
    typeof input.lat === 'number' &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng) &&
    input.lat >= -90 &&
    input.lat <= 90 &&
    input.lng >= -180 &&
    input.lng <= 180;

  const resolvedLat = hasExactCoords ? (input.lat as number) : area.lat;
  const resolvedLng = hasExactCoords ? (input.lng as number) : area.lng;

  const finalDescription =
    input.description.trim().length >= 10
      ? input.description.trim()
      : generateAutoPropertyDescription(input);

  const submissionPayload = {
    propertyCode,
    title,
    propertyType: input.propertyType as PropertyType,
    locality: input.location.trim().slice(0, 180),
    subLocality: area.label.slice(0, 140),
    localitySlug: area.slug,
    societyName: input.societyName.trim() ? input.societyName.trim().slice(0, 160) : null,
    publicAreaNote: `${input.location.trim().slice(0, 160)} (exact address shared upon inquiry)`,
    lat: resolvedLat,
    lng: resolvedLng,
    monthlyRent,
    securityDeposit,
    brokerageStatus: brokerageAmount > 0 ? 'Applicable' : 'No Brokerage',
    brokerageAmount,
    maintenanceCharges: null,
    furnishing: input.furnishingStatus,
    carpetArea: input.carpetArea.trim() ? input.carpetArea.trim().slice(0, 60) : null,
    builtUpArea: null,
    floorNumber: input.floorNumber.trim() ? input.floorNumber.trim().slice(0, 30) : null,
    totalFloors: input.totalFloors.trim() ? input.totalFloors.trim().slice(0, 30) : null,
    floorInfo: floorInfo ? floorInfo.slice(0, 80) : null,
    facing: null,
    bathrooms,
    bathroomType: `${bathrooms} Bathroom${bathrooms > 1 ? 's' : ''}`,
    balconies,
    parking: input.facilities.some((f) => f.toLowerCase().includes('parking'))
      ? 'Available'
      : 'Ask on inquiry',
    waterAvailability: input.facilities.some((f) => f.toLowerCase().includes('water'))
      ? '24 Hours Water Supply'
      : 'Ask on inquiry',
    liftAvailability: input.facilities.some((f) => f.toLowerCase().includes('lift'))
      ? 'Lift Available'
      : 'Ask on inquiry',
    suitableFor: 'Family / Bachelors',
    availableFrom: (input.availableFrom.trim() || 'Immediate').slice(0, 60),
    shortDescription: finalDescription.slice(0, 220),
    fullDescription: finalDescription.slice(0, 2500),
    additionalNotes:
      brokerageAmount > 0
        ? `Brokerage ₹${brokerageAmount.toLocaleString('en-IN')}.`
        : 'Direct owner / zero brokerage listing.',
    facilities: input.facilities.slice(0, 15),
    images: photoRefs,
    submitterName: input.name.trim().slice(0, 100),
    submitterMobile: mobile,
    submitterWhatsapp: whatsapp,
    submitterRole: input.submitterRole,
    workflowStatus: 'Pending',
    rejectionReason: null,
    submittedAt: serverTimestamp(),
    approvedAt: null,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, SUBMISSIONS_COLLECTION, propertyCode), submissionPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  // Create unread notification for the sole admin
  const notifId = generateDocId('notif');
  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), {
      type: 'submission',
      propertyCode,
      title: `New ${input.submitterRole} Submission (${propertyCode})`,
      message: `${input.name.trim()} submitted a ${input.propertyType} in ${input.location.trim()} at ₹${monthlyRent.toLocaleString('en-IN')}/month.`,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Submission already saved safely; log notification failure cleanly
    console.warn('Admin notification creation skipped:', error);
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SPAM_COOLDOWN_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors
    }
  }

  return {
    propertyCode,
    submittedAt: new Date().toISOString(),
    photoCount: photoRefs.length,
  };
}

/**
 * Sole Admin: Automatically seeds the 9 existing real Pune listings into Firestore once
 * so all existing flats are fully manageable, editable, rentable, and deletable on Vercel & AI Studio.
 */
export async function ensureInitialCatalogSeededByAdmin(): Promise<void> {
  try {
    const metaRef = doc(db, META_COLLECTION, CATALOG_META_DOC);
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists() && metaSnap.data()?.seeded === true) {
      return;
    }

    const batch = writeBatch(db);
    const baselines = getFallbackSeedListings();

    for (const prop of baselines) {
      const code = prop.propertyCode;
      const status: WorkflowStatus = prop.workflowStatus === 'Rented' ? 'Rented' : 'Available';
      const inferred = inferAreaMeta(`${prop.subLocality} ${prop.locality}`);
      const slug =
        prop.localitySlug && prop.localitySlug !== 'other'
          ? prop.localitySlug
          : inferred.slug;

      const commonFields = {
        propertyCode: code,
        title: prop.title.slice(0, 180),
        propertyType: prop.propertyType,
        locality: prop.locality.slice(0, 180),
        subLocality: prop.subLocality.slice(0, 140),
        localitySlug: slug,
        societyName: prop.societyName ? prop.societyName.slice(0, 160) : null,
        publicAreaNote: prop.publicAreaNote.slice(0, 260),
        lat: prop.coordinates.lat,
        lng: prop.coordinates.lng,
        monthlyRent: prop.monthlyRent,
        securityDeposit: prop.securityDeposit ?? null,
        brokerageStatus: prop.brokerageStatus,
        brokerageAmount: prop.brokerageAmount ?? 0,
        maintenanceCharges: prop.maintenanceCharges ?? null,
        furnishing: prop.furnishing,
        carpetArea: prop.carpetArea ?? null,
        builtUpArea: prop.builtUpArea ?? null,
        floorNumber: prop.floorNumber ?? null,
        totalFloors: prop.totalFloors ?? null,
        floorInfo: prop.floorInfo ?? null,
        facing: prop.facing ?? null,
        bathrooms: prop.bathrooms ?? 1,
        bathroomType: prop.bathroomType,
        balconies: prop.balconies ?? 0,
        parking: prop.parking,
        waterAvailability: prop.waterAvailability,
        liftAvailability: prop.liftAvailability,
        suitableFor: prop.suitableFor,
        availableFrom: status === 'Rented' ? 'Rented Out' : prop.availableFrom,
        shortDescription: prop.shortDescription.slice(0, 400),
        fullDescription: prop.fullDescription.slice(0, 2500),
        additionalNotes: prop.additionalNotes.slice(0, 500),
        facilities: prop.facilities.slice(0, 15),
        images: prop.images.slice(0, 15),
        submitterRole: prop.submitterRole || 'Broker',
        workflowStatus: status,
        submittedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(doc(db, SUBMISSIONS_COLLECTION, code), {
        ...commonFields,
        submitterName: 'WithBroker Team',
        submitterMobile: '9834626078',
        submitterWhatsapp: '9834626078',
        rejectionReason: null,
      });

      batch.set(doc(db, PUBLIC_COLLECTION, code), {
        ...commonFields,
        availabilityLabel: status === 'Rented' ? 'Rented Out' : 'Available',
      });
    }

    batch.set(metaRef, {
      seeded: true,
      seededAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${META_COLLECTION}/${CATALOG_META_DOC}`);
  }
}

/**
 * Sole Admin: Fetch all submissions + 8 KPI metrics.
 */
export async function listAdminSubmissionsAndStats(): Promise<{
  properties: AdminPropertyRecord[];
  stats: AdminDashboardStats;
}> {
  try {
    const snap = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const records = snap.docs.map((d, idx) =>
      mapDocToAdminSubmission(d.id, d.data() as Record<string, unknown>, idx)
    );

    records.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    const stats: AdminDashboardStats = {
      total: records.length,
      pending: records.filter((r) => r.workflowStatus === 'Pending').length,
      approved: records.filter(
        (r) => r.workflowStatus === 'Available' || r.workflowStatus === 'Rented'
      ).length,
      rejected: records.filter((r) => r.workflowStatus === 'Rejected').length,
      available: records.filter((r) => r.workflowStatus === 'Available').length,
      rented: records.filter((r) => r.workflowStatus === 'Rented').length,
      ownerSubmissions: records.filter((r) => r.submitterRole === 'Owner').length,
      brokerSubmissions: records.filter((r) => r.submitterRole === 'Broker').length,
    };

    return { properties: records, stats };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SUBMISSIONS_COLLECTION);
  }
}

function buildPublicDocPayloadFromRaw(
  raw: Record<string, unknown>,
  status: 'Available' | 'Rented'
): Record<string, unknown> {
  const isRented = status === 'Rented';
  const locality = String(raw.locality || 'Pune');
  const subLocality = String(raw.subLocality || locality);
  const inferred = inferAreaMeta(`${subLocality} ${locality}`);
  const rawSlug = String(raw.localitySlug || '');
  const localitySlug = rawSlug && rawSlug !== 'other' ? rawSlug : inferred.slug;

  return {
    propertyCode: raw.propertyCode,
    title: raw.title,
    propertyType: raw.propertyType,
    locality,
    subLocality,
    localitySlug,
    societyName: raw.societyName ?? null,
    publicAreaNote: raw.publicAreaNote || `${locality} (exact address shared upon inquiry)`,
    lat: typeof raw.lat === 'number' ? raw.lat : inferred.lat,
    lng: typeof raw.lng === 'number' ? raw.lng : inferred.lng,
    monthlyRent: Number(raw.monthlyRent),
    securityDeposit: raw.securityDeposit ?? null,
    brokerageStatus: raw.brokerageStatus || 'Applicable',
    brokerageAmount: Number(raw.brokerageAmount ?? 0),
    maintenanceCharges: raw.maintenanceCharges ?? null,
    furnishing: raw.furnishing,
    carpetArea: raw.carpetArea ?? null,
    builtUpArea: raw.builtUpArea ?? null,
    floorNumber: raw.floorNumber ?? null,
    totalFloors: raw.totalFloors ?? null,
    floorInfo: raw.floorInfo ?? null,
    facing: raw.facing ?? null,
    bathrooms: Number(raw.bathrooms ?? 1),
    bathroomType: raw.bathroomType || '1 Bathroom',
    balconies: Number(raw.balconies ?? 0),
    parking: raw.parking || 'Ask on inquiry',
    waterAvailability: raw.waterAvailability || '24 Hours Water Supply',
    liftAvailability: raw.liftAvailability || 'Ask on inquiry',
    suitableFor: raw.suitableFor || 'Family / Bachelors',
    availableFrom: isRented ? 'Rented Out' : raw.availableFrom || 'Immediate',
    availabilityLabel: isRented ? 'Rented Out' : 'Available',
    workflowStatus: status,
    submitterRole: raw.submitterRole || 'Owner',
    shortDescription: raw.shortDescription || '',
    fullDescription: raw.fullDescription || '',
    additionalNotes: raw.additionalNotes || '',
    facilities: Array.isArray(raw.facilities) ? raw.facilities.slice(0, 15) : [],
    images: Array.isArray(raw.images) ? raw.images.slice(0, 15) : [],
    submittedAt: raw.submittedAt instanceof Timestamp ? raw.submittedAt : serverTimestamp(),
    approvedAt: raw.approvedAt instanceof Timestamp ? raw.approvedAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function setPhotosPublicFlag(images: string[], isPublic: boolean): Promise<void> {
  for (const img of images) {
    if (!img.startsWith(PHOTO_PREFIX)) continue;
    const photoId = img.slice(PHOTO_PREFIX.length);
    try {
      await updateDoc(doc(db, PHOTOS_COLLECTION, photoId), { isPublic });
    } catch (error) {
      console.warn('Could not update photo visibility:', photoId, error);
    }
  }
}

async function createAdminAuditNotification(
  type: AdminNotification['type'],
  propertyCode: string,
  title: string,
  message: string
): Promise<void> {
  const notifId = generateDocId('notif');
  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notifId), {
      type,
      propertyCode,
      title: title.slice(0, 140),
      message: message.slice(0, 400),
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to log admin notification:', error);
  }
}

/**
 * Sole Admin: Approve, Reject, Mark as Rented, or Mark as Available.
 * Automatically publishes/updates/removes from `public_properties` and flips photo privacy!
 */
export async function adminUpdateSubmissionStatus(
  propertyCode: string,
  nextStatus: WorkflowStatus,
  rejectionReason?: string
): Promise<void> {
  const subRef = doc(db, SUBMISSIONS_COLLECTION, propertyCode);
  let snap;
  try {
    snap = await getDoc(subRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  if (!snap.exists()) {
    throw new Error('Property record not found.');
  }

  const raw = snap.data() as Record<string, unknown>;
  const images = Array.isArray(raw.images) ? raw.images.map(String) : [];

  const updatedSubData: Record<string, unknown> = {
    ...raw,
    workflowStatus: nextStatus,
    rejectionReason:
      nextStatus === 'Rejected' && rejectionReason?.trim()
        ? rejectionReason.trim().slice(0, 500)
        : null,
    approvedAt:
      nextStatus === 'Available'
        ? raw.approvedAt instanceof Timestamp
          ? raw.approvedAt
          : serverTimestamp()
        : raw.approvedAt ?? null,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(subRef, updatedSubData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  const pubRef = doc(db, PUBLIC_COLLECTION, propertyCode);
  if (nextStatus === 'Available' || nextStatus === 'Rented') {
    const publicPayload = buildPublicDocPayloadFromRaw(updatedSubData, nextStatus);
    try {
      await setDoc(pubRef, publicPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${PUBLIC_COLLECTION}/${propertyCode}`);
    }
    await setPhotosPublicFlag(images, true);
  } else {
    try {
      await deleteDoc(pubRef);
    } catch {
      // Public doc may not exist if never approved
    }
    await setPhotosPublicFlag(images, false);
  }

  const notifType: AdminNotification['type'] =
    nextStatus === 'Available'
      ? raw.workflowStatus === 'Rented'
        ? 'available'
        : 'approved'
      : nextStatus === 'Rejected'
        ? 'rejected'
        : 'rented';

  await createAdminAuditNotification(
    notifType,
    propertyCode,
    `${propertyCode} marked ${nextStatus}`,
    `${String(raw.title || propertyCode)} status updated to ${nextStatus}.`
  );
}

/**
 * Sole Admin: Edit property details (automatically syncs live public listing if approved!).
 */
export async function adminEditSubmission(
  propertyCode: string,
  edits: {
    title: string;
    propertyType: PropertyType;
    locality: string;
    societyName: string | null;
    monthlyRent: number;
    securityDeposit: number | null;
    brokerageAmount: number;
    furnishing: FurnishingStatus;
    availableFrom: string;
    bathrooms: number;
    balconies: number;
    floorNumber: string | null;
    totalFloors: string | null;
    carpetArea: string | null;
    fullDescription: string;
    submitterRole: SubmitterRole;
  }
): Promise<void> {
  const subRef = doc(db, SUBMISSIONS_COLLECTION, propertyCode);
  let snap;
  try {
    snap = await getDoc(subRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  if (!snap.exists()) {
    throw new Error('Property record not found.');
  }

  const raw = snap.data() as Record<string, unknown>;
  const area = inferAreaMeta(edits.locality);
  const floorInfo =
    edits.floorNumber && edits.totalFloors
      ? `Floor ${edits.floorNumber} of ${edits.totalFloors}`
      : edits.floorNumber
        ? `Floor ${edits.floorNumber}`
        : null;

  const updatedSubData: Record<string, unknown> = {
    ...raw,
    title: edits.title.trim().slice(0, 180),
    propertyType: edits.propertyType,
    locality: edits.locality.trim().slice(0, 180),
    subLocality: area.label.slice(0, 140),
    localitySlug: area.slug,
    societyName: edits.societyName?.trim() ? edits.societyName.trim().slice(0, 160) : null,
    publicAreaNote: `${edits.locality.trim().slice(0, 160)} (exact address shared upon inquiry)`,
    lat: area.lat,
    lng: area.lng,
    monthlyRent: Math.round(edits.monthlyRent),
    securityDeposit:
      edits.securityDeposit !== null ? Math.round(edits.securityDeposit) : null,
    brokerageAmount: Math.round(edits.brokerageAmount),
    brokerageStatus: edits.brokerageAmount > 0 ? 'Applicable' : 'No Brokerage',
    furnishing: edits.furnishing,
    availableFrom: edits.availableFrom.trim().slice(0, 60) || 'Immediate',
    bathrooms: Math.max(1, Math.min(10, Math.round(edits.bathrooms))),
    balconies: Math.max(0, Math.min(10, Math.round(edits.balconies))),
    floorNumber: edits.floorNumber?.trim() ? edits.floorNumber.trim().slice(0, 30) : null,
    totalFloors: edits.totalFloors?.trim() ? edits.totalFloors.trim().slice(0, 30) : null,
    floorInfo: floorInfo ? floorInfo.slice(0, 80) : null,
    carpetArea: edits.carpetArea?.trim() ? edits.carpetArea.trim().slice(0, 60) : null,
    shortDescription: edits.fullDescription.trim().slice(0, 220),
    fullDescription: edits.fullDescription.trim().slice(0, 2500),
    submitterRole: edits.submitterRole,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(subRef, updatedSubData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  // Auto-sync live public listing if currently live (`Available` or `Rented`)
  const status = String(raw.workflowStatus || 'Pending');
  if (status === 'Available' || status === 'Rented') {
    const publicPayload = buildPublicDocPayloadFromRaw(
      updatedSubData,
      status as 'Available' | 'Rented'
    );
    try {
      await setDoc(doc(db, PUBLIC_COLLECTION, propertyCode), publicPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${PUBLIC_COLLECTION}/${propertyCode}`);
    }
  }
}

/**
 * Sole Admin: Permanently delete property from submissions, public catalog, and photo docs.
 */
export async function adminDeleteSubmission(propertyCode: string): Promise<void> {
  const subRef = doc(db, SUBMISSIONS_COLLECTION, propertyCode);
  let snap;
  try {
    snap = await getDoc(subRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  const raw = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  const images = raw && Array.isArray(raw.images) ? raw.images.map(String) : [];

  for (const img of images) {
    if (!img.startsWith(PHOTO_PREFIX)) continue;
    const photoId = img.slice(PHOTO_PREFIX.length);
    try {
      await deleteDoc(doc(db, PHOTOS_COLLECTION, photoId));
      photoDataUrlCache.delete(photoId);
    } catch {
      // Ignore already-deleted photo docs
    }
  }

  try {
    await deleteDoc(doc(db, PUBLIC_COLLECTION, propertyCode));
  } catch {
    // Public doc might not exist for pending/rejected items
  }

  try {
    await deleteDoc(subRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  await createAdminAuditNotification(
    'deleted',
    propertyCode,
    `${propertyCode} deleted`,
    `${String(raw?.title || propertyCode)} was permanently removed by admin.`
  );
}

export async function listAdminNotificationsFromFirestore(): Promise<{
  notifications: Array<AdminNotification & { docId: string }>;
  unreadCount: number;
}> {
  try {
    const snap = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));
    const list = snap.docs.map((d, idx) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: idx + 1,
        docId: d.id,
        type: (data.type as AdminNotification['type']) || 'submission',
        propertyId: null,
        propertyCode: String(data.propertyCode || ''),
        title: String(data.title || 'Update'),
        message: String(data.message || ''),
        isRead: Boolean(data.isRead),
        createdAt: toIsoString(data.createdAt),
      };
    });

    list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      notifications: list.slice(0, 40),
      unreadCount: list.filter((n) => !n.isRead).length,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COLLECTION);
  }
}

export async function markAllAdminNotificationsRead(docIds: string[]): Promise<void> {
  if (docIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const id of docIds) {
      batch.update(doc(db, NOTIFICATIONS_COLLECTION, id), { isRead: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
  }
}

/**
 * Sole Admin: Directly creates a new rental property (with uploaded photos) from the Admin AI Chatbot.
 * Supports publishing live immediately (`workflowStatus: 'Available'`) or saving as `'Pending'`.
 * Strictly adheres to every field boundary in `firestore.rules`.
 */
export async function adminCreatePropertyFromAiDraft(
  draft: AiExtractedPropertyDraft,
  photoFiles: File[],
  publishMode: 'Available' | 'Pending' = 'Available',
  onProgress?: (stage: string) => void
): Promise<{
  propertyCode: string;
  workflowStatus: WorkflowStatus;
  photoCount: number;
  title: string;
}> {
  if (!draft.propertyType) {
    throw new Error('Property type (1RK, 1BHK, 2BHK, or 3BHK) is required.');
  }
  const cleanLocation = draft.location.trim().slice(0, 180);
  if (cleanLocation.length < 2) {
    throw new Error('Property location is required.');
  }
  const monthlyRent = Math.round(Number(draft.monthlyRent || 0));
  if (!Number.isFinite(monthlyRent) || monthlyRent < 1000 || monthlyRent > 500000) {
    throw new Error('Monthly rent must be between ₹1,000 and ₹5,00,000.');
  }

  const propertyCode = generatePropertyCode();
  const area = inferAreaMeta(cleanLocation);
  const isPublicListing = publishMode === 'Available';

  const rawMobile = normalizePhone10(draft.submitterMobile || '9834626078');
  const submitterMobile = /^[6-9]\d{9}$/.test(rawMobile) ? rawMobile : '9834626078';
  const rawWhatsapp = normalizePhone10(draft.submitterWhatsapp || submitterMobile);
  const submitterWhatsapp = /^[6-9]\d{9}$/.test(rawWhatsapp) ? rawWhatsapp : submitterMobile;
  const submitterName =
    draft.submitterName.trim().length >= 2
      ? draft.submitterName.trim().slice(0, 100)
      : 'WithBroker Team';

  const securityDeposit =
    draft.securityDeposit !== null &&
    Number.isFinite(draft.securityDeposit) &&
    draft.securityDeposit >= 0
      ? Math.min(5000000, Math.round(draft.securityDeposit))
      : null;

  const brokerageAmount =
    draft.brokerageAmount !== null &&
    Number.isFinite(draft.brokerageAmount) &&
    draft.brokerageAmount >= 0
      ? Math.min(1000000, Math.round(draft.brokerageAmount))
      : 0;

  const bathrooms = Math.max(1, Math.min(10, Math.round(Number(draft.bathrooms || 1))));
  const balconies = Math.max(0, Math.min(10, Math.round(Number(draft.balconies || 0))));

  const titlePrefix = draft.furnishingStatus === 'Unfurnished' ? '' : `${draft.furnishingStatus} `;
  const fallbackTitle = `${titlePrefix}${draft.propertyType} in ${draft.societyName.trim() || area.label}`;
  const title = (draft.title.trim().length >= 3 ? draft.title.trim() : fallbackTitle).slice(0, 180);

  const floorNum = draft.floorNumber.trim().slice(0, 30);
  const totalFl = draft.totalFloors.trim().slice(0, 30);
  const floorInfo =
    floorNum && totalFl
      ? `Floor ${floorNum} of ${totalFl}`
      : floorNum
        ? `Floor ${floorNum}`
        : null;

  const facilities = Array.from(
    new Set(
      (draft.facilities || [])
        .map((f) => String(f).trim().slice(0, 60))
        .filter((f) => f.length >= 2)
    )
  ).slice(0, 15);

  const filesToUpload = photoFiles.slice(0, 8);
  const photoRefs: string[] = [];
  for (let i = 0; i < filesToUpload.length; i += 1) {
    const file = filesToUpload[i];
    onProgress?.(`Processing photo ${i + 1} of ${filesToUpload.length}...`);
    await new Promise((r) => window.setTimeout(r, 0));
    const compressed = await compressImageFileToDataUrl(file);

    onProgress?.(`Uploading photo ${i + 1} of ${filesToUpload.length}...`);
    const photoId = generateDocId('photo');
    try {
      await setDoc(doc(db, PHOTOS_COLLECTION, photoId), {
        propertyCode,
        filename: compressed.filename,
        mimeType: compressed.mimeType,
        dataUrl: compressed.dataUrl,
        isPublic: isPublicListing,
        createdAt: serverTimestamp(),
      });
      photoDataUrlCache.set(photoId, compressed.dataUrl);
      photoRefs.push(`${PHOTO_PREFIX}${photoId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${PHOTOS_COLLECTION}/${photoId}`);
    }
  }

  onProgress?.(isPublicListing ? 'Publishing flat live on WithBroker...' : 'Saving flat as Pending...');

  const fallbackDesc = generateAutoPropertyDescription({
    name: submitterName,
    mobile: submitterMobile,
    whatsapp: submitterWhatsapp,
    submitterRole: draft.submitterRole,
    propertyType: draft.propertyType,
    location: cleanLocation,
    societyName: draft.societyName,
    monthlyRent: String(monthlyRent),
    securityDeposit: securityDeposit !== null ? String(securityDeposit) : '0',
    brokerageAmount: String(brokerageAmount),
    furnishingStatus: draft.furnishingStatus,
    availableFrom: draft.availableFrom || 'Immediate',
    bathrooms: String(bathrooms),
    balconies: String(balconies),
    floorNumber: floorNum,
    totalFloors: totalFl,
    carpetArea: draft.carpetArea,
    description: '',
    facilities,
    photoNames: [],
  });

  const finalDescription = (
    draft.description.trim().length >= 15 ? draft.description.trim() : fallbackDesc
  ).slice(0, 2500);

  const commonFields = {
    propertyCode,
    title,
    propertyType: draft.propertyType as PropertyType,
    locality: cleanLocation,
    subLocality: (area.label || cleanLocation).slice(0, 140),
    localitySlug: area.slug || 'other',
    societyName: draft.societyName.trim() ? draft.societyName.trim().slice(0, 160) : null,
    publicAreaNote: `${cleanLocation.slice(0, 160)} (exact address shared upon inquiry)`,
    lat: area.lat,
    lng: area.lng,
    monthlyRent,
    securityDeposit,
    brokerageStatus: brokerageAmount > 0 ? 'Applicable' : 'No Brokerage',
    brokerageAmount,
    maintenanceCharges: null,
    furnishing: draft.furnishingStatus,
    carpetArea: draft.carpetArea.trim() ? draft.carpetArea.trim().slice(0, 60) : null,
    builtUpArea: null,
    floorNumber: floorNum || null,
    totalFloors: totalFl || null,
    floorInfo: floorInfo ? floorInfo.slice(0, 80) : null,
    facing: null,
    bathrooms,
    bathroomType: `${bathrooms} Bathroom${bathrooms > 1 ? 's' : ''}`,
    balconies,
    parking: (draft.parking.trim() || 'Ask on inquiry').slice(0, 100),
    waterAvailability: (draft.waterAvailability.trim() || '24 Hours Water Supply').slice(0, 100),
    liftAvailability: (draft.liftAvailability.trim() || 'Ask on inquiry').slice(0, 100),
    suitableFor: draft.suitableFor || 'Family / Bachelors',
    availableFrom: (draft.availableFrom.trim() || 'Immediate').slice(0, 60),
    shortDescription: finalDescription.slice(0, 220),
    fullDescription: finalDescription,
    additionalNotes:
      brokerageAmount > 0
        ? `Brokerage ₹${brokerageAmount.toLocaleString('en-IN')}.`
        : 'Direct owner / zero brokerage listing.',
    facilities,
    images: photoRefs,
    submitterRole: draft.submitterRole,
    workflowStatus: publishMode as WorkflowStatus,
    submittedAt: serverTimestamp(),
    approvedAt: isPublicListing ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, SUBMISSIONS_COLLECTION, propertyCode), {
      ...commonFields,
      submitterName,
      submitterMobile,
      submitterWhatsapp,
      rejectionReason: null,
    });

    if (isPublicListing) {
      batch.set(doc(db, PUBLIC_COLLECTION, propertyCode), {
        ...commonFields,
        availabilityLabel: 'Available',
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${SUBMISSIONS_COLLECTION}/${propertyCode}`);
  }

  await createAdminAuditNotification(
    isPublicListing ? 'approved' : 'submission',
    propertyCode,
    isPublicListing
      ? `AI Assistant added & published ${propertyCode}`
      : `AI Assistant saved ${propertyCode} (Pending)`,
    `${title} in ${cleanLocation} at ₹${monthlyRent.toLocaleString('en-IN')}/month (${photoRefs.length} photo${photoRefs.length === 1 ? '' : 's'}).`
  );

  return {
    propertyCode,
    workflowStatus: publishMode,
    photoCount: photoRefs.length,
    title,
  };
}

