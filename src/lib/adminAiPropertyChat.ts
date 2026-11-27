import { GoogleGenAI, Type } from '@google/genai';
import firebaseConfig from '../../firebase-applet-config.json';
import type { FurnishingStatus, PropertyType, SubmitterRole, SuitableFor } from '../types/property';
import {
  type AdminAiChatImageInput,
  type AdminAiChatMessageInput,
  type AdminAiChatRequestPayload,
  type AdminAiChatResponsePayload,
  type AiExtractedPropertyDraft,
  computeMissingDraftFields,
  createEmptyAiDraft,
} from '../types/aiPropertyChat';

export type {
  AdminAiChatImageInput,
  AdminAiChatMessageInput,
  AdminAiChatRequestPayload,
  AdminAiChatResponsePayload,
  AiExtractedPropertyDraft,
};
export { computeMissingDraftFields, createEmptyAiDraft };

export const SOLE_ADMIN_EMAIL = 'yogeshbkumbhar0.2@gmail.com';
const VALID_PROPERTY_TYPES = new Set<PropertyType>(['1RK', '1BHK', '2BHK', '3BHK']);
const VALID_FURNISHING = new Set<FurnishingStatus>([
  'Unfurnished',
  'Semi-Furnished',
  'Fully Furnished',
]);
const VALID_ROLES = new Set<SubmitterRole>(['Owner', 'Broker']);
const VALID_SUITABLE_FOR = new Set<SuitableFor>([
  'Family',
  'Bachelors',
  'Working Professionals',
  'Family / Bachelors',
]);
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function normalizePhone10(raw: unknown, fallback = '9834626078'): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const trimmed = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (/^[6-9]\d{9}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function parseOptionalNonNegNumber(val: unknown, max: number): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(max, Math.round(num));
}

