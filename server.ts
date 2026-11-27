import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  fetchPublicPhotoBytes,
  fetchPublicPropertyForOg,
  fetchPublicRoommateForOg,
  injectPropertyOgIntoHtml,
  injectRoommateOgIntoHtml,
  resolveRequestOrigin,
} from './src/lib/propertyOg.ts';
import {
  runAdminPropertyAssistant,
  verifySoleAdminFirebaseToken,
} from './src/lib/adminAiPropertyChat.ts';
import {
  DuplicateSubmissionError,
  createPropertySubmission,
  deleteAdminProperty,
  getPhotoWithStatus,
  listAdminNotifications,
  listAdminProperties,
  listPublicProperties,
  markNotificationsRead,
  updateAdminProperty,
  updatePropertyStatus,
  verifyPhotoPreviewToken,
} from './src/db/propertiesRepo.ts';
import { type AuthRequest, requireAdmin } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { getOrCreateUser, isAuthorizedAdminEmail } from './src/db/users.ts';
import type {
  FurnishingStatus,
  PropertyType,
  SubmitterRole,
  WorkflowStatus,
} from './src/types/property.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VALID_PROPERTY_TYPES = new Set<PropertyType>(['1RK', '1BHK', '2BHK', '3BHK']);
const VALID_FURNISHING = new Set<FurnishingStatus>([
  'Unfurnished',
  'Semi-Furnished',
  'Fully Furnished',
]);
const VALID_ROLES = new Set<SubmitterRole>(['Owner', 'Broker']);
const VALID_STATUSES = new Set<WorkflowStatus>(['Pending', 'Available', 'Rejected', 'Rented']);

function detectImageMagicMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per photo
    files: 8,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

function isValidIndianPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(normalized);
}

