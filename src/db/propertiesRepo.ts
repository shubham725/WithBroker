import crypto from 'crypto';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  DbAdminNotification,
  DbProperty,
  adminNotifications,
  properties,
  propertyPhotos,
} from './schema.ts';
import type {
  AdminDashboardStats,
  AdminNotification,
  AdminPropertyRecord,
  FurnishingStatus,
  PropertyListing,
  PropertyType,
  SubmitterRole,
  SuitableFor,
  WorkflowStatus,
} from '../types/property.ts';

const PHOTO_HMAC_SECRET =
  process.env.PHOTO_TOKEN_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const PUNE_LOCALITY_COORDS: Record<string, { slug: string; lat: number; lng: number }> = {
  'viman nagar': { slug: 'viman-nagar', lat: 18.5679, lng: 73.9143 },
  'wadgaon sheri': { slug: 'wadgaon-sheri', lat: 18.5529, lng: 73.9277 },
  'somnath nagar': { slug: 'somnath-nagar', lat: 18.5565, lng: 73.9306 },
  'chandan nagar': { slug: 'chandan-nagar', lat: 18.5612, lng: 73.9372 },
  'kharadi': { slug: 'kharadi-bypass', lat: 18.5515, lng: 73.9475 },
  'keshav nagar': { slug: 'keshav-nagar', lat: 18.5337, lng: 73.9521 },
  'wanowrie': { slug: 'wanowrie', lat: 18.4976, lng: 73.9036 },
  'wanawadi': { slug: 'wanowrie', lat: 18.4976, lng: 73.9036 },
  'ganesh nagar': { slug: 'other', lat: 18.5498, lng: 73.9308 },
};

export function inferLocalityMeta(location: string): {
  slug: string;
  subLocality: string;
  lat: number;
  lng: number;
} {
  const lower = location.toLowerCase();
  for (const [key, meta] of Object.entries(PUNE_LOCALITY_COORDS)) {
    if (lower.includes(key)) {
      const subLocality = location.split(',')[0]?.trim() || location.trim();
      return { slug: meta.slug, subLocality, lat: meta.lat, lng: meta.lng };
    }
  }
  const subLocality = location.split(',')[0]?.trim() || location.trim();
  return { slug: 'other', subLocality, lat: 18.5529, lng: 73.9277 };
}

export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
}

