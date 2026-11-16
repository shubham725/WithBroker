import React, { useEffect, useState } from 'react';
import {
  Bath,
  Bookmark,
  Building2,
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Droplets,
  Layers,
  MapPin,
  Maximize2,
  Share2,
  Sofa,
  Users,
  X,
} from 'lucide-react';
import { WEBSITE_URL } from '../data/properties';
import { PropertyListing } from '../types/property';
import {
  buildWhatsAppInquiryUrl,
  formatBrokerageLabel,
  formatDepositLabel,
  formatINR,
  getPropertyDirectUrl,
} from '../utils/propertyLogic';
import { PuneListingsMap } from './PuneListingsMap';
import { SafeImage } from './SafeImage';
import { WhatsAppIcon } from './WhatsAppButton';

interface PropertyDetailsProps {
  property: PropertyListing | null;
  isSaved: boolean;
  onToggleSave: (propertyId: string) => void;
  onClose: () => void;
  onShare: (property: PropertyListing) => void;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({
  property,
  isSaved,
  onToggleSave,
  onClose,
  onShare,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [property?.id]);

  useEffect(() => {
    if (!property) return;
    const totalImages = property.images.length > 0 ? property.images.length : 1;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && totalImages > 1) {
        setActiveIndex((prev) => (prev - 1 + totalImages) % totalImages);
      } else if (e.key === 'ArrowRight' && totalImages > 1) {
        setActiveIndex((prev) => (prev + 1) % totalImages);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [property, onClose]);

  if (!property) return null;

  const images = property.images.length > 0 ? property.images : [''];
  const currentImage = images[activeIndex] ?? images[0];

  const pageUrl =
    typeof window !== 'undefined'
      ? getPropertyDirectUrl(window.location.href, property.id)
      : getPropertyDirectUrl(WEBSITE_URL, property.id);
  const whatsAppUrl = buildWhatsAppInquiryUrl(property, pageUrl);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const specRows = [
    { icon: Sofa, label: 'Furnishing', value: property.furnishing },
    ...(property.carpetArea
      ? [{ icon: Maximize2, label: 'Carpet Area', value: property.carpetArea }]
      : []),
    ...(property.builtUpArea
      ? [{ icon: Maximize2, label: 'Built-up Area', value: property.builtUpArea }]
      : []),
    ...(property.floorInfo
      ? [{ icon: Layers, label: 'Floor', value: property.floorInfo }]
      : []),
    ...(property.facing
      ? [{ icon: Compass, label: 'Facing', value: property.facing }]
      : []),
    { icon: Bath, label: 'Bathroom', value: property.bathroomType },
    { icon: Car, label: 'Parking', value: property.parking },
    { icon: Droplets, label: 'Water Supply', value: property.waterAvailability },
    { icon: Building2, label: 'Building / Lift', value: property.liftAvailability },
    { icon: Users, label: 'Suitable For', value: property.suitableFor },
    { icon: Calendar, label: 'Available From', value: property.availableFrom },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-3 sm:p-6 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#090A14]/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#090A14]/8 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6B1CD4]">
              {property.propertyType} · {property.availabilityLabel} · {property.furnishing}
            </p>
            <h2
              id="property-details-title"
              className="mt-0.5 truncate font-display text-lg font-bold text-[#090A14] sm:text-xl"
            >
              {property.title}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-pressed={isSaved}
              onClick={() => onToggleSave(property.id)}
              aria-label={isSaved ? 'Remove from saved flats' : 'Save flat'}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors duration-150 ${
                isSaved
                  ? 'border-[#6B1CD4] bg-[#6B1CD4]/8 text-[#6B1CD4]'
                  : 'border-[#090A14]/12 text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close property details"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 text-[#090A14] transition-colors hover:bg-[#F9F8FC]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {/* Image Gallery */}
          <div className="relative aspect-[16/9] max-h-[240px] sm:max-h-[350px] w-full overflow-hidden rounded-2xl bg-[#F3F0FA]">
            <SafeImage
              src={currentImage}
              alt={`${property.title} photo ${activeIndex + 1}`}
              eager
              className="h-full w-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#090A14] shadow-md transition-colors hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#090A14] shadow-md transition-colors hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#090A14]/75 via-[#090A14]/25 to-transparent px-4 py-3 text-xs font-medium text-white">
              <span className="truncate">{property.locality}</span>
              <span className="shrink-0 tabular-nums">
                {activeIndex + 1} / {images.length}
              </span>
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Select photo ${idx + 1}`}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-opacity ${
                    activeIndex === idx
                      ? 'border-[#6B1CD4] opacity-100'
                      : 'border-transparent opacity-65 hover:opacity-100'
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${property.title} thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Editorial Split Showcase */}
          <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Details Column */}
            <div className="lg:col-span-7">
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#090A14]">{property.locality}</p>
                  <p className="mt-0.5 text-xs text-[#656275]">{property.publicAreaNote}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mt-5 border-t border-[#090A14]/8 pt-5">
                <h3 className="font-display text-base font-bold text-[#090A14]">
                  Property Overview
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#656275]">
                  {property.fullDescription}
                </p>
              </div>

              {/* Hairline Architectural Specifications */}
              <div className="mt-6 border-t border-[#090A14]/8 pt-5">
                <h3 className="font-display text-base font-bold text-[#090A14]">
                  Apartment Specifications
                </h3>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {specRows.map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-start gap-2.5 border-b border-[#090A14]/6 pb-2.5"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                      <div className="min-w-0">
                        <dt className="text-xs text-[#656275]">{label}</dt>
                        <dd className="text-sm font-semibold text-[#090A14]">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Facilities */}
              <div className="mt-6 border-t border-[#090A14]/8 pt-5">
                <h3 className="font-display text-base font-bold text-[#090A14]">
                  Facilities &amp; Utilities
                </h3>
                <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#090A14] sm:grid-cols-2">
                  {property.facilities.map((facility) => (
                    <li key={facility} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                      <span>{facility}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {property.additionalNotes && (
                <div className="mt-5 border-t border-[#090A14]/8 pt-4 text-xs leading-relaxed text-[#656275]">
                  <span className="font-semibold text-[#090A14]">Additional Notes: </span>
                  {property.additionalNotes}
                </div>
              )}
            </div>

            {/* Right Sticky Rental Ledger + Map */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-2xl border border-[#090A14]/8 bg-[#F9F8FC] p-5">
                <h3 className="font-display text-base font-bold text-[#090A14]">
                  Transparent Rental Breakdown
                </h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-[#090A14]/8 pb-2.5">
                    <dt className="text-[#656275]">Monthly Rent</dt>
                    <dd className="font-display text-xl font-bold text-[#6B1CD4] tabular-nums">
                      {formatINR(property.monthlyRent)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#090A14]/8 pb-2.5">
                    <dt className="text-[#656275]">Security Deposit</dt>
                    <dd className="font-semibold text-[#090A14] tabular-nums">
                      {formatDepositLabel(property.securityDeposit)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#090A14]/8 pb-2.5">
                    <dt className="text-[#656275]">Brokerage</dt>
                    <dd className="font-semibold text-[#090A14] tabular-nums">
                      {formatBrokerageLabel(property)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#656275]">Maintenance</dt>
                    <dd className="font-medium text-[#090A14]">
                      {property.maintenanceCharges || 'Included / Ask on inquiry'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-col gap-2.5">
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#6B1CD4] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#5412AD]"
                  >
                    <WhatsAppIcon className="h-4 w-4 text-white" />
                    <span>Contact on WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onShare(property)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#090A14]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#090A14] transition-colors duration-150 hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    <span>Share Property Post</span>
                  </button>
                </div>
              </div>

              <div>
                <h4 className="mb-2.5 text-xs font-semibold text-[#656275]">
                  Approximate Locality Pin ({property.subLocality})
                </h4>
                <PuneListingsMap
                  properties={[property]}
                  focusedProperty={property}
                  heightClass="h-[220px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
