import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Lock,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { WHATSAPP_NUMBER_DISPLAY, WITHBROKER_LOGO_URL } from '../data/properties';
import { submitPublicProperty } from '../lib/firestoreRepo';
import {
  FurnishingStatus,
  PropertySubmissionInput,
  PropertyType,
  SubmissionValidationErrors,
} from '../types/property';
import {
  buildPropertySubmissionWhatsAppUrl,
  generateAutoPropertyDescription,
  validateSubmissionForm,
} from '../utils/propertyLogic';
import { LocationPickerField } from './LocationPickerField';
import { WhatsAppIcon } from './WhatsAppButton';

interface PostPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  ownerOnly?: boolean;
  standalone?: boolean;
}

const PROPERTY_TYPES: PropertyType[] = ['1RK', '1BHK', '2BHK', '3BHK'];

const FURNISHING_TYPES: FurnishingStatus[] = [
  'Unfurnished',
  'Semi-Furnished',
  'Fully Furnished',
];

const FACILITY_CHOICES = [
  '24 Hours Water',
  'Electricity',
  'Two-Wheeler Parking',
  'Car Parking',
  'Lift',
  'Modular Kitchen',
  'Balcony',
  'Bachelors Allowed',
  'Family Allowed',
  'Security / CCTV',
];

const INITIAL_FORM_STATE: PropertySubmissionInput = {
  name: '',
  mobile: '',
  whatsapp: '',
  submitterRole: 'Owner',
  propertyType: '1BHK',
  location: '',
  lat: null,
  lng: null,
  locationSource: 'manual',
  societyName: '',
  monthlyRent: '',
  securityDeposit: '',
  brokerageAmount: '0',
  furnishingStatus: 'Unfurnished',
  availableFrom: new Date().toISOString().split('T')[0],
  bathrooms: '1',
  balconies: '1',
  floorNumber: '',
  totalFloors: '',
  carpetArea: '',
  description: '',
  facilities: ['24 Hours Water', 'Electricity'],
  photoNames: [],
};

interface SelectedPhotoItem {
  file: File;
  previewUrl: string;
}

interface SubmissionSuccess {
  propertyCode: string;
  submittedAt: string;
  photoCount: number;
  whatsAppUrl: string;
  submitterName: string;
}