const SUBMISSION_WINDOW_MS = 15 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 8;
const submissionAttemptsByIp = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissionAttemptsByIp.get(ip) ?? []).filter(
    (ts) => now - ts < SUBMISSION_WINDOW_MS
  );
  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    submissionAttemptsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  submissionAttemptsByIp.set(ip, recent);
  return false;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api/admin/ai-property-chat', express.json({ limit: '12mb' }));
  app.use(express.json({ limit: '2mb' }));

  // Public API: Fetch approved & live properties (Pending/Rejected & private PII never exposed)
  app.get('/api/properties', async (_req, res) => {
    try {
      const items = await listPublicProperties();
      res.json({ properties: items });
    } catch (error) {
      console.error('GET /api/properties failed:', error);
      res.status(500).json({ error: 'Failed to load property listings.' });
    }
  });

  // Public API: Submit a new rental property (saved as Pending with uploaded photos)
  app.post('/api/submissions', (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error: 'Too many submissions from your connection. Please wait a few minutes before submitting again.',
      });
      return;
    }

    upload.array('photos', 8)(req, res, (err) => {
      if (err) {
        const message =
          err instanceof multer.MulterError
            ? err.code === 'LIMIT_FILE_SIZE'
              ? 'Each photo must be under 5 MB.'
              : err.code === 'LIMIT_FILE_COUNT'
                ? 'You can upload up to 8 photos per property.'
                : err.message
            : err.message || 'Invalid photo upload.';
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  }, async (req, res) => {
    try {
      const body = req.body ?? {};
      if (typeof body.website === 'string' && body.website.trim().length > 0) {
        return res.status(400).json({ error: 'Invalid submission request.' });
      }
      const submitterName = String(body.name ?? '').trim();
      const submitterMobile = String(body.mobile ?? '').trim();
      const submitterWhatsapp = String(body.whatsapp ?? submitterMobile).trim();
      const submitterRole = String(body.submitterRole ?? 'Owner').trim() as SubmitterRole;
      const propertyType = String(body.propertyType ?? '').trim() as PropertyType;
      const location = String(body.location ?? '').trim();
      const societyName = String(body.societyName ?? '').trim();
      const monthlyRent = Number(body.monthlyRent);
      const securityDeposit = Number(body.securityDeposit);
      const brokerageAmount =
        body.brokerageAmount !== undefined && String(body.brokerageAmount).trim() !== ''
          ? Number(body.brokerageAmount)
          : 0;
      const furnishing = String(body.furnishingStatus ?? 'Unfurnished').trim() as FurnishingStatus;
      const availableFrom = String(body.availableFrom ?? 'Immediate').trim();
      const bathrooms = Number(body.bathrooms ?? 1);
      const balconies =
        body.balconies !== undefined && String(body.balconies).trim() !== ''
          ? Number(body.balconies)
          : 0;
      const floorNumber = String(body.floorNumber ?? '').trim();
      const totalFloors = String(body.totalFloors ?? '').trim();
      const carpetArea = String(body.carpetArea ?? '').trim();
      const description = String(body.description ?? '').trim();

      let facilities: string[] = [];
      if (typeof body.facilities === 'string' && body.facilities.trim()) {
        try {
          const parsed = JSON.parse(body.facilities);
          if (Array.isArray(parsed)) {
            facilities = parsed.map((f) => String(f).trim()).filter(Boolean).slice(0, 15);
          }
        } catch {
          facilities = body.facilities
            .split(',')
            .map((f: string) => f.trim())
            .filter(Boolean)
            .slice(0, 15);
        }
      } else if (Array.isArray(body.facilities)) {
        facilities = body.facilities.map((f: unknown) => String(f).trim()).filter(Boolean).slice(0, 15);
      }

      // Server-side validation
      if (submitterName.length < 2 || submitterName.length > 100) {
        return res.status(400).json({ error: 'Please enter a valid full name.' });
      }
      if (!isValidIndianPhone(submitterMobile)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
      }
      if (!isValidIndianPhone(submitterWhatsapp)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit WhatsApp number.' });
      }
      if (!VALID_ROLES.has(submitterRole)) {
        return res.status(400).json({ error: 'User type must be Owner or Broker.' });
      }
      if (!VALID_PROPERTY_TYPES.has(propertyType)) {
        return res.status(400).json({ error: 'Select a valid property type (1RK, 1BHK, 2BHK, 3BHK).' });
      }
      if (location.length < 3 || location.length > 200) {
        return res.status(400).json({ error: 'Please enter a valid Pune property location.' });
      }
      if (!Number.isFinite(monthlyRent) || monthlyRent < 1000 || monthlyRent > 500000) {
        return res.status(400).json({ error: 'Monthly rent must be between ₹1,000 and ₹5,00,000.' });
      }
      if (!Number.isFinite(securityDeposit) || securityDeposit < 0 || securityDeposit > 5000000) {
        return res.status(400).json({ error: 'Enter a valid security deposit amount.' });
      }
      if (!Number.isFinite(brokerageAmount) || brokerageAmount < 0 || brokerageAmount > 1000000) {
        return res.status(400).json({ error: 'Enter a valid brokerage amount.' });
      }
      if (!VALID_FURNISHING.has(furnishing)) {
        return res.status(400).json({ error: 'Select a valid furnishing status.' });
      }
      if (!availableFrom || availableFrom.length > 60) {
        return res.status(400).json({ error: 'Please enter an available from date.' });
      }
      if (!Number.isInteger(bathrooms) || bathrooms < 1 || bathrooms > 10) {
        return res.status(400).json({ error: 'Bathrooms count must be between 1 and 10.' });
      }
      if (!Number.isInteger(balconies) || balconies < 0 || balconies > 10) {
        return res.status(400).json({ error: 'Balconies count must be between 0 and 10.' });
      }
      if (description.length < 15 || description.length > 2500) {
        return res.status(400).json({
          error: 'Property description must be between 15 and 2500 characters.',
        });
      }

      const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
      const validatedPhotos: Array<{
        filename: string;
        mimeType: string;
        sizeBytes: number;
        dataBase64: string;
      }> = [];

      for (const file of uploadedFiles) {
        const detectedMime = detectImageMagicMime(file.buffer);
        if (!detectedMime || !ALLOWED_IMAGE_MIME.has(detectedMime)) {
          return res.status(400).json({
            error: `File "${file.originalname}" is not a valid JPG, PNG, or WebP image.`,
          });
        }
        validatedPhotos.push({
          filename: file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120),
          mimeType: detectedMime,
          sizeBytes: file.size,
          dataBase64: file.buffer.toString('base64'),
        });
      }

      const created = await createPropertySubmission({
        submitterName,
        submitterMobile,
        submitterWhatsapp,
        submitterRole,
        propertyType,
        location,
        societyName,
        monthlyRent: Math.round(monthlyRent),
        securityDeposit: Math.round(securityDeposit),
        brokerageAmount: Math.round(brokerageAmount),
        furnishing,
        availableFrom,
        bathrooms,
        balconies,
        floorNumber,
        totalFloors,
        carpetArea,
        description,
        facilities,
        photos: validatedPhotos,
      });

      return res.status(201).json({
        propertyCode: created.propertyCode,
        status: created.status,
        submittedAt: created.submittedAt,
        photoCount: validatedPhotos.length,
        message: 'Property submitted successfully and queued for admin approval.',
      });
    } catch (error) {
      if (error instanceof DuplicateSubmissionError) {
        return res.status(409).json({ error: error.message });
      }
      console.error('POST /api/submissions failed:', error);
      return res.status(500).json({
        error: 'Unable to submit property right now. Please try again in a moment.',
      });
    }
  });

  // Public approved Firestore photo endpoint for WhatsApp/Social Open Graph images
  app.get('/api/property-image/:photoId', async (req, res) => {
    const { photoId } = req.params;
    const photo = await fetchPublicPhotoBytes(photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Public property photo not found.' });
    }
    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Content-Length', String(photo.buffer.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.send(photo.buffer);
  });

  // Photo serving endpoint with status-based access control
  app.get('/api/photos/:photoId', async (req, res) => {
    const { photoId } = req.params;
    if (!/^[a-f0-9-]{36}$/i.test(photoId)) {
      return res.status(400).json({ error: 'Invalid photo identifier.' });
    }

    try {
      const record = await getPhotoWithStatus(photoId);
      if (!record) {
        return res.status(404).json({ error: 'Photo not found.' });
      }

      const isPublic = record.propertyStatus === 'Available' || record.propertyStatus === 'Rented';
      if (!isPublic) {
        const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
        const exp = typeof req.query.exp === 'string' ? req.query.exp : '';
        let authorized = sig && exp ? verifyPhotoPreviewToken(photoId, sig, exp) : false;

        if (!authorized && req.headers.authorization?.startsWith('Bearer ')) {
          try {
            const token = req.headers.authorization.slice('Bearer '.length).trim();
            const decoded = await adminAuth.verifyIdToken(token);
            if (decoded.email && decoded.email_verified !== false && isAuthorizedAdminEmail(decoded.email)) {
              const dbUser = await getOrCreateUser(decoded.uid, decoded.email, decoded.name ?? null);
              authorized = dbUser.role === 'admin';
            }
          } catch {
            authorized = false;
          }
        }

        if (!authorized) {
          return res.status(403).json({ error: 'Forbidden: Photo belongs to an unapproved listing.' });
        }
      }

      const buffer = Buffer.from(record.dataBase64, 'base64');
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader(
        'Cache-Control',
        isPublic ? 'public, max-age=86400' : 'private, max-age=300'
      );
      return res.send(buffer);
    } catch (error) {
      console.error('GET /api/photos/:photoId failed:', error);
      return res.status(500).json({ error: 'Unable to load photo.' });
    }
  });

  // Admin API: Verify session & role
  app.get('/api/admin/me', requireAdmin, (req: AuthRequest, res) => {
    res.json({
      user: {
        uid: req.dbUser?.uid,
        email: req.dbUser?.email,
        displayName: req.dbUser?.displayName,
        role: req.dbUser?.role,
      },
    });
  });

  // Admin API: List all properties + dashboard KPIs
  app.get('/api/admin/properties', requireAdmin, async (_req, res) => {
    try {
      const data = await listAdminProperties();
      res.json(data);
    } catch (error) {
      console.error('GET /api/admin/properties failed:', error);
      res.status(500).json({ error: 'Failed to load admin properties.' });
    }
  });

  // Admin API: Change property status (Approve -> Available, Reject -> Rejected, Rented, Available)
  app.patch('/api/admin/properties/:id/status', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid property ID.' });
    }

    const nextStatus = String(req.body?.status ?? '').trim() as WorkflowStatus;
    const rejectionReason =
      typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason : undefined;

    if (!VALID_STATUSES.has(nextStatus)) {
      return res.status(400).json({ error: 'Invalid target status.' });
    }

    try {
      const updated = await updatePropertyStatus(id, nextStatus, rejectionReason);
      if (!updated) {
        return res.status(404).json({ error: 'Property not found.' });
      }
      return res.json({ property: updated });
    } catch (error) {
      console.error('PATCH /api/admin/properties/:id/status failed:', error);
      return res.status(500).json({ error: 'Failed to update property status.' });
    }
  });

  // Admin API: Edit property details
  app.put('/api/admin/properties/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid property ID.' });
    }

    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (typeof body.title === 'string' && body.title.trim().length >= 3) {
      updates.title = body.title.trim();
    }
    if (VALID_PROPERTY_TYPES.has(body.propertyType)) {
      updates.propertyType = body.propertyType;
    }
    if (typeof body.locality === 'string' && body.locality.trim().length >= 3) {
      updates.locality = body.locality.trim();
    }
    if (body.societyName !== undefined) {
      updates.societyName = body.societyName === null ? null : String(body.societyName).trim();
    }
    if (body.monthlyRent !== undefined) {
      const rent = Number(body.monthlyRent);
      if (!Number.isFinite(rent) || rent < 1000) {
        return res.status(400).json({ error: 'Monthly rent must be at least ₹1,000.' });
      }
      updates.monthlyRent = Math.round(rent);
    }
    if (body.securityDeposit !== undefined) {
      if (body.securityDeposit === null || body.securityDeposit === '') {
        updates.securityDeposit = null;
      } else {
        const dep = Number(body.securityDeposit);
        if (!Number.isFinite(dep) || dep < 0) {
          return res.status(400).json({ error: 'Invalid security deposit.' });
        }
        updates.securityDeposit = Math.round(dep);
      }
    }
    if (body.brokerageAmount !== undefined) {
      const brok = Number(body.brokerageAmount);
      if (!Number.isFinite(brok) || brok < 0) {
        return res.status(400).json({ error: 'Invalid brokerage amount.' });
      }
      updates.brokerageAmount = Math.round(brok);
    }
    if (VALID_FURNISHING.has(body.furnishing)) {
      updates.furnishing = body.furnishing;
    }
    if (typeof body.availableFrom === 'string' && body.availableFrom.trim()) {
      updates.availableFrom = body.availableFrom.trim();
    }
    if (body.bathrooms !== undefined) {
      const b = Number(body.bathrooms);
      if (Number.isInteger(b) && b >= 1 && b <= 10) updates.bathrooms = b;
    }
    if (body.balconies !== undefined) {
      const bal = Number(body.balconies);
      if (Number.isInteger(bal) && bal >= 0 && bal <= 10) updates.balconies = bal;
    }
    if (body.floorNumber !== undefined) {
      updates.floorNumber = body.floorNumber === null ? null : String(body.floorNumber).trim();
    }
    if (body.totalFloors !== undefined) {
      updates.totalFloors = body.totalFloors === null ? null : String(body.totalFloors).trim();
    }
    if (body.carpetArea !== undefined) {
      updates.carpetArea = body.carpetArea === null ? null : String(body.carpetArea).trim();
    }
    if (typeof body.fullDescription === 'string' && body.fullDescription.trim().length >= 10) {
      updates.fullDescription = body.fullDescription.trim();
    }
    if (Array.isArray(body.facilities)) {
      updates.facilities = body.facilities
        .map((item: unknown) => String(item).trim())
        .filter(Boolean)
        .slice(0, 20);
    }
    if (typeof body.submitterName === 'string' && body.submitterName.trim().length >= 2) {
      updates.submitterName = body.submitterName.trim();
    }
    if (typeof body.submitterMobile === 'string' && isValidIndianPhone(body.submitterMobile)) {
      updates.submitterMobile = body.submitterMobile;
    }
    if (typeof body.submitterWhatsapp === 'string' && isValidIndianPhone(body.submitterWhatsapp)) {
      updates.submitterWhatsapp = body.submitterWhatsapp;
    }
    if (VALID_ROLES.has(body.submitterRole)) {
      updates.submitterRole = body.submitterRole;
    }

    try {
      const updated = await updateAdminProperty(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Property not found.' });
      }
      return res.json({ property: updated });
    } catch (error) {
      console.error('PUT /api/admin/properties/:id failed:', error);
      return res.status(500).json({ error: 'Failed to save property edits.' });
    }
  });

  // Admin API: Permanently delete property
  app.delete('/api/admin/properties/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid property ID.' });
    }

    try {
      const deleted = await deleteAdminProperty(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Property not found.' });
      }
      return res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/admin/properties/:id failed:', error);
      return res.status(500).json({ error: 'Failed to delete property.' });
    }
  });

  // Admin API: Notifications feed
  app.get('/api/admin/notifications', requireAdmin, async (_req, res) => {
    try {
      const data = await listAdminNotifications();
      res.json(data);
    } catch (error) {
      console.error('GET /api/admin/notifications failed:', error);
      res.status(500).json({ error: 'Failed to load notifications.' });
    }
  });

  app.post('/api/admin/notifications/mark-read', requireAdmin, async (req, res) => {
    const rawId = req.body?.id;
    const id = rawId !== undefined ? Number(rawId) : undefined;
    if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ error: 'Invalid notification ID.' });
    }
    try {
      await markNotificationsRead(id);
      res.json({ ok: true });
    } catch (error) {
      console.error('POST /api/admin/notifications/mark-read failed:', error);
      res.status(500).json({ error: 'Failed to update notifications.' });
    }
  });

  // Admin API: AI Property Assistant Chatbot (Sole Admin Firebase ID token verified)
  app.post('/api/admin/ai-property-chat', express.json({ limit: '12mb' }), async (req, res) => {
    const authCheck = await verifySoleAdminFirebaseToken(req.headers.authorization);
    if (authCheck.ok === false) {
      return res.status(authCheck.status).json({ error: authCheck.error });
    }

    const result = await runAdminPropertyAssistant(req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result.data);
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Frontend Vite / Static Assets Serving + Dynamic Open Graph HTML for /property/:propertyId
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.get('/property/:propertyId', async (req, res, next) => {
      try {
        const propertyId = String(req.params.propertyId || '').trim();
        const origin = resolveRequestOrigin(req.headers);
        const templatePath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        const property = await fetchPublicPropertyForOg(propertyId);
        if (property) {
          html = injectPropertyOgIntoHtml(html, property, origin);
        }
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=300',
        });
        return res.send(html);
      } catch (err) {
        return next(err);
      }
    });

    app.get(['/roommate/:listingCode', '/roommates/:listingCode'], async (req, res, next) => {
      try {
        const listingCode = String(req.params.listingCode || '').trim();
        const origin = resolveRequestOrigin(req.headers);
        const templatePath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        const roommate = await fetchPublicRoommateForOg(listingCode);
        if (roommate) {
          html = injectRoommateOgIntoHtml(html, roommate, origin);
        }
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=300',
        });
        return res.send(html);
      } catch (err) {
        return next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const distIndexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

    app.get('/property/:propertyId', async (req, res) => {
      const propertyId = String(req.params.propertyId || '').trim();
      const origin = resolveRequestOrigin(req.headers);
      const property = await fetchPublicPropertyForOg(propertyId);
      const html = property
        ? injectPropertyOgIntoHtml(distIndexHtml, property, origin)
        : distIndexHtml;
      res.status(200).set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      });
      return res.send(html);
    });

    app.get(['/roommate/:listingCode', '/roommates/:listingCode'], async (req, res) => {
      const listingCode = String(req.params.listingCode || '').trim();
      const origin = resolveRequestOrigin(req.headers);
      const roommate = await fetchPublicRoommateForOg(listingCode);
      const html = roommate
        ? injectRoommateOgIntoHtml(distIndexHtml, roommate, origin)
        : distIndexHtml;
      res.status(200).set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      });
      return res.send(html);
    });

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WithBroker full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start WithBroker server:', err);
  process.exit(1);
});
