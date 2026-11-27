import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  adminCreatePropertyFromAiDraft,
  compressImageFileToDataUrl,
} from '../lib/firestoreRepo';
import type {
  AdminAiChatImageInput,
  AdminAiChatResponsePayload,
  AiExtractedPropertyDraft,
} from '../types/aiPropertyChat';
import { WHATSAPP_COMMUNITY_NAME, WHATSAPP_COMMUNITY_URL } from '../data/properties';
import { formatINR, getPublicPropertyShareUrl } from '../utils/propertyLogic';
import { WhatsAppIcon } from './WhatsAppButton';

interface AdminAiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onPropertyCreated: (propertyCode: string, status: 'Available' | 'Pending') => void;
}

interface StagedPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface CreatedPropertyResult {
  propertyCode: string;
  workflowStatus: 'Available' | 'Pending';
  photoCount: number;
  title: string;
  location: string;
  monthlyRent: number;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  photoPreviewUrls?: string[];
  photoInsights?: string;
  draft?: AiExtractedPropertyDraft;
  readyToCreate?: boolean;
  missingFields?: string[];
  createdResult?: CreatedPropertyResult;
  isError?: boolean;
}

const MAX_PHOTOS = 8;

const EXAMPLE_PROMPTS = [
  {
    label: 'Paste WhatsApp flat message',
    text: '2BHK semi furnished flat for rent in Sunita Park, Wadgaon Sheri near Phoenix Mall. Rent 24000, deposit 50000, brokerage 1 month. 3rd floor out of 5, 2 bathroom, 1 balcony, 820 sqft carpet, lift & covered parking, available immediately. Owner Amit Deshmukh 9823012345.',
  },
  {
    label: 'Quick 1BHK entry',
    text: '1BHK fully furnished in Viman Nagar near Symbiosis, rent 21k, deposit 45k, no brokerage, immediate possession, working professionals or family.',
  },
];

function createWelcomeMessage(): ChatMessageItem {
  return {
    id: 'welcome',
    role: 'assistant',
    text: 'Send or paste flat details (even a raw WhatsApp message) and attach flat photos below. I will read the details + inspect the photos and prepare the WithBroker listing so you can add it in one tap.',
  };
}

function dataUrlToBase64Parts(dataUrl: string): AdminAiChatImageInput | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2] };
}

