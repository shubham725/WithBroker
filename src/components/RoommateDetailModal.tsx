import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flag,
  Flame,
  MapPin,
  Phone,
  Rocket,
  Share2,
  ShieldCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitRoommateReport } from '../lib/roommateRepo';
import type { PublicRoommateListing } from '../types/roommate';
import { formatINR } from '../utils/propertyLogic';
import {
  buildDirectRoommateWhatsAppUrl,
  buildRoommateShareText,
  buildRoommateShareWhatsAppUrl,
  buildRoommateWhatsAppUrl,
  formatRoommateDate,
} from '../utils/roommateLogic';
import { SafeImage } from './SafeImage';
import { WhatsAppIcon } from './WhatsAppButton';

interface RoommateDetailModalProps {
  listing: PublicRoommateListing | null;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Fake or misleading vacancy',
  'Room already filled / unavailable',
  'Spam or broker posing as flatmate',
  'Inappropriate content or safety concern',
  'Other',
];

export const RoommateDetailModal: React.FC<RoommateDetailModalProps> = ({
  listing,
  onClose,
}) => {
  const { user } = useAuth();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    setPhotoIdx(0);
    setCopied(false);
    setReportOpen(false);
    setReportDone(false);
    setReportDetails('');
    setReportError(null);
  }, [listing?.listingCode]);

  useEffect(() => {
    if (!listing || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [listing, onClose]);

  if (!listing) return null;

  const images = listing.images || [];
  const occupancy = listing.flatOccupancy || 'Pre-Occupied Flat';
  const fullLoc = [listing.publicBuildingName, listing.location]
    .filter(Boolean)
    .join(', ');
  const genderLabel =
    listing.preferredGender === 'Any' ? 'Roommate' : `${listing.preferredGender} Roommate`;
  const headline = `${listing.peopleRequired} ${genderLabel}${listing.peopleRequired > 1 ? 's' : ''} Required · ${listing.roomType}`;

  const withBrokerWaUrl = buildRoommateWhatsAppUrl(listing);
  const directWaUrl = buildDirectRoommateWhatsAppUrl(listing);
  const shareWaUrl = buildRoommateShareWhatsAppUrl(listing);

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(buildRoommateShareText(listing));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportBusy(true);
    setReportError(null);
    try {
      await submitRoommateReport(
        listing.listingCode,
        reportReason,
        reportDetails,
        user?.uid ?? null
      );
      setReportDone(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roommate-detail-title"
      data-testid="roommate-detail-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#090A14]/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#090A14]/8 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold text-white ${
                  occupancy === 'New Flat' ? 'bg-emerald-600' : 'bg-[#6B1CD4]'
                }`}
              >
                {occupancy}
              </span>
              <span className="rounded-md bg-[#140A29] px-2 py-0.5 text-[11px] font-bold text-white">
                For {listing.preferredGender}
              </span>
              {listing.urgent && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  <span>Urgent</span>
                </span>
              )}
              <span className="rounded-md bg-[#F5F3FA] px-2 py-0.5 text-[11px] font-bold text-[#140A29] tabular-nums">
                {listing.listingCode}
              </span>
            </div>
            <h2
              id="roommate-detail-title"
              className="mt-1.5 font-display text-lg font-bold text-[#090A14] sm:text-xl"
            >
              {headline}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#656275]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
              <span>{fullLoc}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close roommate details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 text-[#090A14] hover:bg-[#F9F8FC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Gallery */}
          {images.length > 0 && (
            <div className="relative overflow-hidden rounded-2xl bg-[#F5EFFD]">
              <div className="aspect-[16/10] w-full">
                <SafeImage
                  src={images[photoIdx]}
                  alt={`${headline} photo ${photoIdx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoIdx((prev) => (prev - 1 + images.length) % images.length)
                    }
                    aria-label="Previous photo"
                    className="absolute top-1/2 left-3 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#090A14] shadow-md hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoIdx((prev) => (prev + 1) % images.length)}
                    aria-label="Next photo"
                    className="absolute top-1/2 right-3 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#090A14] shadow-md hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                    {photoIdx + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Rent & Deposit Per Person */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#090A14]/8 bg-[#F9F8FC] p-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold text-[#656275]">Monthly Rent / Person</p>
              <p className="mt-0.5 font-display text-xl font-bold text-[#6B1CD4] tabular-nums">
                {formatINR(listing.rent)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#656275]">Deposit / Person</p>
              <p className="mt-0.5 font-display text-lg font-bold text-[#090A14] tabular-nums">
                {listing.deposit > 0 ? formatINR(listing.deposit) : 'No / Negotiable'}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold text-[#656275]">Electricity Bill</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-[#090A14]">
                <Zap className="h-3.5 w-3.5 text-[#C89B45]" aria-hidden="true" />
                <span>{listing.electricityBill || 'As per actuals'}</span>
              </p>
            </div>
          </div>

          {/* Flat & Joining Quick Facts */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-[#090A14]/8 bg-white p-3">
              <p className="text-[11px] text-[#656275]">Flat Type</p>
              <p className="mt-1 inline-flex items-center gap-1 font-bold text-[#090A14]">
                <BedDouble className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
                <span>{listing.roomType}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#090A14]/8 bg-white p-3">
              <p className="text-[11px] text-[#656275]">Furnishing</p>
              <p className="mt-1 font-bold text-[#090A14]">{listing.furnishing}</p>
            </div>
            <div className="rounded-xl border border-[#090A14]/8 bg-white p-3">
              <p className="text-[11px] text-[#656275]">Joining Date</p>
              <p className="mt-1 inline-flex items-center gap-1 font-bold text-[#090A14]">
                <Calendar className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
                <span>{formatRoommateDate(listing.availableFrom)}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#090A14]/8 bg-white p-3">
              <p className="text-[11px] text-[#656275]">Roommates Needed</p>
              <p className="mt-1 inline-flex items-center gap-1 font-bold text-[#090A14]">
                <Users className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
                <span>
                  {listing.peopleRequired} ({listing.preferredGender})
                </span>
              </p>
            </div>
          </div>

          {listing.shiftingNow && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
              <Rocket className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Available for shifting now</span>
            </div>
          )}

          {/* Facilities Checklist */}
          {listing.facilities && listing.facilities.length > 0 && (
            <div>
              <h3 className="font-display text-sm font-bold text-[#090A14]">Facilities</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {listing.facilities.map((fac) => (
                  <span
                    key={fac}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span>{fac}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Description */}
          <div>
            <h3 className="font-display text-sm font-bold text-[#090A14]">Details</h3>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#524F61]">
              {listing.description}
            </p>
          </div>

          {/* Direct Contact (ONLY if poster opted into showing numbers publicly) */}
          {listing.showPublicContact && listing.publicWhatsappNumber ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <p className="text-xs font-bold text-emerald-900">Direct Flatmate Contact</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={`tel:+91${listing.publicWhatsappNumber}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-[#090A14] ring-1 ring-emerald-300 tabular-nums hover:bg-emerald-100"
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>{listing.publicWhatsappNumber}</span>
                </a>
                {listing.publicSecondaryContact && (
                  <a
                    href={`tel:+91${listing.publicSecondaryContact}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-[#090A14] ring-1 ring-emerald-300 tabular-nums hover:bg-emerald-100"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span>{listing.publicSecondaryContact}</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#6B1CD4]/15 bg-[#FAF7FF] p-3.5 text-xs text-[#524F61]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
              <p>
                <strong>Privacy Protected:</strong> Personal phone numbers are kept hidden. Message
                WithBroker on WhatsApp with Listing ID <strong>{listing.listingCode}</strong> to
                connect safely.
              </p>
            </div>
          )}

          {/* Report Listing Accordion */}
          <div className="border-t border-[#090A14]/8 pt-3">
            {!reportOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#656275]">
                <span>Posted on {formatRoommateDate(listing.approvedAt || listing.createdAt)}</span>
                <button
                  type="button"
                  data-testid="open-report-roommate-btn"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-[#656275] transition-colors hover:text-red-600"
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Report Listing</span>
                </button>
              </div>
            ) : reportDone ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                Thank you. This vacancy ({listing.listingCode}) has been flagged for WithBroker
                Admin review.
              </div>
            ) : (
              <form
                onSubmit={handleSubmitReport}
                className="space-y-2.5 rounded-xl border border-red-200 bg-red-50/50 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Report This Listing
                  </span>
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="text-xs font-semibold text-[#656275] hover:text-[#090A14]"
                  >
                    Cancel
                  </button>
                </div>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="h-9 w-full rounded-lg border border-red-200 bg-white px-2.5 text-xs text-[#090A14]"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Optional details for our moderation team..."
                  className="w-full rounded-lg border border-red-200 bg-white p-2 text-xs text-[#090A14]"
                />
                {reportError && <p className="text-xs font-medium text-red-700">{reportError}</p>}
                <button
                  type="submit"
                  disabled={reportBusy}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-3.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {reportBusy ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sticky Footer CTAs */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#090A14]/8 bg-white px-5 py-3.5">
          <a
            href={withBrokerWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="roommate-whatsapp-cta"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#15803D] sm:text-sm"
          >
            <WhatsAppIcon className="h-4 w-4 text-white" />
            <span>Contact on WhatsApp</span>
          </a>

          {directWaUrl && (
            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#16A34A]" />
              <span>Direct WhatsApp</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => void handleCopyShare()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-3.5 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>Copied Post!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Copy Post</span>
              </>
            )}
          </button>

          <a
            href={shareWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share vacancy on WhatsApp"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#090A14]/12 bg-white text-[#6B1CD4] hover:bg-[#F5EFFD]"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
};
