import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  Flame,
  Loader2,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitRoommateListing, updateMyRoommateListing } from '../lib/roommateRepo';
import {
  PreferredGender,
  PreferredOccupation,
  ROOMMATE_FACILITY_OPTIONS,
  ROOMMATE_PUNE_LOCATIONS,
  ROOMMATE_ROOM_TYPES,
  RoommateFlatOccupancy,
  RoommateFurnishing,
  RoommateListingRecord,
  RoommateRoomType,
  RoommateSubmissionInput,
  RoommateValidationErrors,
} from '../types/roommate';
import {
  buildRoommateShareText,
  generateAutoRoommateDescription,
  validateRoommateSubmission,
} from '../utils/roommateLogic';
import { SafeImage } from './SafeImage';

interface PostRoommateModalProps {
  isOpen: boolean;
  initialFlatOccupancy?: RoommateFlatOccupancy | null;
  initialPreferredGender?: PreferredGender | null;
  editingListing?: RoommateListingRecord | null;
  existingUserListings?: RoommateListingRecord[];
  onSwitchToPropertyForm?: () => void;
  onClose: () => void;
  onSuccess?: () => void;
}

const ELECTRICITY_PRESETS = [
  'Shared separately',
  'Included in rent',
  'As per actual meter',
];

const FIELD_CLASS =
  'mt-1.5 h-11 w-full rounded-xl border border-transparent bg-[#F4F4F7] px-3.5 text-sm text-[#090A14] placeholder:text-[#8A8C9B] transition-colors hover:bg-[#EEEEF3] focus:border-[#6B1CD4] focus:bg-white focus:outline-none';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createInitialForm(
  initialFlatOccupancy: RoommateFlatOccupancy,
  initialPreferredGender: PreferredGender,
  editing?: RoommateListingRecord | null,
  defaultName?: string | null
): RoommateSubmissionInput {
  if (editing) {
    return {
      listingType: 'have_room',
      flatOccupancy: editing.flatOccupancy || 'Pre-Occupied Flat',
      electricityBill: editing.electricityBill || 'Shared separately',
      facilities: editing.facilities || [],
      urgent: Boolean(editing.urgent),
      shiftingNow: Boolean(editing.shiftingNow),
      name: editing.name,
      contactNumber: editing.contactNumber,
      whatsappNumber: editing.whatsappNumber,
      secondaryContact: editing.secondaryContact || '',
      gender: editing.gender,
      age: editing.age ? String(editing.age) : '',
      occupation: editing.occupation,
      roomType: editing.roomType,
      location: editing.location,
      buildingName: editing.buildingName ?? '',
      showExactAddress: editing.showExactAddress,
      showPublicContact: editing.showPublicContact,
      rent: String(editing.rent),
      deposit: String(editing.deposit),
      brokerage: String(editing.brokerage),
      furnishing: editing.furnishing,
      availableFrom: editing.availableFrom || getTodayDateString(),
      existingRoommates: String(editing.existingRoommates),
      peopleRequired: String(editing.peopleRequired),
      preferredGender: editing.preferredGender,
      preferredOccupation: editing.preferredOccupation,
      preferredAgeRange: editing.preferredAgeRange ?? '',
      foodPreference: editing.foodPreference ?? '',
      smokingPreference: editing.smokingPreference ?? '',
      description: editing.description,
    };
  }

  return {
    listingType: 'have_room',
    flatOccupancy: initialFlatOccupancy,
    electricityBill: 'Shared separately',
    facilities: [
      'Parking Available',
      'Peaceful Society Surroundings',
      'Comfortable Living Environment',
    ],
    urgent: true,
    shiftingNow: true,
    name: defaultName || '',
    contactNumber: '',
    whatsappNumber: '',
    secondaryContact: '',
    gender:
      initialPreferredGender === 'Male' || initialPreferredGender === 'Female'
        ? initialPreferredGender
        : 'Prefer not to say',
    age: '',
    occupation: 'Working Professional',
    roomType: '1BHK',
    location: 'Karve Nagar',
    buildingName: '',
    showExactAddress: true,
    showPublicContact: false,
    rent: '',
    deposit: '',
    brokerage: '0',
    furnishing: 'Semi-Furnished',
    availableFrom: getTodayDateString(),
    existingRoommates: '1',
    peopleRequired: '1',
    preferredGender: initialPreferredGender,
    preferredOccupation: 'Any',
    preferredAgeRange: '',
    foodPreference: '',
    smokingPreference: '',
    description: '',
  };
}

