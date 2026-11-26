import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, Type } from '@google/genai';

type VercelReq = IncomingMessage & {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type VercelRes = ServerResponse & {
  status?: (code: number) => VercelRes;
  json?: (payload: unknown) => void;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

const SOLE_ADMIN_EMAIL = 'yogeshbkumbhar0.2@gmail.com';
const VALID_PROPERTY_TYPES = new Set(['1RK', '1BHK', '2BHK', '3BHK']);
const VALID_FURNISHING = new Set(['Unfurnished', 'Semi-Furnished', 'Fully Furnished']);
const VALID_ROLES = new Set(['Owner', 'Broker']);
const VALID_SUITABLE_FOR = new Set([
  'Family',
  'Bachelors',
  'Working Professionals',
  'Family / Bachelors',
]);
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

let cachedFirebaseApiKey: string | null = null;
let cachedAiClient: GoogleGenAI | null = null;
let cachedGeminiKey = '';

function sendJson(res: VercelRes, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function loadFirebaseApiKey(): string {
  if (cachedFirebaseApiKey !== null) return cachedFirebaseApiKey;
  const candidates = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(process.cwd(), '..', 'firebase-applet-config.json'),
    path.resolve(process.cwd(), '..', '..', 'firebase-applet-config.json'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { apiKey?: string };
        cachedFirebaseApiKey = parsed.apiKey || '';
        return cachedFirebaseApiKey;
      }
    } catch {
      // Try next
    }
  }
  cachedFirebaseApiKey = '';
  return cachedFirebaseApiKey;
}

function normalizePhone10(raw: unknown, fallback = '9834626078'): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const trimmed = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(trimmed) ? trimmed : fallback;
}

function parseOptionalNonNegNumber(val: unknown, max: number): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(max, Math.round(num));
}

function sanitizeAiDraft(raw: unknown) {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawType = String(obj.propertyType ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const propertyType = VALID_PROPERTY_TYPES.has(rawType) ? rawType : '';

  const rawFurnishing = String(obj.furnishingStatus ?? '').trim();
  const furnishingStatus = VALID_FURNISHING.has(rawFurnishing)
    ? rawFurnishing
    : rawFurnishing.toLowerCase().includes('full')
      ? 'Fully Furnished'
      : rawFurnishing.toLowerCase().includes('semi')
        ? 'Semi-Furnished'
        : 'Unfurnished';

  const rawRole = String(obj.submitterRole ?? '').trim();
  const submitterRole = VALID_ROLES.has(rawRole)
    ? rawRole
    : rawRole.toLowerCase().includes('broker')
      ? 'Broker'
      : 'Owner';

  const rawSuitable = String(obj.suitableFor ?? '').trim();
  const suitableFor = VALID_SUITABLE_FOR.has(rawSuitable) ? rawSuitable : 'Family / Bachelors';

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

async function verifySoleAdminToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, error: 'Unauthorized: Please sign in as Admin first.' };
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || idToken.length > 8192) {
    return { ok: false as const, status: 401, error: 'Unauthorized: Invalid authentication token.' };
  }
  const apiKey = loadFirebaseApiKey();
  if (!apiKey) {
    return { ok: false as const, status: 500, error: 'Firebase configuration missing on server.' };
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
        ok: false as const,
        status: 401,
        error: 'Unauthorized: Your admin session has expired. Please sign in again.',
      };
    }
    const data = (await res.json()) as {
      users?: Array<{ email?: string; emailVerified?: boolean; disabled?: boolean }>;
    };
    const account = data.users?.[0];
    if (!account || account.disabled) {
      return { ok: false as const, status: 401, error: 'Unauthorized: Account not found or disabled.' };
    }
    const email = (account.email || '').trim().toLowerCase();
    if (!account.emailVerified || email !== SOLE_ADMIN_EMAIL) {
      return {
        ok: false as const,
        status: 403,
        error: 'Forbidden: Only the authorized WithBroker admin can use the AI assistant.',
      };
    }
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      status: 503,
      error: 'Unable to verify admin session right now. Please try again.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