export function sanitizeAiDraft(raw: unknown): AiExtractedPropertyDraft {
  const base = createEmptyAiDraft();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  const rawType = String(obj.propertyType ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const propertyType: PropertyType | '' = VALID_PROPERTY_TYPES.has(rawType as PropertyType)
    ? (rawType as PropertyType)
    : '';

  const rawFurnishing = String(obj.furnishingStatus ?? '').trim();
  const furnishingStatus: FurnishingStatus = VALID_FURNISHING.has(rawFurnishing as FurnishingStatus)
    ? (rawFurnishing as FurnishingStatus)
    : rawFurnishing.toLowerCase().includes('full')
      ? 'Fully Furnished'
      : rawFurnishing.toLowerCase().includes('semi')
        ? 'Semi-Furnished'
        : 'Unfurnished';

  const rawRole = String(obj.submitterRole ?? '').trim();
  const submitterRole: SubmitterRole = VALID_ROLES.has(rawRole as SubmitterRole)
    ? (rawRole as SubmitterRole)
    : rawRole.toLowerCase().includes('broker')
      ? 'Broker'
      : 'Owner';

  const rawSuitable = String(obj.suitableFor ?? '').trim();
  const suitableFor: SuitableFor = VALID_SUITABLE_FOR.has(rawSuitable as SuitableFor)
    ? (rawSuitable as SuitableFor)
    : 'Family / Bachelors';

  const rentNum = parseOptionalNonNegNumber(obj.monthlyRent, 500000);
  const monthlyRent = rentNum !== null && rentNum >= 1000 ? rentNum : null;
  const securityDeposit = parseOptionalNonNegNumber(obj.securityDeposit, 5000000);
  const brokerageAmount = parseOptionalNonNegNumber(obj.brokerageAmount, 1000000) ?? 0;

  const rawBath = Number(obj.bathrooms);
  const bathrooms = Number.isFinite(rawBath) ? Math.max(1, Math.min(10, Math.round(rawBath))) : 1;

  const rawBalc = Number(obj.balconies);
  const balconies = Number.isFinite(rawBalc) ? Math.max(0, Math.min(10, Math.round(rawBalc))) : 0;

  const submitterMobile = normalizePhone10(obj.submitterMobile, '9834626078');
  const submitterWhatsapp = normalizePhone10(obj.submitterWhatsapp || submitterMobile, submitterMobile);

  const facilities = Array.isArray(obj.facilities)
    ? Array.from(
        new Set(
          obj.facilities
            .map((item) => String(item ?? '').trim().slice(0, 60))
            .filter((item) => item.length >= 2)
        )
      ).slice(0, 15)
    : [];

  return {
    title: String(obj.title ?? '').trim().slice(0, 180),
    propertyType,
    location: String(obj.location ?? '').trim().slice(0, 180),
    societyName: String(obj.societyName ?? '').trim().slice(0, 160),
    monthlyRent,
    securityDeposit,
    brokerageAmount,
    furnishingStatus,
    carpetArea: String(obj.carpetArea ?? '').trim().slice(0, 60),
    bathrooms,
    balconies,
    floorNumber: String(obj.floorNumber ?? '').trim().slice(0, 30),
    totalFloors: String(obj.totalFloors ?? '').trim().slice(0, 30),
    availableFrom: String(obj.availableFrom ?? 'Immediate').trim().slice(0, 60) || 'Immediate',
    suitableFor,
    parking: String(obj.parking ?? 'Ask on inquiry').trim().slice(0, 100) || 'Ask on inquiry',
    waterAvailability:
      String(obj.waterAvailability ?? '24 Hours Water Supply').trim().slice(0, 100) ||
      '24 Hours Water Supply',
    liftAvailability:
      String(obj.liftAvailability ?? 'Ask on inquiry').trim().slice(0, 100) || 'Ask on inquiry',
    description: String(obj.description ?? '').trim().slice(0, 2400),
    facilities,
    submitterName:
      String(obj.submitterName ?? 'WithBroker Team').trim().slice(0, 100) || 'WithBroker Team',
    submitterMobile,
    submitterWhatsapp,
    submitterRole,
  };
}

/**
 * Verifies the caller's Firebase Auth ID Token via Firebase Identity Toolkit REST API
 * and ensures it belongs strictly to the sole authorized WithBroker admin email.
 * Works identically on Node Express AND Vercel Serverless without needing IAM credentials.
 */
export async function verifySoleAdminFirebaseToken(
  authHeader: string | undefined
): Promise<{ ok: true; email: string; uid: string } | { ok: false; status: number; error: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized: Please sign in as Admin first.' };
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || idToken.length > 8192) {
    return { ok: false, status: 401, error: 'Unauthorized: Invalid authentication token.' };
  }

  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) {
    return { ok: false, status: 500, error: 'Firebase configuration missing on server.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      return {
        ok: false,
        status: 401,
        error: 'Unauthorized: Your admin session has expired. Please sign in again.',
      };
    }

    const data = (await res.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        disabled?: boolean;
      }>;
    };
    const account = data.users?.[0];
    if (!account || account.disabled) {
      return { ok: false, status: 401, error: 'Unauthorized: Account not found or disabled.' };
    }

    const email = (account.email || '').trim().toLowerCase();
    if (!account.emailVerified || email !== SOLE_ADMIN_EMAIL) {
      return {
        ok: false,
        status: 403,
        error: 'Forbidden: Only the authorized WithBroker admin can use the AI assistant.',
      };
    }

    return { ok: true, email, uid: account.localId || '' };
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Unable to verify admin session right now. Please try again.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

