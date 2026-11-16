import React, { useEffect, useState } from 'react';
import { CheckCircle2, ImagePlus, Send, Trash2, X } from 'lucide-react';
import {
  FurnishingStatus,
  PropertySubmissionInput,
  PropertyType,
  SubmissionValidationErrors,
} from '../types/property';
import {
  buildPropertySubmissionWhatsAppUrl,
  validateSubmissionForm,
} from '../utils/propertyLogic';
import { WhatsAppIcon } from './WhatsAppButton';

interface PostPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FACILITY_CHOICES = [
  '24 Hours Water',
  'Electricity',
  'Two-Wheeler Parking',
  'Car Parking',
  'Lift',
  'Modular Kitchen',
  'Balcony',
];

const INITIAL_FORM_STATE: PropertySubmissionInput = {
  name: '',
  mobile: '',
  submitterRole: 'Owner',
  propertyType: '',
  location: '',
  monthlyRent: '',
  securityDeposit: '',
  brokerageDetails: '',
  furnishingStatus: 'Unfurnished',
  description: '',
  facilities: ['24 Hours Water', 'Electricity'],
  photoNames: [],
};

export const PostPropertyModal: React.FC<PostPropertyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [form, setForm] = useState<PropertySubmissionInput>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<SubmissionValidationErrors>({});
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files).map((file) => file.name);
    setForm((prev) => ({
      ...prev,
      photoNames: names,
    }));
  };

  const clearPhotos = () => {
    setForm((prev) => ({ ...prev, photoNames: [] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateSubmissionForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setSubmittedWhatsAppUrl(null);
      return;
    }

    const waUrl = buildPropertySubmissionWhatsAppUrl(form);
    setSubmittedWhatsAppUrl(waUrl);
  };

  const handleResetSubmission = () => {
    setForm(INITIAL_FORM_STATE);
    setErrors({});
    setSubmittedWhatsAppUrl(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-property-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-3 sm:p-6 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#090A14]/8 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold text-[#6B1CD4]">Owners &amp; Local Brokers</p>
            <h2
              id="post-property-modal-title"
              className="font-display text-lg font-bold text-[#090A14] sm:text-xl"
            >
              Post Flat for Rent
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close post flat modal"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 text-[#090A14] transition-colors hover:bg-[#F9F8FC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto bg-[#F9F8FC] p-5 sm:p-6">
          {submittedWhatsAppUrl ? (
            <div
              data-testid="submission-confirmation"
              role="status"
              className="rounded-xl border border-[#6B1CD4]/25 bg-white p-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-6 w-6 shrink-0 text-[#6B1CD4]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-display text-lg font-bold text-[#090A14]">
                    Property Details Ready to Send on WhatsApp
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#6E6B7B]">
                    Thank you, <span className="font-semibold text-[#090A14]">{form.name}</span>.
                    Your listing details have been formatted for WhatsApp. The{' '}
                    <span className="font-semibold text-[#090A14]">WithBroker team</span> will review
                    your submission before publishing it on the website.
                  </p>
                  {form.photoNames.length > 0 && (
                    <p className="mt-2 rounded-lg bg-[#F7F5FC] px-3 py-2 text-xs text-[#090A14]">
                      Selected photos ({form.photoNames.length}): {form.photoNames.join(', ')}.
                      Remember to attach these photos manually after opening WhatsApp.
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <a
                      href={submittedWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#6B1CD4] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5412AD]"
                    >
                      <WhatsAppIcon className="h-4 w-4 text-white" />
                      <span>Send on WhatsApp Now</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleResetSubmission}
                      className="rounded-xl border border-[#090A14]/15 bg-white px-4 py-3 text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                    >
                      Submit Another Property
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <p className="rounded-xl border border-[#C89B45]/40 bg-[#FFFDF8] px-3.5 py-2.5 text-xs text-[#090A14]">
                Share your flat details below. Our Pune team reviews submissions on WhatsApp before
                publishing on WithBroker.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sub-name" className="block text-xs font-semibold text-[#090A14]">
                    Your Name *
                  </label>
                  <input
                    id="sub-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Amit Deshmukh"
                    aria-invalid={Boolean(errors.name)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3.5 text-sm text-[#090A14] placeholder:text-[#6E6B7B]/70 focus:border-[#6B1CD4] focus:outline-none"
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
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="e.g. 9823012345"
                    aria-invalid={Boolean(errors.mobile)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3.5 text-sm text-[#090A14] tabular-nums placeholder:text-[#6E6B7B]/70 focus:border-[#6B1CD4] focus:outline-none"
                  />
                  {errors.mobile && (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                      {errors.mobile}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <span className="block text-xs font-semibold text-[#090A14]">You are *</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl border border-[#090A14]/12 bg-white p-1">
                    {(['Owner', 'Broker'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        aria-pressed={form.submitterRole === role}
                        onClick={() => setForm({ ...form, submitterRole: role })}
                        className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                          form.submitterRole === role
                            ? 'bg-[#6B1CD4] text-white'
                            : 'text-[#6E6B7B] hover:text-[#090A14]'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="sub-type" className="block text-xs font-semibold text-[#090A14]">
                    Property Type *
                  </label>
                  <select
                    id="sub-type"
                    value={form.propertyType}
                    onChange={(e) =>
                      setForm({ ...form, propertyType: e.target.value as PropertyType | '' })
                    }
                    aria-invalid={Boolean(errors.propertyType)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3 text-sm text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
                  >
                    <option value="">Select Type</option>
                    <option value="1RK">1RK</option>
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                  </select>
                  {errors.propertyType && (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                      {errors.propertyType}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sub-furnishing"
                    className="block text-xs font-semibold text-[#090A14]"
                  >
                    Furnishing Status
                  </label>
                  <select
                    id="sub-furnishing"
                    value={form.furnishingStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        furnishingStatus: e.target.value as FurnishingStatus,
                      })
                    }
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3 text-sm text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
                  >
                    <option value="Unfurnished">Unfurnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Fully Furnished">Fully Furnished</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="sub-location" className="block text-xs font-semibold text-[#090A14]">
                  Location (Locality in Pune) *
                </label>
                <input
                  id="sub-location"
                  type="text"
                  list="pune-locality-suggestions"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Somnath Nagar, Wadgaon Sheri"
                  aria-invalid={Boolean(errors.location)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3.5 text-sm text-[#090A14] placeholder:text-[#6E6B7B]/70 focus:border-[#6B1CD4] focus:outline-none"
                />
                <datalist id="pune-locality-suggestions">
                  <option value="Viman Nagar" />
                  <option value="Wadgaon Sheri" />
                  <option value="Somnath Nagar, Wadgaon Sheri" />
                  <option value="Chandan Nagar" />
                  <option value="Kharadi Bypass" />
                </datalist>
                {errors.location && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                    {errors.location}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="sub-rent" className="block text-xs font-semibold text-[#090A14]">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    id="sub-rent"
                    type="number"
                    min={1000}
                    step={500}
                    value={form.monthlyRent}
                    onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                    placeholder="e.g. 12000"
                    aria-invalid={Boolean(errors.monthlyRent)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3.5 text-sm text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:outline-none"
                  />
                  {errors.monthlyRent && (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                      {errors.monthlyRent}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="sub-deposit" className="block text-xs font-semibold text-[#090A14]">
                    Security Deposit (₹) *
                  </label>
                  <input
                    id="sub-deposit"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.securityDeposit}
                    onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
                    placeholder="e.g. 20000"
                    aria-invalid={Boolean(errors.securityDeposit)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3.5 text-sm text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:outline-none"
                  />
                  {errors.securityDeposit && (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                      {errors.securityDeposit}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sub-brokerage"
                    className="block text-xs font-semibold text-[#090A14]"
                  >
                    Brokerage Details
                  </label>
                  <input
                    id="sub-brokerage"
                    type="text"
                    value={form.brokerageDetails}
                    onChange={(e) => setForm({ ...form, brokerageDetails: e.target.value })}
                    placeholder="e.g. ₹12,000 or No Brokerage"
                    className="mt-1.5 h-11 w-full rounded-xl border border-[#090A14]/12 bg-white px-3.5 text-sm text-[#090A14] placeholder:text-[#6E6B7B]/70 focus:border-[#6B1CD4] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#090A14]">
                  Additional Facilities
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FACILITY_CHOICES.map((facility) => {
                    const checked = form.facilities.includes(facility);
                    return (
                      <button
                        key={facility}
                        type="button"
                        onClick={() => toggleFacility(facility)}
                        aria-pressed={checked}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          checked
                            ? 'border-[#6B1CD4] bg-[#6B1CD4] text-white'
                            : 'border-[#090A14]/12 bg-white text-[#090A14] hover:border-[#6B1CD4]'
                        }`}
                      >
                        {facility}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="sub-description"
                  className="block text-xs font-semibold text-[#090A14]"
                >
                  Property Description
                </label>
                <textarea
                  id="sub-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mention floor, bathroom type, bachelor/family preference, nearby landmark..."
                  className="mt-1.5 w-full rounded-xl border border-[#090A14]/12 bg-white p-3.5 text-sm text-[#090A14] placeholder:text-[#6E6B7B]/70 focus:border-[#6B1CD4] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="sub-photos" className="block text-xs font-semibold text-[#090A14]">
                  Property Photos (Multiple Images)
                </label>
                <div className="mt-1.5 rounded-xl border border-dashed border-[#090A14]/20 bg-white p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label
                      htmlFor="sub-photos"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#F7F5FC] px-3.5 py-2 text-xs font-semibold text-[#090A14] transition-colors hover:bg-[#6B1CD4]/10 hover:text-[#6B1CD4]"
                    >
                      <ImagePlus className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
                      <span>Select Flat Photos</span>
                    </label>
                    <input
                      id="sub-photos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                    {form.photoNames.length > 0 && (
                      <button
                        type="button"
                        onClick={clearPhotos}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#6E6B7B] hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Clear ({form.photoNames.length})</span>
                      </button>
                    )}
                  </div>
                  {form.photoNames.length > 0 && (
                    <p className="mt-2 text-xs font-medium text-[#090A14]">
                      Selected: {form.photoNames.join(', ')}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-[#6E6B7B]">
                    Please attach your selected photos manually in the WhatsApp chat once it opens.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6B1CD4] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#5412AD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Submit Property on WhatsApp</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