const SYSTEM_INSTRUCTION = `You are the WithBroker Admin AI Listing Assistant for Pune rental properties.
Parse flat details from text (including WhatsApp messages, Hinglish, or notes) and inspect any attached flat photos for furnishing level and amenities.
Always merge updates into currentDraft so previously captured fields are preserved.
Normalize propertyType ("1RK","1BHK","2BHK","3BHK",""), furnishingStatus ("Unfurnished","Semi-Furnished","Fully Furnished"), monthlyRent (integer INR), securityDeposit (integer INR or null), brokerageAmount (integer INR, default 0), submitterRole ("Owner"|"Broker"), submitterName (default "WithBroker Team"), submitterMobile/submitterWhatsapp (10-digit Indian phone or "9834626078").
Never put private owner phone numbers inside the public description.
Essential fields: propertyType, location, monthlyRent (>=1000). Set readyToCreate=true when all 3 are present. Set userConfirmedPublish=true only when readyToCreate=true and the admin explicitly asks to add/publish now.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assistantReply: { type: Type.STRING },
    readyToCreate: { type: Type.BOOLEAN },
    userConfirmedPublish: { type: Type.BOOLEAN },
    publishMode: { type: Type.STRING },
    photoInsights: { type: Type.STRING },
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
        facilities: { type: Type.ARRAY, items: { type: Type.STRING } },
        submitterName: { type: Type.STRING },
        submitterMobile: { type: Type.STRING },
        submitterWhatsapp: { type: Type.STRING },
        submitterRole: { type: Type.STRING },
      },
      required: ['title', 'propertyType', 'location', 'furnishingStatus', 'availableFrom', 'description', 'facilities'],
    },
  },
  required: ['assistantReply', 'readyToCreate', 'userConfirmedPublish', 'publishMode', 'photoInsights', 'draft'],
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');
  if (!cachedAiClient || cachedGeminiKey !== apiKey) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    cachedGeminiKey = apiKey;
  }
  return cachedAiClient;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }

    const rawAuth = req.headers.authorization;
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
    const authCheck = await verifySoleAdminToken(authHeader);
    if (authCheck.ok === false) {
      sendJson(res, authCheck.status, { error: authCheck.error });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON request body.' });
        return;
      }
    }
    if (!body || typeof body !== 'object') {
      sendJson(res, 400, { error: 'Invalid chat request payload.' });
      return;
    }

    const b = body as {
      messages?: Array<{ role?: string; text?: string }>;
      images?: Array<{ mimeType?: string; dataBase64?: string }>;
      currentDraft?: unknown;
      attachedPhotoCount?: number;
    };

    const messages = (Array.isArray(b.messages) ? b.messages : [])
      .slice(-16)
      .map((m) => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        text: String(m?.text ?? '').trim().slice(0, 4000),
      }))
      .filter((m) => m.text.length > 0);

    const images: Array<{ mimeType: string; dataBase64: string }> = [];
    for (const img of (Array.isArray(b.images) ? b.images : []).slice(0, 6)) {
      const mimeType = String(img?.mimeType ?? '').trim().toLowerCase();
      const dataBase64 = String(img?.dataBase64 ?? '').trim();
      if (!ALLOWED_IMAGE_MIME.has(mimeType)) continue;
      if (!dataBase64 || dataBase64.length > 750_000 || !/^[A-Za-z0-9+/=]+$/.test(dataBase64)) {
        continue;
      }
      images.push({ mimeType, dataBase64 });
    }

    if (messages.length === 0 && images.length === 0) {
      sendJson(res, 400, { error: 'Please enter flat details or attach at least one photo.' });
      return;
    }

    const existingDraft = b.currentDraft ? sanitizeAiDraft(b.currentDraft) : null;
    const attachedPhotoCount = Math.max(
      images.length,
      Number.isFinite(Number(b.attachedPhotoCount)) ? Number(b.attachedPhotoCount) : 0
    );

    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Admin' : 'Assistant'}: ${m.text}`)
      .join('\n\n');

    const promptText = [
      existingDraft
        ? `Current extracted draft JSON:\n${JSON.stringify(existingDraft)}`
        : 'Current extracted draft JSON: none.',
      `Total flat photos staged: ${attachedPhotoCount}.`,
      `Conversation:\n${transcript || 'Admin uploaded flat photo(s).'}`,
    ].join('\n\n');

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.dataBase64 } })),
      { text: promptText },
    ];

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
      sendJson(res, 502, { error: 'AI assistant returned an empty response. Please try again.' });
      return;
    }

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const draft = sanitizeAiDraft(parsed.draft);
    const missingFields: string[] = [];
    if (!draft.propertyType) missingFields.push('Property Type (1RK, 1BHK, 2BHK, or 3BHK)');
    if (draft.location.trim().length < 2) missingFields.push('Location / Area in Pune');
    if (!draft.monthlyRent || draft.monthlyRent < 1000) missingFields.push('Monthly Rent (₹)');

    const readyToCreate = missingFields.length === 0;
    sendJson(res, 200, {
      assistantReply:
        String(parsed.assistantReply ?? '').trim() ||
        (readyToCreate
          ? 'I extracted all flat details. Review the preview below and click "Add & Publish Live".'
          : `Please share: ${missingFields.join(', ')}.`),
      readyToCreate,
      userConfirmedPublish: readyToCreate && parsed.userConfirmedPublish === true,
      publishMode: parsed.publishMode === 'Pending' ? 'Pending' : 'Available',
      missingFields,
      photoInsights: String(parsed.photoInsights ?? '').trim().slice(0, 300),
      draft,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'GEMINI_API_KEY_MISSING') {
      sendJson(res, 503, {
        error:
          'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Vercel Environment Variables (or Settings → Secrets) and redeploy.',
      });
      return;
    }
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
      sendJson(res, 403, {
        error: 'The Gemini API key appears invalid or lacks permission. Please verify GEMINI_API_KEY.',
      });
      return;
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      sendJson(res, 429, { error: 'AI request quota reached right now. Please wait and try again.' });
      return;
    }
    console.error('api/admin/ai-property-chat error:', err);
    sendJson(res, 500, { error: 'Unable to reach the AI assistant right now. Please try again.' });
  }
}