export function computeSubmissionHash(params: {
  mobile: string;
  propertyType: string;
  location: string;
  societyName?: string;
  monthlyRent: number;
}): string {
  const canonical = [
    normalizeIndianPhone(params.mobile),
    params.propertyType.trim().toUpperCase(),
    params.location.trim().toLowerCase(),
    (params.societyName ?? '').trim().toLowerCase(),
    String(params.monthlyRent),
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function signPhotoPreviewToken(photoId: string, expiresAtMs: number): string {
  return crypto
    .createHmac('sha256', PHOTO_HMAC_SECRET)
    .update(`${photoId}:${expiresAtMs}`)
    .digest('hex');
}

export function verifyPhotoPreviewToken(photoId: string, sig: string, exp: string): boolean {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || Date.now() > expNum) return false;
  const expected = signPhotoPreviewToken(photoId, expNum);
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function attachAdminPhotoSignatures(images: string[], status: string): string[] {
  if (status === 'Available' || status === 'Rented') return images;
  const exp = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  return images.map((url) => {
    const match = url.match(/^\/api\/photos\/([a-f0-9-]+)$/i);
    if (!match) return url;
    const photoId = match[1];
    const sig = signPhotoPreviewToken(photoId, exp);
    return `${url}?sig=${sig}&exp=${exp}`;
  });
}

function toPublicProperty(row: DbProperty): PropertyListing {
  const isRented = row.status === 'Rented';
  const workflowStatus = (row.status as WorkflowStatus) || 'Pending';
  return {
    id: row.propertyCode,
    dbId: row.id,
    propertyCode: row.propertyCode,
    title: row.title,
    propertyType: row.propertyType as PropertyType,
    locality: row.locality,
    subLocality: row.subLocality,
    localitySlug: row.localitySlug,
    societyName: row.societyName,
    publicAreaNote: row.publicAreaNote,
    coordinates: { lat: row.lat, lng: row.lng },
    monthlyRent: row.monthlyRent,
    securityDeposit: row.securityDeposit,
    brokerageStatus: row.brokerageStatus as PropertyListing['brokerageStatus'],
    brokerageAmount: row.brokerageAmount,
    maintenanceCharges: row.maintenanceCharges ?? undefined,
    furnishing: row.furnishing as FurnishingStatus,
    carpetArea: row.carpetArea ?? undefined,
    builtUpArea: row.builtUpArea ?? undefined,
    floorNumber: row.floorNumber ?? undefined,
    totalFloors: row.totalFloors ?? undefined,
    floorInfo: row.floorInfo ?? undefined,
    facing: row.facing ?? undefined,
    bathrooms: row.bathrooms,
    bathroomType: row.bathroomType,
    balconies: row.balconies,
    parking: row.parking,
    waterAvailability: row.waterAvailability,
    liftAvailability: row.liftAvailability,
    suitableFor: row.suitableFor as SuitableFor,
    availableFrom: isRented ? 'Rented Out' : row.availableFrom,
    availabilityLabel: isRented ? 'Rented Out' : 'Available',
    listingStatus: workflowStatus === 'Available' || workflowStatus === 'Rented' ? 'active' : 'draft',
    workflowStatus,
    submitterRole: (row.submitterRole as SubmitterRole) || 'Owner',
    submittedAt: row.submittedAt.toISOString(),
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    isDemoListing: false,
    shortDescription: row.shortDescription,
    fullDescription: row.fullDescription,
    additionalNotes: row.additionalNotes,
    facilities: Array.isArray(row.facilities) ? row.facilities : [],
    images: Array.isArray(row.images) ? row.images : [],
  };
}

function toAdminProperty(row: DbProperty): AdminPropertyRecord {
  const base = toPublicProperty(row);
  return {
    ...base,
    dbId: row.id,
    workflowStatus: (row.status as WorkflowStatus) || 'Pending',
    images: attachAdminPhotoSignatures(base.images, row.status),
    submitterName: row.submitterName,
    submitterMobile: row.submitterMobile,
    submitterWhatsapp: row.submitterWhatsapp,
    submitterRole: (row.submitterRole as SubmitterRole) || 'Owner',
    rejectionReason: row.rejectionReason ?? null,
    submittedAt: row.submittedAt.toISOString(),
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toNotification(row: DbAdminNotification): AdminNotification {
  return {
    id: row.id,
    type: row.type as AdminNotification['type'],
    propertyId: row.propertyId ?? null,
    propertyCode: row.propertyCode,
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPublicProperties(): Promise<PropertyListing[]> {
  try {
    const rows = await db
      .select()
      .from(properties)
      .where(inArray(properties.status, ['Available', 'Rented']))
      .orderBy(desc(properties.approvedAt), desc(properties.submittedAt));

    return rows.map(toPublicProperty);
  } catch (error) {
    console.error('Database query failed in listPublicProperties:', error);
    throw new Error('Unable to load property listings right now.', { cause: error });
  }
}

export async function listAdminProperties(): Promise<{
  properties: AdminPropertyRecord[];
  stats: AdminDashboardStats;
}> {
  try {
    const rows = await db
      .select()
      .from(properties)
      .orderBy(desc(properties.submittedAt), desc(properties.id));

    const records = rows.map(toAdminProperty);
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
    console.error('Database query failed in listAdminProperties:', error);
    throw new Error('Unable to load admin property listings.', { cause: error });
  }
}

export async function generateNextPropertyCode(): Promise<string> {
  try {
    const rows = await db
      .select({ code: properties.propertyCode })
      .from(properties);

    let maxNum = 1000;
    for (const row of rows) {
      const match = row.code.match(/^WB-(\d+)$/i);
      if (match) {
        const parsed = Number(match[1]);
        if (Number.isFinite(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    return `WB-${maxNum + 1}`;
  } catch (error) {
    console.error('Database query failed in generateNextPropertyCode:', error);
    throw new Error('Unable to generate property ID.', { cause: error });
  }
}

export interface CreateSubmissionPayload {
  submitterName: string;
  submitterMobile: string;
  submitterWhatsapp: string;
  submitterRole: SubmitterRole;
  propertyType: PropertyType;
  location: string;
  societyName?: string;
  monthlyRent: number;
  securityDeposit: number;
  brokerageAmount: number;
  furnishing: FurnishingStatus;
  availableFrom: string;
  bathrooms: number;
  balconies: number;
  floorNumber?: string;
  totalFloors?: string;
  carpetArea?: string;
  description: string;
  facilities: string[];
  photos: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
    dataBase64: string;
  }>;
}

export class DuplicateSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateSubmissionError';
  }
}

export async function createPropertySubmission(
  payload: CreateSubmissionPayload
): Promise<{ id: number; propertyCode: string; status: WorkflowStatus; submittedAt: string }> {
  const normalizedMobile = normalizeIndianPhone(payload.submitterMobile);
  const normalizedWhatsapp = normalizeIndianPhone(payload.submitterWhatsapp || payload.submitterMobile);
  const submissionHash = computeSubmissionHash({
    mobile: normalizedMobile,
    propertyType: payload.propertyType,
    location: payload.location,
    societyName: payload.societyName,
    monthlyRent: payload.monthlyRent,
  });

  try {
    // Prevent accidental duplicate submissions within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ id: properties.id, propertyCode: properties.propertyCode })
      .from(properties)
      .where(
        and(
          eq(properties.submissionHash, submissionHash),
          gte(properties.submittedAt, oneDayAgo),
          inArray(properties.status, ['Pending', 'Available'])
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new DuplicateSubmissionError(
        `This property appears to have already been submitted recently (Property ID: ${existing[0].propertyCode}).`
      );
    }

    const localityMeta = inferLocalityMeta(payload.location);
    const displayLocation = payload.location.toLowerCase().includes('pune')
      ? payload.location.trim()
      : `${payload.location.trim()}, Pune`;

    const furnishingShort =
      payload.furnishing === 'Fully Furnished'
        ? 'Furnished'
        : payload.furnishing === 'Semi-Furnished'
          ? 'Semi-Furnished'
          : 'Unfurnished';

    const title = payload.societyName?.trim()
      ? `${payload.propertyType} ${furnishingShort} Flat in ${payload.societyName.trim()}`
      : `${payload.propertyType} ${furnishingShort} Flat in ${localityMeta.subLocality}`;

    const floorInfo =
      payload.floorNumber && payload.totalFloors
        ? `Floor ${payload.floorNumber} of ${payload.totalFloors}`
        : payload.floorNumber
          ? `Floor ${payload.floorNumber}`
          : undefined;

    const brokerageStatus =
      payload.brokerageAmount <= 0 ? 'No Brokerage' : 'Applicable';

    const bathroomType =
      payload.bathrooms === 1 ? '1 Bathroom' : `${payload.bathrooms} Bathrooms`;

    const shortDescription =
      payload.description.length > 155
        ? `${payload.description.slice(0, 152).trim()}...`
        : payload.description;

    const publicAreaNote = payload.societyName?.trim()
      ? `${payload.societyName.trim()}, ${displayLocation} (exact flat details shared upon inquiry)`
      : `${displayLocation} (exact building shared upon inquiry)`;

    const propertyCode = await generateNextPropertyCode();

    const [inserted] = await db
      .insert(properties)
      .values({
        propertyCode,
        title,
        propertyType: payload.propertyType,
        locality: displayLocation,
        subLocality: localityMeta.subLocality,
        localitySlug: localityMeta.slug,
        societyName: payload.societyName?.trim() || null,
        publicAreaNote,
        lat: localityMeta.lat,
        lng: localityMeta.lng,
        monthlyRent: payload.monthlyRent,
        securityDeposit: payload.securityDeposit,
        brokerageStatus,
        brokerageAmount: payload.brokerageAmount,
        maintenanceCharges: 'Ask on inquiry',
        furnishing: payload.furnishing,
        availableFrom: payload.availableFrom.trim() || 'Immediate',
        bathrooms: payload.bathrooms,
        bathroomType,
        balconies: payload.balconies,
        floorNumber: payload.floorNumber?.trim() || null,
        totalFloors: payload.totalFloors?.trim() || null,
        floorInfo: floorInfo ?? null,
        carpetArea: payload.carpetArea?.trim() || null,
        parking: payload.facilities.includes('Car Parking')
          ? 'Car & Two-Wheeler Parking'
          : payload.facilities.includes('Two-Wheeler Parking')
            ? 'Two-Wheeler Parking'
            : 'Ask on inquiry',
        waterAvailability: payload.facilities.includes('24 Hours Water')
          ? '24 Hours Water Supply'
          : 'Ask on inquiry',
        liftAvailability: payload.facilities.includes('Lift')
          ? 'Lift Available'
          : floorInfo || 'Residential Building',
        suitableFor: 'Family / Bachelors',
        shortDescription,
        fullDescription: payload.description.trim(),
        additionalNotes:
          brokerageStatus === 'No Brokerage'
            ? 'Zero brokerage listing.'
            : `Brokerage: ₹${payload.brokerageAmount.toLocaleString('en-IN')}.`,
        facilities: payload.facilities,
        images: [],
        submitterName: payload.submitterName.trim(),
        submitterMobile: normalizedMobile,
        submitterWhatsapp: normalizedWhatsapp,
        submitterRole: payload.submitterRole,
        status: 'Pending',
        submissionHash,
      })
      .returning();

    const photoUrls: string[] = [];
    for (const photo of payload.photos) {
      const photoId = crypto.randomUUID();
      await db.insert(propertyPhotos).values({
        id: photoId,
        propertyId: inserted.id,
        filename: photo.filename,
        mimeType: photo.mimeType,
        sizeBytes: photo.sizeBytes,
        dataBase64: photo.dataBase64,
      });
      photoUrls.push(`/api/photos/${photoId}`);
    }

    if (photoUrls.length > 0) {
      await db
        .update(properties)
        .set({ images: photoUrls, updatedAt: new Date() })
        .where(eq(properties.id, inserted.id));
    }

    await db.insert(adminNotifications).values({
      type: 'submission',
      propertyId: inserted.id,
      propertyCode: inserted.propertyCode,
      title: `New ${payload.submitterRole} Submission (${inserted.propertyCode})`,
      message: `${payload.submitterName.trim()} submitted a ${payload.propertyType} in ${displayLocation} at ₹${payload.monthlyRent.toLocaleString('en-IN')}/month.`,
    });

    return {
      id: inserted.id,
      propertyCode: inserted.propertyCode,
      status: 'Pending',
      submittedAt: inserted.submittedAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof DuplicateSubmissionError) {
      throw error;
    }
    console.error('Database write failed in createPropertySubmission:', error);
    throw new Error('Unable to save property submission. Please try again.', { cause: error });
  }
}

export async function updatePropertyStatus(
  id: number,
  nextStatus: WorkflowStatus,
  rejectionReason?: string
): Promise<AdminPropertyRecord | null> {
  try {
    const existingRows = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (existingRows.length === 0) return null;
    const prev = existingRows[0];

    const now = new Date();
    const updateValues: Partial<typeof properties.$inferInsert> = {
      status: nextStatus,
      updatedAt: now,
      rejectionReason: nextStatus === 'Rejected' ? rejectionReason?.trim() || 'Rejected by admin' : null,
      approvedAt:
        nextStatus === 'Available' ? prev.approvedAt ?? now : prev.approvedAt,
    };

    const [updated] = await db
      .update(properties)
      .set(updateValues)
      .where(eq(properties.id, id))
      .returning();

    let notifType: AdminNotification['type'] = 'available';
    let notifTitle = '';
    let notifMessage = '';

    if (nextStatus === 'Available' && prev.status === 'Pending') {
      notifType = 'approved';
      notifTitle = `Property Approved (${updated.propertyCode})`;
      notifMessage = `${updated.title} in ${updated.locality} is now live on the public website.`;
    } else if (nextStatus === 'Available') {
      notifType = 'available';
      notifTitle = `Marked Available (${updated.propertyCode})`;
      notifMessage = `${updated.title} is back in available listings.`;
    } else if (nextStatus === 'Rejected') {
      notifType = 'rejected';
      notifTitle = `Property Rejected (${updated.propertyCode})`;
      notifMessage = `${updated.title} was rejected and hidden from the public website.`;
    } else if (nextStatus === 'Rented') {
      notifType = 'rented';
      notifTitle = `Marked as Rented (${updated.propertyCode})`;
      notifMessage = `${updated.title} has been marked as Rented Out.`;
    }

    if (notifTitle) {
      await db.insert(adminNotifications).values({
        type: notifType,
        propertyId: updated.id,
        propertyCode: updated.propertyCode,
        title: notifTitle,
        message: notifMessage,
      });
    }

    return toAdminProperty(updated);
  } catch (error) {
    console.error('Database update failed in updatePropertyStatus:', error);
    throw new Error('Unable to update property status.', { cause: error });
  }
}

export interface AdminPropertyUpdatePayload {
  title?: string;
  propertyType?: PropertyType;
  locality?: string;
  societyName?: string | null;
  monthlyRent?: number;
  securityDeposit?: number | null;
  brokerageAmount?: number;
  furnishing?: FurnishingStatus;
  availableFrom?: string;
  bathrooms?: number;
  balconies?: number;
  floorNumber?: string | null;
  totalFloors?: string | null;
  carpetArea?: string | null;
  fullDescription?: string;
  facilities?: string[];
  submitterName?: string;
  submitterMobile?: string;
  submitterWhatsapp?: string;
  submitterRole?: SubmitterRole;
}

export async function updateAdminProperty(
  id: number,
  updates: AdminPropertyUpdatePayload
): Promise<AdminPropertyRecord | null> {
  try {
    const existingRows = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (existingRows.length === 0) return null;
    const current = existingRows[0];

    const nextLocality = updates.locality?.trim() || current.locality;
    const localityMeta = inferLocalityMeta(nextLocality);
    const nextBrokerageAmount =
      updates.brokerageAmount !== undefined ? updates.brokerageAmount : current.brokerageAmount;
    const nextBrokerageStatus =
      nextBrokerageAmount <= 0 && updates.brokerageAmount !== undefined
        ? 'No Brokerage'
        : nextBrokerageAmount > 0
          ? 'Applicable'
          : current.brokerageStatus;

    const nextFloorNum =
      updates.floorNumber !== undefined ? updates.floorNumber : current.floorNumber;
    const nextTotalFloors =
      updates.totalFloors !== undefined ? updates.totalFloors : current.totalFloors;
    const nextFloorInfo =
      nextFloorNum && nextTotalFloors
        ? `Floor ${nextFloorNum} of ${nextTotalFloors}`
        : nextFloorNum
          ? `Floor ${nextFloorNum}`
          : current.floorInfo;

    const nextBathrooms =
      updates.bathrooms !== undefined ? updates.bathrooms : current.bathrooms;
    const nextDescription =
      updates.fullDescription?.trim() || current.fullDescription;
    const nextShortDescription =
      nextDescription.length > 155
        ? `${nextDescription.slice(0, 152).trim()}...`
        : nextDescription;

    const [updated] = await db
      .update(properties)
      .set({
        title: updates.title?.trim() || current.title,
        propertyType: updates.propertyType || current.propertyType,
        locality: nextLocality,
        subLocality: localityMeta.subLocality,
        localitySlug: localityMeta.slug,
        societyName:
          updates.societyName !== undefined ? updates.societyName?.trim() || null : current.societyName,
        monthlyRent: updates.monthlyRent ?? current.monthlyRent,
        securityDeposit:
          updates.securityDeposit !== undefined ? updates.securityDeposit : current.securityDeposit,
        brokerageAmount: nextBrokerageAmount,
        brokerageStatus: nextBrokerageStatus,
        furnishing: updates.furnishing || current.furnishing,
        availableFrom: updates.availableFrom?.trim() || current.availableFrom,
        bathrooms: nextBathrooms,
        bathroomType:
          updates.bathrooms !== undefined
            ? nextBathrooms === 1
              ? '1 Bathroom'
              : `${nextBathrooms} Bathrooms`
            : current.bathroomType,
        balconies: updates.balconies !== undefined ? updates.balconies : current.balconies,
        floorNumber: nextFloorNum,
        totalFloors: nextTotalFloors,
        floorInfo: nextFloorInfo,
        carpetArea:
          updates.carpetArea !== undefined ? updates.carpetArea?.trim() || null : current.carpetArea,
        shortDescription: nextShortDescription,
        fullDescription: nextDescription,
        facilities: updates.facilities ?? current.facilities,
        submitterName: updates.submitterName?.trim() || current.submitterName,
        submitterMobile: updates.submitterMobile
          ? normalizeIndianPhone(updates.submitterMobile)
          : current.submitterMobile,
        submitterWhatsapp: updates.submitterWhatsapp
          ? normalizeIndianPhone(updates.submitterWhatsapp)
          : current.submitterWhatsapp,
        submitterRole: updates.submitterRole || current.submitterRole,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, id))
      .returning();

    return toAdminProperty(updated);
  } catch (error) {
    console.error('Database update failed in updateAdminProperty:', error);
    throw new Error('Unable to update property details.', { cause: error });
  }
}

export async function deleteAdminProperty(id: number): Promise<boolean> {
  try {
    const existingRows = await db
      .select({ id: properties.id, propertyCode: properties.propertyCode, title: properties.title })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (existingRows.length === 0) return false;
    const target = existingRows[0];

    await db.delete(properties).where(eq(properties.id, id));

    await db.insert(adminNotifications).values({
      type: 'deleted',
      propertyId: null,
      propertyCode: target.propertyCode,
      title: `Property Deleted (${target.propertyCode})`,
      message: `${target.title} was permanently removed from the system.`,
    });

    return true;
  } catch (error) {
    console.error('Database delete failed in deleteAdminProperty:', error);
    throw new Error('Unable to delete property.', { cause: error });
  }
}

export async function getPhotoWithStatus(photoId: string): Promise<{
  mimeType: string;
  dataBase64: string;
  propertyStatus: string;
} | null> {
  try {
    const rows = await db
      .select({
        mimeType: propertyPhotos.mimeType,
        dataBase64: propertyPhotos.dataBase64,
        propertyStatus: properties.status,
      })
      .from(propertyPhotos)
      .innerJoin(properties, eq(propertyPhotos.propertyId, properties.id))
      .where(eq(propertyPhotos.id, photoId))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getPhotoWithStatus:', error);
    throw new Error('Unable to fetch property photo.', { cause: error });
  }
}

export async function listAdminNotifications(limit = 40): Promise<{
  notifications: AdminNotification[];
  unreadCount: number;
}> {
  try {
    const rows = await db
      .select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt), desc(adminNotifications.id))
      .limit(limit);

    const [unreadRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));

    return {
      notifications: rows.map(toNotification),
      unreadCount: unreadRow?.count ?? 0,
    };
  } catch (error) {
    console.error('Database query failed in listAdminNotifications:', error);
    throw new Error('Unable to load notifications.', { cause: error });
  }
}

export async function markNotificationsRead(notificationId?: number): Promise<void> {
  try {
    if (notificationId !== undefined) {
      await db
        .update(adminNotifications)
        .set({ isRead: true })
        .where(eq(adminNotifications.id, notificationId));
    } else {
      await db
        .update(adminNotifications)
        .set({ isRead: true })
        .where(eq(adminNotifications.isRead, false));
    }
  } catch (error) {
    console.error('Database update failed in markNotificationsRead:', error);
    throw new Error('Unable to mark notifications as read.', { cause: error });
  }
}