const SYSTEM_INSTRUCTION = `You are the WithBroker Admin AI Listing Assistant for rental properties across Pune (and expanding locations across India).

Your job:
1. Help the WithBroker admin quickly add rental flat listings by parsing ANY flat details the admin types or pastes (including messy WhatsApp messages, Hinglish, bullet lists, or short notes) AND inspecting any flat photos attached in the message.
2. When photos are provided, look carefully at the rooms and visually detect:
   - Furnishing level (e.g., bed/sofa/AC/fridge/wardrobe = Fully Furnished; modular kitchen/wardrobes/fans/lights = Semi-Furnished; empty rooms = Unfurnished)
   - Visible amenities/facilities (e.g., Modular Kitchen, Balcony, Wardrobe, AC, Sofa Set, Double Bed, Geyser, Washing Machine, Refrigerator, Gas Stove, Lift, Covered Parking)
   - Mention briefly in "photoInsights" what you noticed in the photos.
3. Always merge new details into the existing "currentDraft" (if provided) so follow-up edits like "change rent to 19000", "add brokerage 15000", "society is Sunita Park", or "make it Semi-Furnished" preserve all previously captured fields.
4. Normalize values strictly:
   - propertyType: one of "1RK", "1BHK", "2BHK", "3BHK" (or "" if truly unknown).
   - furnishingStatus: "Unfurnished", "Semi-Furnished", or "Fully Furnished".
   - monthlyRent: integer INR (e.g. "21k" -> 21000, "18.5k" -> 18500). Set null if not provided yet.
   - securityDeposit: integer INR (e.g. "50k" -> 50000, "2 months" -> 2 * monthlyRent). Set null if unknown.
   - brokerageAmount: integer INR (default 0 if "no brokerage" / "owner" / not mentioned; if "1 month brokerage", compute equal to monthlyRent).
   - submitterRole: "Owner" or "Broker" (default "Owner" unless broker/agent/brokerage is mentioned).
   - submitterName: owner/broker name if mentioned, otherwise "WithBroker Team".
   - submitterMobile / submitterWhatsapp: 10-digit Indian mobile number if mentioned, otherwise "9834626078".
   - title: clean, catchy WithBroker title like "Fully Furnished 2BHK Flat in Sunita Park, Wadgaon Sheri" or "Semi-Furnished 1BHK Near Phoenix Mall".
   - description: crisp, well-written 2–3 sentence rental description summarizing the flat, rent, furnishing, key amenities, and location (never include private owner phone numbers inside the public description!).
5. Essential fields needed before creating a listing: propertyType, location, and monthlyRent (>= 1000).
   - If any of these 3 essential fields is missing, set readyToCreate = false, userConfirmedPublish = false, and politely ask for ONLY the missing field(s) in a concise 1–2 sentence reply.
   - If all 3 essential fields are present, set readyToCreate = true, summarize the extracted flat concisely, and tell the admin they can click "Add & Publish Live" (or reply "publish" / "add it") to add it to the property list.
6. Set userConfirmedPublish = true ONLY when readyToCreate is true AND the admin's latest message explicitly confirms/instructs to add, create, save, or publish the listing now (e.g., "yes add it", "publish now", "add this flat", "save as pending", "confirm", "done add"). If the admin is pasting brand-new flat details for the very first time without saying "publish immediately / add right away", let them preview first (userConfirmedPublish = false), UNLESS they explicitly wrote "add it directly" / "publish immediately" alongside complete details.
7. Set publishMode to "Pending" if the admin asks to save as pending/draft/review; otherwise default to "Available".`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assistantReply: {
      type: Type.STRING,
      description: 'Concise, helpful reply to the admin summarizing extracted details or asking for missing info.',
    },
    readyToCreate: {
      type: Type.BOOLEAN,
      description: 'True if propertyType, location, and monthlyRent (>= 1000) are all present.',
    },
    userConfirmedPublish: {
      type: Type.BOOLEAN,
      description: 'True only if readyToCreate is true AND admin explicitly asked to add/publish now.',
    },
    publishMode: {
      type: Type.STRING,
      description: 'Either "Available" (live on website) or "Pending" (queued for review).',
    },
    photoInsights: {
      type: Type.STRING,
      description: 'Short note on furnishing/features spotted in attached flat photos, or empty string if no photos.',
    },
    draft: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        propertyType: { type: Type.STRING },
        location: { type: Type.STRING },
        societyName: { type: Type.STRING },
        monthlyRent: { type: Type.NUMBER, nullable: true },
        securityDeposit: { type: Type.NUMBER, nullable: true },
        brokerageAmount: { type: Type.NUMBER, nullable: true },
        furnishingStatus: { type: Type.STRING },
        carpetArea: { type: Type.STRING },
        bathrooms: { type: Type.INTEGER },
        balconies: { type: Type.INTEGER },
        floorNumber: { type: Type.STRING },
        totalFloors: { type: Type.STRING },
        availableFrom: { type: Type.STRING },
        suitableFor: { type: Type.STRING },
        parking: { type: Type.STRING },
        waterAvailability: { type: Type.STRING },
        liftAvailability: { type: Type.STRING },
        description: { type: Type.STRING },
        facilities: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        submitterName: { type: Type.STRING },
        submitterMobile: { type: Type.STRING },
        submitterWhatsapp: { type: Type.STRING },
        submitterRole: { type: Type.STRING },
      },
      required: [
        'title',
        'propertyType',
        'location',
        'furnishingStatus',
        'availableFrom',
        'description',
        'facilities',
      ],
    },
  },
  required: [
    'assistantReply',
    'readyToCreate',
    'userConfirmedPublish',
    'publishMode',
    'photoInsights',
    'draft',
  ],
};

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey = '';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedAiClient;
}