export const AdminAiChatbot: React.FC<AdminAiChatbotProps> = ({
  isOpen,
  onClose,
  onPropertyCreated,
}) => {
  const { getIdToken } = useAuth();

  const [messages, setMessages] = useState<ChatMessageItem[]>([createWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<StagedPhoto[]>([]);
  const [activeDraft, setActiveDraft] = useState<AiExtractedPropertyDraft | null>(null);
  const [savedForCurrentDraft, setSavedForCurrentDraft] = useState(false);

  const [sending, setSending] = useState(false);
  const [savingStage, setSavingStage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const stagedPhotosRef = useRef<StagedPhoto[]>([]);
  stagedPhotosRef.current = stagedPhotos;
  const pendingPhotosRef = useRef<StagedPhoto[]>([]);
  pendingPhotosRef.current = pendingPhotos;

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, sending, savingStage]);

  useEffect(() => {
    return () => {
      stagedPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      pendingPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  if (!isOpen) return null;

  const handleResetFlat = () => {
    stagedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setStagedPhotos([]);
    setPendingPhotos([]);
    setActiveDraft(null);
    setSavedForCurrentDraft(false);
    setInputText('');
    setPhotoError(null);
    setMessages([createWelcomeMessage()]);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const currentTotal = stagedPhotos.length + pendingPhotos.length;
    const remaining = MAX_PHOTOS - currentTotal;
    if (remaining <= 0) {
      setPhotoError(`Maximum ${MAX_PHOTOS} photos can be added per flat.`);
      return;
    }

    const validNext: StagedPhoto[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Only image files (JPG, PNG, WebP) are supported.');
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        setPhotoError(`"${file.name}" is larger than 15 MB. Please choose a smaller photo.`);
        continue;
      }
      validNext.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (validNext.length > 0) {
      setPendingPhotos((prev) => [...prev, ...validNext]);
    }
  };

  const handleRemovePendingPhoto = (id: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleRemoveStagedPhoto = (id: string) => {
    setStagedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSaveListing = async (
    draftToSave: AiExtractedPropertyDraft,
    publishMode: 'Available' | 'Pending',
    photosOverride?: StagedPhoto[]
  ) => {
    if (savingStage) return;
    setSavingStage(
      publishMode === 'Available' ? 'Preparing flat for live publishing...' : 'Saving flat as Pending...'
    );
    try {
      const photoList = (photosOverride ?? stagedPhotos).map((p) => p.file);
      const created = await adminCreatePropertyFromAiDraft(
        draftToSave,
        photoList,
        publishMode,
        (stage) => setSavingStage(stage)
      );

      setSavedForCurrentDraft(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `saved-${Date.now()}`,
          role: 'assistant',
          text:
            created.workflowStatus === 'Available'
              ? `Done! "${created.title}" (${created.propertyCode}) has been added to your property list and published live on WithBroker with ${created.photoCount} photo${created.photoCount === 1 ? '' : 's'}.`
              : `Saved! "${created.title}" (${created.propertyCode}) has been added to your Pending Approval queue with ${created.photoCount} photo${created.photoCount === 1 ? '' : 's'}.`,
          createdResult: {
            propertyCode: created.propertyCode,
            workflowStatus: publishMode,
            photoCount: created.photoCount,
            title: created.title,
            location: draftToSave.location,
            monthlyRent: draftToSave.monthlyRent || 0,
          },
        },
      ]);

      onPropertyCreated(created.propertyCode, publishMode);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unable to save flat right now.';
      setMessages((prev) => [
        ...prev,
        {
          id: `save-err-${Date.now()}`,
          role: 'assistant',
          text: `Could not add the flat yet: ${errMsg}`,
          isError: true,
        },
      ]);
    } finally {
      setSavingStage(null);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (sending || savingStage) return;

    const trimmed = inputText.trim();
    const newlyPicked = [...pendingPhotos];
    if (!trimmed && newlyPicked.length === 0) return;

    // If a previous flat was already saved and the admin sends new flat details, start a fresh flat automatically
    let currentStaged = stagedPhotos;
    let currentDraftForRequest = activeDraft;
    if (savedForCurrentDraft) {
      stagedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      currentStaged = [];
      currentDraftForRequest = null;
      setStagedPhotos([]);
      setActiveDraft(null);
      setSavedForCurrentDraft(false);
    }

    const nextStaged = [...currentStaged, ...newlyPicked].slice(0, MAX_PHOTOS);
    setStagedPhotos(nextStaged);
    setPendingPhotos([]);
    setInputText('');
    setPhotoError(null);

    const userMsgText =
      trimmed || `Uploaded ${newlyPicked.length} flat photo${newlyPicked.length === 1 ? '' : 's'}.`;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userMsgText,
      photoPreviewUrls: newlyPicked.map((p) => p.previewUrl),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setSending(true);

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error('Admin session expired. Please sign in again.');
      }

      // Compress newly attached photos for Gemini multimodal analysis (max 6 per turn)
      const encodedImages: AdminAiChatImageInput[] = [];
      for (const item of newlyPicked.slice(0, 6)) {
        try {
          const compressed = await compressImageFileToDataUrl(item.file);
          const parts = dataUrlToBase64Parts(compressed.dataUrl);
          if (parts) encodedImages.push(parts);
        } catch {
          // Skip unreadable image for AI inspection; user still has file staged
        }
      }

      const conversationForApi = nextHistory
        .filter((m) => m.id !== 'welcome' && !m.isError)
        .slice(-14)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/admin/ai-property-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: conversationForApi,
          images: encodedImages,
          currentDraft: currentDraftForRequest,
          attachedPhotoCount: nextStaged.length,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as Partial<AdminAiChatResponsePayload> & {
        error?: string;
      };

      if (!res.ok || !payload.draft) {
        throw new Error(payload.error || 'AI Assistant could not process your message.');
      }

      const aiData = payload as AdminAiChatResponsePayload;
      setActiveDraft(aiData.draft);

      const hasAnyExtractedInfo = Boolean(
        aiData.draft.propertyType ||
          aiData.draft.location ||
          aiData.draft.monthlyRent ||
          aiData.draft.societyName ||
          aiData.draft.facilities.length > 0
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: aiData.assistantReply,
          photoInsights: aiData.photoInsights,
          draft: hasAnyExtractedInfo ? aiData.draft : undefined,
          readyToCreate: aiData.readyToCreate,
          missingFields: aiData.missingFields,
        },
      ]);

      // If admin explicitly confirmed in chat ("yes add it" / "publish now"), save immediately!
      if (aiData.userConfirmedPublish && aiData.readyToCreate) {
        await handleSaveListing(aiData.draft, aiData.publishMode, nextStaged);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: errMsg,
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleCopyShareLink = async (propertyCode: string) => {
    try {
      await navigator.clipboard.writeText(getPublicPropertyShareUrl(propertyCode));
      setCopiedCode(propertyCode);
      setTimeout(() => setCopiedCode((prev) => (prev === propertyCode ? null : prev)), 2500);
    } catch {
      setCopiedCode(null);
    }
  };

  const totalPhotoCount = stagedPhotos.length + pendingPhotos.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-ai-chatbot-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#090A14]/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white text-[#090A14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#140A29] px-4 py-3.5 text-white sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C2AE8] text-white shadow-sm">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="admin-ai-chatbot-title"
                className="flex items-center gap-1.5 font-display text-sm font-bold sm:text-base"
              >
                <span>AI Property Assistant</span>
                <Sparkles className="h-3.5 w-3.5 text-[#C4A1FF]" aria-hidden="true" />
              </h2>
              <p className="truncate text-[11px] text-white/70">
                Paste flat details &amp; upload photos — AI adds it to your list
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleResetFlat}
              disabled={sending || Boolean(savingStage)}
              title="Start a new flat listing"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">New Flat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI assistant"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-white transition-colors hover:bg-white/15"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Staged Photos Tray for Current Flat */}
        {stagedPhotos.length > 0 && (
          <div className="border-b border-[#090A14]/8 bg-[#F9F8FC] px-4 py-2.5 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#524F61]">
                Attached Flat Photos ({stagedPhotos.length}/{MAX_PHOTOS})
              </span>
              {totalPhotoCount < MAX_PHOTOS && !savedForCurrentDraft && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B1CD4] hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Add more
                </button>
              )}
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {stagedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-[#090A14]/12 bg-white"
                >
                  <img
                    src={photo.previewUrl}
                    alt={`Flat photo ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-[#140A29]/80 text-center text-[9px] font-bold text-white">
                      Cover
                    </span>
                  )}
                  {!savedForCurrentDraft && (
                    <button
                      type="button"
                      aria-label={`Remove photo ${idx + 1}`}
                      onClick={() => handleRemoveStagedPhoto(photo.id)}
                      className="absolute top-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#090A14]/75 text-white hover:bg-red-600"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Bubble */}
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[85%] ${
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-[#6B1CD4] text-white'
                    : msg.isError
                      ? 'rounded-bl-sm border border-red-200 bg-red-50 text-red-800'
                      : 'rounded-bl-sm border border-[#090A14]/8 bg-[#F9F8FC] text-[#090A14]'
                }`}
              >
                {msg.isError && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-red-700">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Assistant Notice</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.text}</p>

                {msg.photoPreviewUrls && msg.photoPreviewUrls.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {msg.photoPreviewUrls.map((url, idx) => (
                      <img
                        key={`${msg.id}-img-${idx}`}
                        src={url}
                        alt={`Uploaded photo ${idx + 1}`}
                        className="h-14 w-16 rounded-lg border border-white/25 object-cover"
                      />
                    ))}
                  </div>
                )}

                {msg.photoInsights && (
                  <div className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-[#F5EFFD] px-3 py-2 text-xs text-[#5412AD]">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{msg.photoInsights}</span>
                  </div>
                )}
              </div>

              {/* Extracted Property Draft Preview Card */}
              {msg.draft && (
                <div
                  data-testid="ai-extracted-draft-card"
                  className="mt-2.5 w-full max-w-[96%] overflow-hidden rounded-2xl border border-[#6B1CD4]/25 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#090A14]/8 bg-[#F5EFFD]/70 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#6B1CD4]" />
                      <span className="font-display text-xs font-bold text-[#090A14]">
                        Extracted Property Entry
                      </span>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        msg.readyToCreate
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {msg.readyToCreate ? 'Ready to Add' : 'Needs Details'}
                    </span>
                  </div>

                  <div className="space-y-3 p-4 text-xs">
                    <div>
                      <p className="font-display text-sm font-bold text-[#090A14]">
                        {msg.draft.title ||
                          `${msg.draft.propertyType || 'Flat'} in ${msg.draft.location || 'Pune'}`}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[#524F61]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" />
                        <span>
                          {[msg.draft.societyName, msg.draft.location].filter(Boolean).join(' · ') ||
                            'Location pending'}
                        </span>
                      </p>
                    </div>

                    {/* Key Financials & Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-[#F9F8FC] p-2.5">
                        <p className="text-[10px] font-semibold text-[#656275]">Monthly Rent</p>
                        <p className="mt-0.5 font-display text-sm font-bold text-[#090A14] tabular-nums">
                          {msg.draft.monthlyRent ? formatINR(msg.draft.monthlyRent) : 'Not set'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F9F8FC] p-2.5">
                        <p className="text-[10px] font-semibold text-[#656275]">Deposit</p>
                        <p className="mt-0.5 font-semibold text-[#090A14] tabular-nums">
                          {msg.draft.securityDeposit !== null
                            ? formatINR(msg.draft.securityDeposit)
                            : 'Ask on inquiry'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F9F8FC] p-2.5">
                        <p className="text-[10px] font-semibold text-[#656275]">Brokerage</p>
                        <p className="mt-0.5 font-semibold text-[#090A14] tabular-nums">
                          {msg.draft.brokerageAmount && msg.draft.brokerageAmount > 0
                            ? formatINR(msg.draft.brokerageAmount)
                            : 'No Brokerage'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F9F8FC] p-2.5">
                        <p className="text-[10px] font-semibold text-[#656275]">Type &amp; Furnishing</p>
                        <p className="mt-0.5 font-semibold text-[#090A14]">
                          {msg.draft.propertyType || '—'} · {msg.draft.furnishingStatus}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F9F8FC] p-2.5">
                        <p className="text-[10px] font-semibold text-[#656275]">Specs</p>
                        <p className="mt-0.5 font-semibold text-[#090A14]">
                          {msg.draft.bathrooms} Bath · {msg.draft.balconies} Balc
                          {msg.draft.carpetArea ? ` · ${msg.draft.carpetArea}` : ''}
                        </p>
                      </div>
                      <div className="rounded-xl bg-[#F9F8FC] p-2.5">
                        <p className="text-[10px] font-semibold text-[#656275]">Photos &amp; Floor</p>
                        <p className="mt-0.5 font-semibold text-[#090A14]">
                          {stagedPhotos.length} photo{stagedPhotos.length === 1 ? '' : 's'}
                          {msg.draft.floorNumber
                            ? ` · Fl ${msg.draft.floorNumber}${msg.draft.totalFloors ? `/${msg.draft.totalFloors}` : ''}`
                            : ''}
                        </p>
                      </div>
                    </div>

                    {/* Owner/Broker Private Record */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#090A14]/8 bg-[#F9F8FC] px-3 py-2 text-[11px] text-[#524F61]">
                      <span className="flex items-center gap-1.5 font-semibold text-[#090A14]">
                        <Phone className="h-3.5 w-3.5 text-[#6B1CD4]" />
                        {msg.draft.submitterName} ({msg.draft.submitterRole})
                      </span>
                      <span className="tabular-nums">
                        Mobile: {msg.draft.submitterMobile} · Available: {msg.draft.availableFrom}
                      </span>
                    </div>

                    {msg.draft.facilities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.draft.facilities.map((fac) => (
                          <span
                            key={fac}
                            className="rounded-md bg-[#F5EFFD] px-2 py-0.5 text-[11px] font-semibold text-[#6B1CD4]"
                          >
                            {fac}
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.draft.description && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-[#524F61]">
                        {msg.draft.description}
                      </p>
                    )}

                    {msg.missingFields && msg.missingFields.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                        Missing to add: {msg.missingFields.join(', ')}
                      </div>
                    )}

                    {/* Direct Add/Publish Action Buttons */}
                    {msg.readyToCreate && !savedForCurrentDraft && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          data-testid="ai-publish-live-btn"
                          disabled={Boolean(savingStage) || sending}
                          onClick={() => void handleSaveListing(msg.draft!, 'Available')}
                          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#16A34A] px-4 text-xs font-bold text-white transition-colors hover:bg-[#15803D] disabled:opacity-60"
                        >
                          {savingStage ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{savingStage}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Add &amp; Publish Live</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          data-testid="ai-save-pending-btn"
                          disabled={Boolean(savingStage) || sending}
                          onClick={() => void handleSaveListing(msg.draft!, 'Pending')}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#090A14]/15 bg-white px-3.5 text-xs font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4] disabled:opacity-60"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>Save Pending</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Success Confirmation Card */}
              {msg.createdResult && (
                <div
                  data-testid="ai-created-success-card"
                  className="mt-2.5 w-full max-w-[96%] rounded-2xl border border-emerald-200 bg-emerald-50/75 p-4 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-display text-sm font-bold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Property Added ({msg.createdResult.propertyCode})</span>
                    </div>
                    <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {msg.createdResult.workflowStatus === 'Available' ? 'LIVE' : 'PENDING'}
                    </span>
                  </div>
                  <p className="mt-1 text-emerald-900/80">
                    {msg.createdResult.title} · {formatINR(msg.createdResult.monthlyRent)}/mo ·{' '}
                    {msg.createdResult.photoCount} photo
                    {msg.createdResult.photoCount === 1 ? '' : 's'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.createdResult.workflowStatus === 'Available' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleCopyShareLink(msg.createdResult!.propertyCode)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6B1CD4] px-3 text-xs font-semibold text-white hover:bg-[#5412AD]"
                        >
                          {copiedCode === msg.createdResult.propertyCode ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Link Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Share Link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `🏠 ${msg.createdResult.title}\n🆔 Property ID: ${msg.createdResult.propertyCode}\n\n💰 Rent: ${formatINR(msg.createdResult.monthlyRent)}/month\n📍 Location: ${msg.createdResult.location}\n\nView full details and photos:\n${getPublicPropertyShareUrl(msg.createdResult.propertyCode)}\n\n👥 Join ${WHATSAPP_COMMUNITY_NAME} (WhatsApp Group):\n${WHATSAPP_COMMUNITY_URL}\n\nListed on WITHBROKER\nRENT • SEARCH • CONNECT`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D]"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5 text-white" />
                          <span>Share on WhatsApp</span>
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleResetFlat}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-700/25 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Another Flat</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Quick Example Prompts on First Message */}
          {messages.length === 1 && !sending && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-[#656275]">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => setInputText(sample.text)}
                    className="rounded-xl border border-[#6B1CD4]/20 bg-[#F5EFFD]/60 px-3 py-1.5 text-left text-xs font-semibold text-[#5412AD] transition-colors hover:bg-[#F5EFFD]"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs font-medium text-[#656275]">
              <Loader2 className="h-4 w-4 animate-spin text-[#6B1CD4]" />
              <span>AI is reading flat details &amp; analyzing photos...</span>
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Composer Footer */}
        <form
          onSubmit={(e) => void handleSendMessage(e)}
          className="border-t border-[#090A14]/10 bg-white px-4 py-3 sm:px-5"
        >
          {photoError && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
              <span>{photoError}</span>
              <button type="button" onClick={() => setPhotoError(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Pending Photos to Send with Next Message */}
          {pendingPhotos.length > 0 && (
            <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
              {pendingPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-[#6B1CD4]/35 bg-[#F5EFFD]"
                >
                  <img
                    src={photo.previewUrl}
                    alt={`Selected photo ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove selected photo"
                    onClick={() => handleRemovePendingPhoto(photo.id)}
                    className="absolute top-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#090A14]/80 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || Boolean(savingStage) || totalPhotoCount >= MAX_PHOTOS}
              title="Attach flat photos"
              aria-label="Attach flat photos"
              data-testid="ai-attach-photos-btn"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/15 bg-[#F9F8FC] text-[#6B1CD4] transition-colors hover:border-[#6B1CD4] hover:bg-[#F5EFFD] disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" />
            </button>

            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Paste flat details (rent, BHK, area, owner) or type changes..."
              data-testid="ai-chat-input"
              disabled={sending || Boolean(savingStage)}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-[#090A14]/15 bg-[#F9F8FC] px-3.5 py-2.5 text-sm text-[#090A14] placeholder:text-[#656275] focus:border-[#6B1CD4] focus:bg-white focus:outline-none disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={
                sending ||
                Boolean(savingStage) ||
                (!inputText.trim() && pendingPhotos.length === 0)
              }
              aria-label="Send message to AI assistant"
              data-testid="ai-chat-send-btn"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#6B1CD4] px-4 text-sm font-bold text-white transition-colors hover:bg-[#5412AD] disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