export const PostPropertyModal: React.FC<PostPropertyModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  ownerOnly = false,
  standalone = false,
}) => {
  const [form, setForm] = useState<PropertySubmissionInput>({
    ...INITIAL_FORM_STATE,
    submitterRole: 'Owner',
  });
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [showMoreSpecs, setShowMoreSpecs] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotoItem[]>([]);
  const [errors, setErrors] = useState<SubmissionValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingStage, setSubmittingStage] = useState('Submitting Property...');
  const [successInfo, setSuccessInfo] = useState<SubmissionSuccess | null>(null);

  const overlayScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopBodyRef = useRef<HTMLDivElement | null>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const autoDescription = useMemo(
    () => generateAutoPropertyDescription(form),
    [
      form.propertyType,
      form.furnishingStatus,
      form.location,
      form.societyName,
      form.monthlyRent,
      form.securityDeposit,
      form.brokerageAmount,
      form.bathrooms,
      form.balconies,
      form.floorNumber,
      form.totalFloors,
      form.carpetArea,
      form.availableFrom,
      form.facilities,
    ]
  );

  const displayedDescription = descriptionEdited ? form.description : autoDescription;

  const scrollModalToTop = () => {
    if (standalone && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    overlayScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    desktopBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Lock background page scroll only in modal mode (standalone page uses natural window scroll)
  useEffect(() => {
    if (!isOpen || standalone || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, standalone]);

  useEffect(() => {
    if (!isOpen || standalone) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, standalone, onClose, submitting]);

  // Clean up any remaining preview blob URLs ONLY on unmount (never mid-edit!)
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  if (!isOpen) return null;

  const toggleFacility = (facility: string) => {
    setForm((prev) => {
      const exists = prev.facilities.includes(facility);
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter((f) => f !== facility)
          : [...prev.facilities, facility],
      };
    });
  };

  const handleMobileChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      mobile: value,
      whatsapp: sameAsMobile ? value : prev.whatsapp,
    }));
  };

  const handleSameAsMobileToggle = (checked: boolean) => {
    setSameAsMobile(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, whatsapp: prev.mobile }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);
    const nextPhotos: SelectedPhotoItem[] = [...selectedPhotos];
    let photoErr: string | undefined;

    for (const file of incoming) {
      if (nextPhotos.length >= 8) {
        photoErr = 'Maximum 8 photos allowed per property.';
        break;
      }
      // Mobile galleries occasionally emit empty MIME type or image/jpg
      if (file.type && !file.type.startsWith('image/')) {
        photoErr = 'Please select valid image photos (JPG, PNG, or WebP).';
        continue;
      }
      // Photos are automatically compressed to <380KB before upload, so allow up to 15 MB raw camera photos
      if (file.size > 15 * 1024 * 1024) {
        photoErr = `"${file.name}" is larger than 15 MB. Please choose a smaller photo.`;
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      nextPhotos.push({
        file,
        previewUrl,
      });
    }

    setErrors((prev) => ({ ...prev, photos: photoErr }));
    setSelectedPhotos(nextPhotos);
    setForm((prev) => ({
      ...prev,
      photoNames: nextPhotos.map((p) => p.file.name),
    }));
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current.delete(target.previewUrl);
      }
      const updated = prev.filter((_, idx) => idx !== index);
      setForm((f) => ({ ...f, photoNames: updated.map((p) => p.file.name) }));
      return updated;
    });
    setErrors((prev) => ({ ...prev, photos: undefined }));
  };

  const clearPhotos = () => {
    selectedPhotos.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      previewUrlsRef.current.delete(item.previewUrl);
    });
    setSelectedPhotos([]);
    setForm((prev) => ({ ...prev, photoNames: [] }));
    setErrors((prev) => ({ ...prev, photos: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const finalDesc =
      descriptionEdited && form.description.trim().length >= 10
        ? form.description.trim()
        : autoDescription;

    const normalizedInput: PropertySubmissionInput = {
      ...form,
      submitterRole: ownerOnly ? 'Owner' : form.submitterRole,
      whatsapp: sameAsMobile ? form.mobile : form.whatsapp,
      description: finalDesc,
    };

    const validationErrors = validateSubmissionForm(normalizedInput);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      window.requestAnimationFrame(() => {
        const firstInvalid = overlayScrollRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]'
        );
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus?.({ preventScroll: true });
        } else {
          scrollModalToTop();
        }
      });
      return;
    }

    setSubmitting(true);
    setSubmittingStage(
      selectedPhotos.length > 0
        ? `Preparing ${selectedPhotos.length} photo${selectedPhotos.length === 1 ? '' : 's'}...`
        : 'Saving property listing...'
    );
    try {
      const result = await submitPublicProperty(
        normalizedInput,
        selectedPhotos.map((item) => item.file),
        (stage) => setSubmittingStage(stage)
      );

      const waUrl = buildPropertySubmissionWhatsAppUrl(normalizedInput, result.propertyCode);
      setSuccessInfo({
        propertyCode: result.propertyCode,
        submittedAt: result.submittedAt,
        photoCount: result.photoCount,
        whatsAppUrl: waUrl,
        submitterName: normalizedInput.name.trim(),
      });
      onSubmitted?.();
      window.requestAnimationFrame(scrollModalToTop);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      if (msg.includes('Please wait') || msg.includes('Photo "')) {
        setServerError(msg);
      } else {
        setServerError(
          'Could not save your submission right now. Please check all required fields and try again.'
        );
      }
      window.requestAnimationFrame(scrollModalToTop);
    } finally {
      setSubmitting(false);
      setSubmittingStage('Submitting Property...');
    }
  };

  const handleResetSubmission = () => {
    clearPhotos();
    setForm(INITIAL_FORM_STATE);
    setSameAsMobile(true);
    setDescriptionEdited(false);
    setShowMoreSpecs(false);
    setErrors({});
    setServerError(null);
    setSuccessInfo(null);
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  const formHeader = standalone ? (
    <header className="sticky top-0 z-30 border-b border-[#090A14]/8 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={WITHBROKER_LOGO_URL}
            alt="WithBroker"
            className="h-8 w-auto shrink-0 object-contain sm:h-9"
          />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-semibold text-[#6B1CD4]">
              Direct Owner Form · Free &amp; Fast · No Login Needed
            </p>
            <h1
              id="post-property-modal-title"
              className="truncate font-display text-lg font-bold text-[#090A14]"
            >
              Add Your Flat (Owners Only)
            </h1>
          </div>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={onClose}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 bg-white px-3 text-xs font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4] disabled:opacity-50"
        >
          View Website
        </button>
      </div>
      <div className="border-t border-[#090A14]/6 bg-[#FAF8FF] px-4 py-2 sm:hidden">
        <p className="text-[11px] font-semibold text-[#6B1CD4]">
          Direct Owner Form · Free &amp; Fast · No Login Needed
        </p>
        <p className="font-display text-sm font-bold text-[#090A14]">
          Add Your Flat (Owners Only)
        </p>
      </div>
    </header>
  ) : (
    <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b border-[#090A14]/8 bg-white px-4 py-3.5 sm:static sm:px-6 sm:py-4">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-[#6B1CD4] sm:text-xs">
          Fast Free Listing · Owners &amp; Brokers · No Login Needed
        </p>
        <h2
          id="post-property-modal-title"
          className="truncate font-display text-base font-bold text-[#090A14] sm:text-xl"
        >
          Add Your Property Free
        </h2>
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={onClose}
        aria-label="Close post flat modal"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 text-[#090A14] transition-colors hover:bg-[#F9F8FC] disabled:opacity-50"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  const outerWrapperClass = standalone
    ? 'min-h-screen w-full bg-[#F9F8FC] text-[#090A14]'
    : 'fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#F9F8FC] sm:flex sm:items-center sm:justify-center sm:overflow-hidden sm:bg-[#090A14]/65 sm:p-5 sm:backdrop-blur-xs';

  const cardWrapperClass = standalone
    ? 'flex min-h-screen w-full flex-col bg-[#F9F8FC]'
    : 'relative flex min-h-full w-full flex-col bg-[#F9F8FC] sm:min-h-0 sm:max-h-[92vh] sm:max-w-3xl sm:overflow-hidden sm:rounded-2xl sm:bg-white sm:shadow-2xl';

  const bodyWrapperClass = standalone
    ? 'mx-auto w-full max-w-3xl flex-1 px-3.5 py-4 pb-8 sm:px-6 sm:py-6'
    : 'flex-1 bg-[#F9F8FC] p-3.5 pb-6 sm:min-h-0 sm:overflow-y-auto sm:overscroll-contain sm:p-6';

  return (
    <div
      ref={overlayScrollRef}
      role={standalone ? 'main' : 'dialog'}
      aria-modal={standalone ? undefined : true}
      aria-labelledby="post-property-modal-title"
      className={outerWrapperClass}
      onClick={() => {
        if (!standalone && !submitting) onClose();
      }}
    >
      <div
        className={cardWrapperClass}
        onClick={(e) => {
          if (!standalone) e.stopPropagation();
        }}
      >
        {formHeader}

        {/* Scrollable Body (Native single-document scroll on mobile; bounded inner scroll on desktop) */}
        <div ref={desktopBodyRef} className={bodyWrapperClass}>
          {successInfo ? (
            <div
              data-testid="submission-confirmation"
              role="status"
              className="rounded-2xl border border-[#16A34A]/25 bg-white p-5 sm:p-6 shadow-xs"
            >
              <div className="flex items-start gap-3.5">
                <CheckCircle2
                  className="mt-0.5 h-7 w-7 shrink-0 text-[#16A34A]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-[#090A14]">
                      Property Submitted Successfully
                    </h3>
                    <span
                      data-testid="submitted-property-code"
                      className="rounded-lg bg-[#F5EFFD] px-2.5 py-1 text-xs font-bold text-[#6B1CD4] tabular-nums"
                    >
                      Property ID: {successInfo.propertyCode}
                    </span>
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-600/20">
                      Status: PENDING
                    </span>
                  </div>

                  <p className="mt-2.5 text-sm leading-relaxed text-[#524F61]">
                    Thank you! Your property has been submitted successfully. Our WithBroker admin will review your listing. Once approved, it will be visible on our website.
                  </p>
                  {successInfo.photoCount > 0 && (
                    <p className="mt-1.5 text-xs font-medium text-[#656275]">
                      Saved {successInfo.photoCount} property photo{successInfo.photoCount === 1 ? '' : 's'} securely for admin review.
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                    <a
                      href={successInfo.whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#15803D]"
                    >
                      <WhatsAppIcon className="h-4 w-4 text-white" />
                      <span>Notify Team on WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleResetSubmission}
                      className="h-11 rounded-xl border border-[#090A14]/15 bg-white px-4 text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                    >
                      Submit Another Property
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-11 rounded-xl px-4 text-sm font-semibold text-[#656275] hover:text-[#090A14]"
                    >
                      {standalone ? 'Explore WithBroker Website' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form
              id="post-property-form"
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4 pb-4"
            >
              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm font-medium text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Section 1: Owner / Broker Details */}
              <div className="rounded-2xl border border-[#090A14]/8 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-[#090A14]">
                    {ownerOnly ? '1. Flat Owner Contact Details' : '1. Your Contact Details'}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F5EFFD] px-2 py-0.5 text-[11px] font-semibold text-[#6B1CD4]">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Admin Only
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#656275] sm:text-xs">
                  Your number is shown <strong className="text-[#090A14]">only in the Admin Panel</strong>. Public tenants always contact WithBroker ({WHATSAPP_NUMBER_DISPLAY}).
                </p>

                <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <span className="block text-xs font-semibold text-[#090A14]">Listing By *</span>
                    {ownerOnly ? (
                      <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[#6B1CD4]/25 bg-[#F5EFFD]/70 px-3.5 text-xs font-bold text-[#6B1CD4]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Direct Property Owner</span>
                      </div>
                    ) : (
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] p-1">
                        {(['Owner', 'Broker'] as const).map((role) => (
                          <button
                            key={role}
                            type="button"
                            aria-pressed={form.submitterRole === role}
                            onClick={() => setForm({ ...form, submitterRole: role })}
                            className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                              form.submitterRole === role
                                ? 'bg-[#6B1CD4] text-white shadow-2xs'
                                : 'text-[#656275] hover:text-[#090A14]'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sub-name" className="block text-xs font-semibold text-[#090A14]">
                      Full Name *
                    </label>
                    <input
                      id="sub-name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Amit Deshmukh"
                      aria-invalid={Boolean(errors.name)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-base text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                    />
                    {errors.name && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sub-mobile" className="block text-xs font-semibold text-[#090A14]">
                      Mobile Number *
                    </label>
                    <input
                      id="sub-mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={form.mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder="10-digit mobile number"
                      aria-invalid={Boolean(errors.mobile)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-base text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                    />
                    {errors.mobile && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.mobile}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="sub-whatsapp"
                        className="block text-xs font-semibold text-[#090A14]"
                      >
                        WhatsApp Number *
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#6B1CD4]">
                        <input
                          type="checkbox"
                          checked={sameAsMobile}
                          onChange={(e) => handleSameAsMobileToggle(e.target.checked)}
                          className="h-3.5 w-3.5 rounded accent-[#6B1CD4]"
                        />
                        <span>Same as mobile</span>
                      </label>
                    </div>
                    <input
                      id="sub-whatsapp"
                      type="tel"
                      inputMode="numeric"
                      disabled={sameAsMobile}
                      value={sameAsMobile ? form.mobile : form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      placeholder="10-digit WhatsApp number"
                      aria-invalid={Boolean(errors.whatsapp)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-base text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:bg-white focus:outline-none disabled:opacity-65 sm:text-sm"
                    />
                    {errors.whatsapp && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.whatsapp}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Quick Flat Info + Google/Live GPS Location */}
              <div className="rounded-2xl border border-[#090A14]/8 bg-white p-4 sm:p-5 space-y-4">
                <h3 className="font-display text-sm font-bold text-[#090A14]">
                  2. Flat Details &amp; Google Location
                </h3>

                {/* Fast Tap Chips for Type & Furnishing */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <span className="block text-xs font-semibold text-[#090A14]">
                      Property Type *
                    </span>
                    <div
                      role="group"
                      aria-label="Property type"
                      className="mt-1.5 grid grid-cols-4 gap-1.5"
                    >
                      {PROPERTY_TYPES.map((type) => {
                        const selected = form.propertyType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setForm({ ...form, propertyType: type })}
                            className={`h-11 rounded-xl border text-xs font-bold transition-colors ${
                              selected
                                ? 'border-[#6B1CD4] bg-[#6B1CD4] text-white shadow-2xs'
                                : 'border-[#090A14]/12 bg-[#F9F8FC] text-[#090A14] hover:border-[#6B1CD4]'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                    {errors.propertyType && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.propertyType}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-[#090A14]">Furnishing *</span>
                    <div
                      role="group"
                      aria-label="Furnishing status"
                      className="mt-1.5 grid grid-cols-3 gap-1.5"
                    >
                      {FURNISHING_TYPES.map((status) => {
                        const selected = form.furnishingStatus === status;
                        const shortLabel =
                          status === 'Fully Furnished'
                            ? 'Furnished'
                            : status === 'Semi-Furnished'
                              ? 'Semi'
                              : 'Unfurnished';
                        return (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setForm({ ...form, furnishingStatus: status })}
                            className={`h-11 rounded-xl border px-1 text-xs font-semibold transition-colors ${
                              selected
                                ? 'border-[#6B1CD4] bg-[#6B1CD4] text-white shadow-2xs'
                                : 'border-[#090A14]/12 bg-[#F9F8FC] text-[#090A14] hover:border-[#6B1CD4]'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live GPS + Google Maps Search + Interactive Pin + Manual Location */}
                <LocationPickerField
                  location={form.location}
                  lat={form.lat}
                  lng={form.lng}
                  locationSource={form.locationSource}
                  error={errors.location}
                  onChange={(nextLoc) =>
                    setForm((prev) => ({
                      ...prev,
                      location: nextLoc.location,
                      lat: nextLoc.lat,
                      lng: nextLoc.lng,
                      locationSource: nextLoc.locationSource,
                      societyName:
                        !prev.societyName.trim() && nextLoc.societyHint
                          ? nextLoc.societyHint
                          : prev.societyName,
                    }))
                  }
                />

                {/* Society / Building + Available From */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="sub-society"
                      className="block text-xs font-semibold text-[#090A14]"
                    >
                      Society / Building Name
                    </label>
                    <input
                      id="sub-society"
                      type="text"
                      value={form.societyName}
                      onChange={(e) => setForm({ ...form, societyName: e.target.value })}
                      placeholder="e.g. Arihant Niwara, Kamal Nagar"
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-base text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sub-available-from"
                      className="block text-xs font-semibold text-[#090A14]"
                    >
                      Available From *
                    </label>
                    <input
                      id="sub-available-from"
                      type="date"
                      value={form.availableFrom}
                      onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                      aria-invalid={Boolean(errors.availableFrom)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3 text-base text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                    />
                    {errors.availableFrom && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.availableFrom}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rent / Deposit / Brokerage */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="sub-rent" className="block text-xs font-semibold text-[#090A14]">
                      Monthly Rent (₹) *
                    </label>
                    <input
                      id="sub-rent"
                      type="number"
                      inputMode="numeric"
                      min={1000}
                      step={500}
                      value={form.monthlyRent}
                      onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                      placeholder="e.g. 16000"
                      aria-invalid={Boolean(errors.monthlyRent)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-base text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                    />
                    {errors.monthlyRent && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.monthlyRent}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="sub-deposit"
                      className="block text-xs font-semibold text-[#090A14]"
                    >
                      Deposit (₹) *
                    </label>
                    <input
                      id="sub-deposit"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      value={form.securityDeposit}
                      onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
                      placeholder="e.g. 35000"
                      aria-invalid={Boolean(errors.securityDeposit)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-base text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                    />
                    {errors.securityDeposit && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.securityDeposit}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between gap-1">
                      <label
                        htmlFor="sub-brokerage"
                        className="block text-xs font-semibold text-[#090A14]"
                      >
                        Brokerage (₹)
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, brokerageAmount: '0' })}
                        className="text-[11px] font-semibold text-[#6B1CD4] hover:underline"
                      >
                        Set ₹0
                      </button>
                    </div>
                    <input
                      id="sub-brokerage"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={500}
                      value={form.brokerageAmount}
                      onChange={(e) => setForm({ ...form, brokerageAmount: e.target.value })}
                      placeholder="0 for No Brokerage"
                      aria-invalid={Boolean(errors.brokerageAmount)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-base text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                    />
                    {errors.brokerageAmount && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                        {errors.brokerageAmount}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fast Multi-Photo Upload */}
                <div>
                  <label htmlFor="sub-photos" className="block text-xs font-semibold text-[#090A14]">
                    Flat Photos (Up to 8 · Auto-optimized for fast upload)
                  </label>
                  <div className="mt-1.5 rounded-xl border border-dashed border-[#6B1CD4]/35 bg-[#F9F8FC] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <label
                        htmlFor="sub-photos"
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-[#6B1CD4] shadow-2xs ring-1 ring-[#6B1CD4]/25 transition-colors hover:bg-[#F5EFFD]"
                      >
                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                        <span>Add Photos ({selectedPhotos.length}/8)</span>
                      </label>
                      <input
                        id="sub-photos"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoChange}
                        className="sr-only"
                      />
                      {selectedPhotos.length > 0 && (
                        <button
                          type="button"
                          onClick={clearPhotos}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#656275] hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Clear all</span>
                        </button>
                      )}
                    </div>

                    {errors.photos && (
                      <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                        {errors.photos}
                      </p>
                    )}

                    {selectedPhotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {selectedPhotos.map((item, idx) => (
                          <div
                            key={`${item.previewUrl}`}
                            className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#090A14]/10 bg-white"
                          >
                            <img
                              src={item.previewUrl}
                              alt={`Upload preview ${idx + 1}`}
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              aria-label={`Remove photo ${idx + 1}`}
                              className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#090A14]/75 text-white hover:bg-red-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Auto-Filled Optional Description + Collapsible Extra Specs */}
              <div className="rounded-2xl border border-[#090A14]/8 bg-white p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
                    <label
                      htmlFor="sub-description"
                      className="text-xs font-bold text-[#090A14]"
                    >
                      Property Description{' '}
                      <span className="font-medium text-[#656275]">
                        (Optional · Auto-filled from above)
                      </span>
                    </label>
                  </div>
                  {descriptionEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setDescriptionEdited(false);
                        setForm((prev) => ({ ...prev, description: '' }));
                      }}
                      className="text-[11px] font-semibold text-[#6B1CD4] hover:underline"
                    >
                      Reset to Auto-Fill
                    </button>
                  )}
                </div>

                <textarea
                  id="sub-description"
                  rows={3}
                  value={displayedDescription}
                  onChange={(e) => {
                    setDescriptionEdited(true);
                    setForm({ ...form, description: e.target.value });
                  }}
                  placeholder="Automatically generated from your flat details above — edit only if you want to customize."
                  aria-invalid={Boolean(errors.description)}
                  className="w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] p-3 text-base leading-relaxed text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                />
                {errors.description && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    {errors.description}
                  </p>
                )}

                {/* Collapsible More Specs Accordion (Keeps Mobile Super Fast!) */}
                <div className="border-t border-[#090A14]/8 pt-3">
                  <button
                    type="button"
                    aria-expanded={showMoreSpecs}
                    onClick={() => setShowMoreSpecs((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl bg-[#F9F8FC] px-3.5 py-2.5 text-left text-xs font-semibold text-[#090A14] transition-colors hover:bg-[#F5EFFD] hover:text-[#6B1CD4]"
                  >
                    <span>
                      More Flat Specs &amp; Facilities (Optional: Bathrooms, Floor, Carpet Area)
                    </span>
                    {showMoreSpecs ? (
                      <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                  </button>

                  {showMoreSpecs && (
                    <div className="mt-3.5 space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <div>
                          <label
                            htmlFor="sub-bathrooms"
                            className="block text-xs font-semibold text-[#090A14]"
                          >
                            Bathrooms
                          </label>
                          <input
                            id="sub-bathrooms"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={10}
                            value={form.bathrooms}
                            onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                            className="mt-1.5 h-10 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3 text-base text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                          />
                          {errors.bathrooms && (
                            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                              {errors.bathrooms}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="sub-balconies"
                            className="block text-xs font-semibold text-[#090A14]"
                          >
                            Balconies
                          </label>
                          <input
                            id="sub-balconies"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={10}
                            value={form.balconies}
                            onChange={(e) => setForm({ ...form, balconies: e.target.value })}
                            className="mt-1.5 h-10 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3 text-base text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="sub-floor"
                            className="block text-xs font-semibold text-[#090A14]"
                          >
                            Floor No.
                          </label>
                          <input
                            id="sub-floor"
                            type="text"
                            value={form.floorNumber}
                            onChange={(e) => setForm({ ...form, floorNumber: e.target.value })}
                            placeholder="e.g. 2"
                            className="mt-1.5 h-10 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3 text-base text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="sub-total-floors"
                            className="block text-xs font-semibold text-[#090A14]"
                          >
                            Total Floors
                          </label>
                          <input
                            id="sub-total-floors"
                            type="text"
                            value={form.totalFloors}
                            onChange={(e) => setForm({ ...form, totalFloors: e.target.value })}
                            placeholder="e.g. 5"
                            className="mt-1.5 h-10 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3 text-base text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label
                            htmlFor="sub-carpet"
                            className="block text-xs font-semibold text-[#090A14]"
                          >
                            Carpet Area
                          </label>
                          <input
                            id="sub-carpet"
                            type="text"
                            value={form.carpetArea}
                            onChange={(e) => setForm({ ...form, carpetArea: e.target.value })}
                            placeholder="e.g. 620 Sq. Ft."
                            className="mt-1.5 h-10 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3 text-base text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none sm:text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold text-[#090A14]">
                          Key Facilities
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {FACILITY_CHOICES.map((facility) => {
                            const checked = form.facilities.includes(facility);
                            return (
                              <button
                                key={facility}
                                type="button"
                                onClick={() => toggleFacility(facility)}
                                aria-pressed={checked}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                  checked
                                    ? 'border-[#6B1CD4] bg-[#6B1CD4] text-white'
                                    : 'border-[#090A14]/12 bg-[#F9F8FC] text-[#090A14] hover:border-[#6B1CD4]'
                                }`}
                              >
                                {facility}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Sticky Bottom Action Bar (Always anchored cleanly at bottom on mobile & desktop) */}
        {!successInfo && (
          <div
            className={
              standalone
                ? 'sticky bottom-0 z-30 shrink-0 border-t border-[#090A14]/8 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(9,10,20,0.06)]'
                : 'sticky bottom-0 z-30 shrink-0 border-t border-[#090A14]/8 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(9,10,20,0.06)] sm:static sm:px-6 sm:py-4 sm:shadow-none'
            }
          >
            <div className={standalone ? 'mx-auto w-full max-w-3xl sm:px-2' : ''}>
              {errorCount > 0 && !submitting && (
                <p className="mb-2 text-center text-xs font-semibold text-red-600">
                  Please fill in {errorCount} highlighted {errorCount === 1 ? 'field' : 'fields'} above before submitting.
                </p>
              )}
              <button
                type="submit"
                form="post-property-form"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6B1CD4] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5412AD] disabled:opacity-65"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                    <span className="truncate">{submittingStage}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {ownerOnly
                        ? 'Submit My Flat Free for Approval'
                        : 'Submit Property Free for Approval'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