export async function runAdminPropertyAssistant(
  rawBody: unknown
): Promise<{ status: number; data?: AdminAiChatResponsePayload; error?: string }> {
  if (!rawBody || typeof rawBody !== 'object') {
    return { status: 400, error: 'Invalid chat request payload.' };
  }

  const body = rawBody as Partial<AdminAiChatRequestPayload>;
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const rawImages = Array.isArray(body.images) ? body.images : [];

  const sanitizedMessages: AdminAiChatMessageInput[] = rawMessages
    .slice(-16)
    .map((m) => ({
      role: m?.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      text: String(m?.text ?? '').trim().slice(0, 4000),
    }))
    .filter((m) => m.text.length > 0);

  const sanitizedImages: AdminAiChatImageInput[] = [];
  for (const img of rawImages.slice(0, 6)) {
    const mimeType = String(img?.mimeType ?? '').trim().toLowerCase();
    const dataBase64 = String(img?.dataBase64 ?? '').trim();
    if (!ALLOWED_IMAGE_MIME.has(mimeType)) continue;
    if (!dataBase64 || dataBase64.length > 750_000) continue;
    if (!/^[A-Za-z0-9+/=]+$/.test(dataBase64)) continue;
    sanitizedImages.push({ mimeType, dataBase64 });
  }

  if (sanitizedMessages.length === 0 && sanitizedImages.length === 0) {
    return { status: 400, error: 'Please enter flat details or attach at least one photo.' };
  }

  const existingDraft = body.currentDraft ? sanitizeAiDraft(body.currentDraft) : null;
  const attachedPhotoCount = Math.max(
    sanitizedImages.length,
    Number.isFinite(Number(body.attachedPhotoCount)) ? Number(body.attachedPhotoCount) : 0
  );

  const transcript = sanitizedMessages
    .map((m) => `${m.role === 'user' ? 'Admin' : 'Assistant'}: ${m.text}`)
    .join('\n\n');

  const promptText = [
    existingDraft
      ? `Current extracted draft JSON (preserve untouched fields and apply any updates):\n${JSON.stringify(existingDraft)}`
      : 'Current extracted draft JSON: none (starting a new flat entry).',
    `Total flat photos currently staged for this listing: ${attachedPhotoCount}.`,
    sanitizedImages.length > 0
      ? `Newly attached flat photos in this message: ${sanitizedImages.length} (inspect them for furnishing, rooms, kitchen, balcony, and amenities).`
      : 'No new image files attached in this message.',
    `Conversation history:\n${transcript || 'Admin uploaded flat photo(s) without text.'}`,
  ].join('\n\n');

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    ...sanitizedImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.dataBase64,
      },
    })),
    { text: promptText },
  ];

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return {
        status: 502,
        error: 'The AI assistant returned an empty response. Please try again.',
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return {
        status: 502,
        error: 'Could not parse the AI assistant response. Please resend your message.',
      };
    }

    const sanitizedDraft = sanitizeAiDraft(parsed.draft);
    const missingFields = computeMissingDraftFields(sanitizedDraft);
    const readyToCreate = missingFields.length === 0;
    const userConfirmedPublish = readyToCreate && parsed.userConfirmedPublish === true;
    const publishMode = parsed.publishMode === 'Pending' ? 'Pending' : 'Available';

    const assistantReply =
      String(parsed.assistantReply ?? '').trim() ||
      (readyToCreate
        ? 'I have extracted all flat details. Review the card below and click "Add & Publish Live" to list it.'
        : `Please share the remaining details: ${missingFields.join(', ')}.`);

    const photoInsights = String(parsed.photoInsights ?? '').trim().slice(0, 300);

    return {
      status: 200,
      data: {
        assistantReply,
        readyToCreate,
        userConfirmedPublish,
        publishMode,
        missingFields,
        photoInsights,
        draft: sanitizedDraft,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'GEMINI_API_KEY_MISSING') {
      return {
        status: 503,
        error:
          'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Settings → Secrets (or Vercel Environment Variables) and retry.',
      };
    }
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
      return {
        status: 403,
        error: 'The Gemini API key appears invalid or lacks permission. Please verify GEMINI_API_KEY in Settings → Secrets.',
      };
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return {
        status: 429,
        error: 'AI request quota reached right now. Please wait a moment and try again.',
      };
    }
    console.error('Admin AI Property Assistant error:', err);
    return {
      status: 500,
      error: 'Unable to reach the AI assistant right now. Please try again in a moment.',
    };
  }
}