export const PostRoommateModal: React.FC<PostRoommateModalProps> = ({
  isOpen,
  initialFlatOccupancy = null,
  initialPreferredGender = null,
  editingListing = null,
  existingUserListings = [],
  onSwitchToPropertyForm,
  onClose,
  onSuccess,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const isEditing = Boolean(editingListing);

  const [form, setForm] = useState<RoommateSubmissionInput>(() =>
    createInitialForm(
      initialFlatOccupancy || 'Pre-Occupied Flat',
      initialPreferredGender || 'Male',
      editingListing,
      user?.displayName
    )
  );
  const [customLocationMode, setCustomLocationMode] = useState(false);
  const [customFacilityText, setCustomFacilityText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<RoommateValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const occ = initialFlatOccupancy || editingListing?.flatOccupancy || 'Pre-Occupied Flat';
    const prefGender =
      initialPreferredGender || editingListing?.preferredGender || 'Male';
    const nextForm = createInitialForm(occ, prefGender, editingListing, user?.displayName);
    setForm(nextForm);
    setCustomLocationMode(
      Boolean(nextForm.location && !ROOMMATE_PUNE_LOCATIONS.includes(nextForm.location))
    );
    setKeptImages(editingListing?.images ?? []);
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setErrors({});
    setServerError(null);
    setSubmittedCode(null);
    setShowPreview(false);
  }, [isOpen, initialFlatOccupancy, initialPreferredGender, editingListing, user?.displayName]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  const livePreviewText = useMemo(() => {
    return buildRoommateShareText({
      listingCode: editingListing?.listingCode || 'WB-RM-NEW',
      listingType: 'have_room',
      flatOccupancy: form.flatOccupancy || 'Pre-Occupied Flat',
      roomType: form.roomType,
      location: form.location || 'Pune',
      publicBuildingName: form.showExactAddress ? form.buildingName || null : null,
      rent: Number(form.rent) || 0,
      deposit: Number(form.deposit) || 0,
      electricityBill: form.electricityBill || null,
      facilities: form.facilities || [],
      urgent: Boolean(form.urgent),
      shiftingNow: Boolean(form.shiftingNow),
      preferredGender: form.preferredGender,
      furnishing: form.furnishing,
      peopleRequired: Math.max(1, Number(form.peopleRequired) || 1),
      availableFrom: form.availableFrom,
      showPublicContact: form.showPublicContact,
      publicWhatsappNumber: form.showPublicContact ? form.contactNumber || null : null,
      publicSecondaryContact: form.showPublicContact ? form.secondaryContact || null : null,
    });
  }, [form, editingListing?.listingCode]);

  if (!isOpen) return null;

  const setField = <K extends keyof RoommateSubmissionInput>(
    key: K,
    value: RoommateSubmissionInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key as keyof RoommateValidationErrors];
        return copy;
      });
    }
  };

  const toggleFacility = (facility: string) => {
    setForm((prev) => {
      const current = prev.facilities || [];
      if (current.includes(facility)) {
        return { ...prev, facilities: current.filter((item) => item !== facility) };
      }
      if (current.length >= 15) return prev;
      return { ...prev, facilities: [...current, facility] };
    });
  };

  const addCustomFacility = () => {
    const clean = customFacilityText.trim().slice(0, 60);
    if (!clean) return;
    setForm((prev) => {
      const current = prev.facilities || [];
      if (current.includes(clean) || current.length >= 15) return prev;
      return { ...prev, facilities: [...current, clean] };
    });
    setCustomFacilityText('');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const maxRemaining = Math.max(0, 6 - keptImages.length - photoFiles.length);
    const picked = files.slice(0, maxRemaining);
    const urls = picked.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...picked]);
    setPhotoPreviews((prev) => [...prev, ...urls]);
    e.target.value = '';
  };

  const removeNewPhoto = (index: number) => {
    setPhotoPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target);
      return prev.filter((_, i) => i !== index);
    });
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const payloadToValidate: RoommateSubmissionInput = {
      ...form,
      listingType: 'have_room',
      whatsappNumber: form.whatsappNumber.trim() || form.contactNumber.trim(),
      gender:
        form.preferredGender === 'Male' || form.preferredGender === 'Female'
          ? form.preferredGender
          : 'Prefer not to say',
      description:
        form.description.trim().length >= 10
          ? form.description.trim()
          : generateAutoRoommateDescription(form),
    };

    const validationErrors = validateRoommateSubmission(payloadToValidate);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setServerError('Please check the highlighted fields before posting.');
      return;
    }

    setSubmitting(true);
    setProgressText(isEditing ? 'Saving changes...' : 'Submitting roommate vacancy...');

    try {
      if (isEditing && editingListing) {
        if (!user) {
          throw new Error('Please sign in with Google to edit your listing.');
        }
        await updateMyRoommateListing(
          editingListing,
          payloadToValidate,
          keptImages,
          photoFiles,
          user.uid,
          setProgressText
        );
        setSubmittedCode(editingListing.listingCode);
        onSuccess?.();
      } else {
        const res = await submitRoommateListing(
          payloadToValidate,
          photoFiles,
          user?.uid ?? null,
          existingUserListings,
          setProgressText
        );
        setSubmittedCode(res.listingCode);
        onSuccess?.();
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Unable to submit roommate vacancy. Please try again.'
      );
    } finally {
      setSubmitting(false);
      setProgressText('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-roommate-title"
      data-testid="post-roommate-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#090A14]/55 p-0 backdrop-blur-xs sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Sheet Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#090A14]/8 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="post-roommate-title"
              className="font-display text-lg font-bold tracking-[-0.015em] text-[#090A14] sm:text-xl"
            >
              {isEditing
                ? `Edit Vacancy · ${editingListing?.listingCode}`
                : 'Post a Roommate Vacancy'}
            </h2>
            <p className="mt-0.5 text-xs text-[#5C5E6B]">
              For people with an available flat or room who need a flatmate
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close roommate form"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#5C5E6B] transition-colors hover:bg-[#F4F4F7] hover:text-[#090A14]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Single-Sheet Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {submittedCode ? (
            <div data-testid="roommate-submit-success" className="py-6 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-[#090A14]">
                {isEditing ? 'Vacancy Updated' : 'Roommate Vacancy Submitted'}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[#6B1CD4] tabular-nums">
                Listing ID: {submittedCode}
              </p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#5C5E6B] sm:text-sm">
                {isEditing
                  ? 'Your changes have been saved successfully.'
                  : 'Your vacancy is in our quick verification queue. Once approved, it publishes automatically in the Roommates section.'}
              </p>

              <div className="mx-auto mt-5 max-w-md rounded-xl border border-[#090A14]/10 bg-[#FAFAFC] p-4 text-left">
                <p className="text-[11px] font-semibold text-[#5C5E6B]">
                  Formatted Post Summary
                </p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#090A14]">
                  {livePreviewText.replace('WB-RM-NEW', submittedCode)}
                </pre>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#090A14] px-6 text-sm font-semibold text-white hover:bg-[#6B1CD4]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form id="post-roommate-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Top Mode Switcher: Full Flat vs Roommate Needed */}
              {!isEditing && onSwitchToPropertyForm && (
                <div
                  role="tablist"
                  aria-label="Choose listing type"
                  className="grid grid-cols-2 gap-1 rounded-xl bg-[#EFEFF4] p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={false}
                    onClick={onSwitchToPropertyForm}
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[#5C5E6B] transition-colors hover:text-[#090A14]"
                  >
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Full Flat for Rent</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={true}
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-[#090A14] shadow-2xs"
                  >
                    <Users className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
                    <span>Roommate Needed</span>
                  </button>
                </div>
              )}

              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Quick Occupancy & Gender Selection right at top */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-7">
                    <span className="block text-xs font-semibold text-[#090A14]">
                      Flat Category *
                    </span>
                    <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-[#EFEFF4] p-1">
                      {(['Pre-Occupied Flat', 'New Flat'] as RoommateFlatOccupancy[]).map(
                        (occ) => {
                          const active = (form.flatOccupancy || 'Pre-Occupied Flat') === occ;
                          return (
                            <button
                              key={occ}
                              type="button"
                              data-testid={`occupancy-${occ === 'New Flat' ? 'new' : 'preoccupied'}`}
                              onClick={() => setField('flatOccupancy', occ)}
                              className={`min-h-[38px] whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition-all ${
                                active
                                  ? 'bg-white text-[#090A14] shadow-2xs'
                                  : 'text-[#5C5E6B] hover:text-[#090A14]'
                              }`}
                            >
                              {occ}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-5">
                    <span className="block text-xs font-semibold text-[#090A14]">
                      Roommate For *
                    </span>
                    <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-[#EFEFF4] p-1">
                      {(['Male', 'Female', 'Any'] as PreferredGender[]).map((g) => {
                        const active = form.preferredGender === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            data-testid={`gender-${g.toLowerCase()}`}
                            onClick={() => setField('preferredGender', g)}
                            className={`min-h-[38px] rounded-lg px-2 text-xs font-semibold transition-all ${
                              active
                                ? 'bg-white text-[#090A14] shadow-2xs'
                                : 'text-[#5C5E6B] hover:text-[#090A14]'
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Clean Status Checkboxes */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setField('urgent', !form.urgent)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      form.urgent
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-[#090A14]/12 bg-white text-[#5C5E6B] hover:text-[#090A14]'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Urgently Required</span>
                    {form.urgent && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setField('shiftingNow', !form.shiftingNow)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      form.shiftingNow
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-[#090A14]/12 bg-white text-[#5C5E6B] hover:text-[#090A14]'
                    }`}
                  >
                    <span>Available for Shifting Now</span>
                    {form.shiftingNow && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Section: Flat & Location */}
              <div className="space-y-4 border-t border-[#090A14]/8 pt-6">
                <h3 className="font-display text-sm font-bold text-[#090A14]">
                  Flat &amp; Location
                </h3>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <span className="block text-xs font-medium text-[#5C5E6B]">
                      Roommates Needed *
                    </span>
                    <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-[#EFEFF4] p-1">
                      {['1', '2', '3', '4'].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setField('peopleRequired', num)}
                          className={`h-9 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                            form.peopleRequired === num
                              ? 'bg-white text-[#090A14] shadow-2xs'
                              : 'text-[#5C5E6B] hover:text-[#090A14]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="rm-roomType"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Flat / Room Type *
                    </label>
                    <select
                      id="rm-roomType"
                      value={form.roomType}
                      onChange={(e) => setField('roomType', e.target.value as RoommateRoomType)}
                      className={FIELD_CLASS}
                    >
                      {ROOMMATE_ROOM_TYPES.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rm-furnishing"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Furnishing *
                    </label>
                    <select
                      id="rm-furnishing"
                      value={form.furnishing}
                      onChange={(e) =>
                        setField('furnishing', e.target.value as RoommateFurnishing)
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="Semi-Furnished">Semi-Furnished</option>
                      <option value="Furnished">Furnished</option>
                      <option value="Unfurnished">Unfurnished</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="rm-location"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Pune Area / Locality *
                    </label>
                    {!customLocationMode ? (
                      <select
                        id="rm-location"
                        value={
                          ROOMMATE_PUNE_LOCATIONS.includes(form.location)
                            ? form.location
                            : '__custom__'
                        }
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setCustomLocationMode(true);
                            setField('location', '');
                          } else {
                            setField('location', e.target.value);
                          }
                        }}
                        className={FIELD_CLASS}
                      >
                        {ROOMMATE_PUNE_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                        <option value="__custom__">Other Pune Area...</option>
                      </select>
                    ) : (
                      <div className="mt-1.5 flex gap-2">
                        <input
                          id="rm-location"
                          type="text"
                          value={form.location}
                          onChange={(e) => setField('location', e.target.value)}
                          placeholder="e.g. Karve Nagar, Pune"
                          className="h-11 flex-1 rounded-xl border border-transparent bg-[#F4F4F7] px-3.5 text-sm text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCustomLocationMode(false);
                            setField('location', 'Karve Nagar');
                          }}
                          className="h-11 rounded-xl border border-[#090A14]/12 px-3 text-xs font-semibold text-[#5C5E6B] hover:text-[#090A14]"
                        >
                          List
                        </button>
                      </div>
                    )}
                    {errors.location && (
                      <p className="mt-1 text-xs font-medium text-red-600">{errors.location}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="rm-building"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Lane / Road / Society Address
                    </label>
                    <input
                      id="rm-building"
                      type="text"
                      value={form.buildingName}
                      onChange={(e) => setField('buildingName', e.target.value)}
                      placeholder="e.g. Lane No. 8, Canal Road"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Rent & Move-In */}
              <div className="space-y-4 border-t border-[#090A14]/8 pt-6">
                <h3 className="font-display text-sm font-bold text-[#090A14]">
                  Rent &amp; Deposit Per Person
                </h3>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label htmlFor="rm-rent" className="block text-xs font-medium text-[#5C5E6B]">
                      Monthly Rent (₹) *
                    </label>
                    <input
                      id="rm-rent"
                      type="number"
                      min={500}
                      max={250000}
                      value={form.rent}
                      onChange={(e) => setField('rent', e.target.value)}
                      placeholder="e.g. 2900"
                      className={`${FIELD_CLASS} tabular-nums`}
                    />
                    {errors.rent && (
                      <p className="mt-1 text-xs font-medium text-red-600">{errors.rent}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="rm-deposit"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Deposit Per Person (₹)
                    </label>
                    <input
                      id="rm-deposit"
                      type="number"
                      min={0}
                      max={2000000}
                      value={form.deposit}
                      onChange={(e) => setField('deposit', e.target.value)}
                      placeholder="e.g. 7200"
                      className={`${FIELD_CLASS} tabular-nums`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rm-availableFrom"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Joining Date *
                    </label>
                    <input
                      id="rm-availableFrom"
                      type="date"
                      value={form.availableFrom}
                      onChange={(e) => setField('availableFrom', e.target.value)}
                      className={FIELD_CLASS}
                    />
                    {errors.availableFrom && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {errors.availableFrom}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="rm-electricity"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Electricity Bill
                    </label>
                    <input
                      id="rm-electricity"
                      type="text"
                      value={form.electricityBill || ''}
                      onChange={(e) => setField('electricityBill', e.target.value)}
                      placeholder="e.g. Shared separately"
                      className={FIELD_CLASS}
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ELECTRICITY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setField('electricityBill', preset)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            form.electricityBill === preset
                              ? 'bg-[#090A14] text-white'
                              : 'bg-[#F4F4F7] text-[#5C5E6B] hover:text-[#090A14]'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="rm-prefOcc"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Preferred Flatmate (Optional)
                    </label>
                    <select
                      id="rm-prefOcc"
                      value={form.preferredOccupation}
                      onChange={(e) =>
                        setField('preferredOccupation', e.target.value as PreferredOccupation)
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="Any">Working Professional / Student (Any)</option>
                      <option value="Working Professional">Working Professional</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Facilities */}
              <div className="space-y-3.5 border-t border-[#090A14]/8 pt-6">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-[#090A14]">Facilities</h3>
                  <span className="text-[11px] text-[#5C5E6B]">Tap to select</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ROOMMATE_FACILITY_OPTIONS.map((fac) => {
                    const selected = (form.facilities || []).includes(fac);
                    return (
                      <button
                        key={fac}
                        type="button"
                        onClick={() => toggleFacility(fac)}
                        className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-[#090A14] bg-[#090A14] text-white'
                            : 'border-[#090A14]/12 bg-white text-[#4B4D5A] hover:border-[#090A14]/30'
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{fac}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFacilityText}
                    onChange={(e) => setCustomFacilityText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomFacility();
                      }
                    }}
                    placeholder="Add custom facility (e.g. Near Bus Stop, Maid Available)..."
                    className="h-10 flex-1 rounded-xl border border-transparent bg-[#F4F4F7] px-3.5 text-xs text-[#090A14] placeholder:text-[#8A8C9B] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomFacility}
                    className="h-10 rounded-xl border border-[#090A14]/14 bg-white px-3.5 text-xs font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Section: Contact & Photos */}
              <div className="space-y-4 border-t border-[#090A14]/8 pt-6">
                <h3 className="font-display text-sm font-bold text-[#090A14]">
                  Contact &amp; Photos
                </h3>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="rm-mobile"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      Mobile / WhatsApp *
                    </label>
                    <input
                      id="rm-mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.contactNumber}
                      onChange={(e) =>
                        setField('contactNumber', e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      placeholder="e.g. 8262037529"
                      className={`${FIELD_CLASS} tabular-nums`}
                    />
                    {errors.contactNumber && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {errors.contactNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="rm-secondary"
                      className="block text-xs font-medium text-[#5C5E6B]"
                    >
                      2nd Number (Optional)
                    </label>
                    <input
                      id="rm-secondary"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.secondaryContact || ''}
                      onChange={(e) =>
                        setField(
                          'secondaryContact',
                          e.target.value.replace(/\D/g, '').slice(0, 10)
                        )
                      }
                      placeholder="e.g. 8767679125"
                      className={`${FIELD_CLASS} tabular-nums`}
                    />
                    {errors.secondaryContact && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {errors.secondaryContact}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="rm-name" className="block text-xs font-medium text-[#5C5E6B]">
                      Your Name (Optional)
                    </label>
                    <input
                      id="rm-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="e.g. Rohan"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                {/* Room Photos Upload */}
                <div>
                  <span className="block text-xs font-medium text-[#5C5E6B]">
                    Flat / Room Photos (Optional · up to 6)
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5">
                    {keptImages.map((img, idx) => (
                      <div
                        key={`kept-${idx}`}
                        className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#090A14]/12"
                      >
                        <SafeImage src={img} alt="Room photo" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setKeptImages((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="Remove existing photo"
                          className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {photoPreviews.map((url, idx) => (
                      <div
                        key={`new-${idx}`}
                        className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#090A14]/12"
                      >
                        <img src={url} alt="Selected room" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewPhoto(idx)}
                          aria-label="Remove selected photo"
                          className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-white"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {keptImages.length + photoFiles.length < 6 && (
                      <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#090A14]/20 bg-[#FAFAFC] px-4 text-[11px] font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]">
                        <Camera className="h-4 w-4" aria-hidden="true" />
                        <span className="mt-0.5">Add Photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Extra Notes + Live Telegram Post Preview */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="rm-desc" className="block text-xs font-medium text-[#5C5E6B]">
                      Additional Notes (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPreview((p) => !p)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B1CD4] hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{showPreview ? 'Hide Preview' : 'Preview Telegram Post'}</span>
                    </button>
                  </div>
                  <textarea
                    id="rm-desc"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Leave blank to auto-generate, or add preferences (e.g. non-smoker, veg only)..."
                    className="mt-1.5 w-full rounded-xl border border-transparent bg-[#F4F4F7] px-3.5 py-2.5 text-sm text-[#090A14] placeholder:text-[#8A8C9B] transition-colors hover:bg-[#EEEEF3] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
                  />
                </div>

                {showPreview && (
                  <div className="rounded-xl border border-[#090A14]/10 bg-[#FAFAFC] p-4">
                    <p className="text-[11px] font-semibold text-[#5C5E6B]">
                      Live Telegram / WhatsApp Post Preview
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#090A14]">
                      {livePreviewText}
                    </pre>
                  </div>
                )}

                {/* Privacy Toggles */}
                <div className="space-y-2.5 rounded-xl bg-[#FAFAFC] p-3.5 text-xs text-[#4B4D5A]">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={form.showExactAddress}
                      onChange={(e) => setField('showExactAddress', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#6B1CD4]"
                    />
                    <span>Show lane / road / society address on the public listing</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={form.showPublicContact}
                      onChange={(e) => setField('showPublicContact', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded accent-[#6B1CD4]"
                    />
                    <span>
                      Show my mobile number(s) publicly like Telegram posts (unchecked = inquiries
                      routed safely via WithBroker WhatsApp)
                    </span>
                  </label>
                </div>

                {!user && !isEditing && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5E6B]">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
                      <span>No login required to post. Sign in only if you want to edit later.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void signInWithGoogle()}
                      className="font-semibold text-[#6B1CD4] hover:underline"
                    >
                      Sign in with Google
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Sticky Bottom Action Bar */}
        {!submittedCode && (
          <div className="flex flex-col-reverse gap-2.5 border-t border-[#090A14]/8 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <p className="text-[11px] text-[#5C5E6B]">
              Verified quickly · Active 30 days
            </p>
            <div className="flex shrink-0 items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-[#090A14]/14 px-4 text-sm font-semibold text-[#090A14] transition-colors hover:bg-[#F4F4F7]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="post-roommate-form"
                data-testid="submit-roommate-btn"
                disabled={submitting}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#6B1CD4] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5412AD] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{progressText || 'Posting...'}</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Save Changes' : 'Post Roommate Vacancy'}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
