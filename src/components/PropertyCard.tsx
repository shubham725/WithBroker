import React, { useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Share2,
} from 'lucide-react';
import { PropertyListing } from '../types/property';
import {
  buildWhatsAppInquiryUrl,
  formatDepositLabel,
  formatINR,
  getPublicPropertyShareUrl,
  isPropertyRentedOut,
} from '../utils/propertyLogic';
import { SafeImage } from './SafeImage';
import { WhatsAppIcon } from './WhatsAppButton';

interface PropertyCardProps {
  property: PropertyListing;
  isSaved: boolean;
  onToggleSave: (propertyId: string) => void;
  onViewDetails: (property: PropertyListing) => void;
  onShare: (property: PropertyListing) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isSaved,
  onToggleSave,
  onViewDetails,
  onShare,
}) => {
  const [photoIdx, setPhotoIdx] = useState(0);
  const images = property.images.length > 0 ? property.images : [''];
  const currentImg = images[photoIdx] ?? images[0];

  const pageUrl = getPublicPropertyShareUrl(property.propertyCode || property.id);
  const whatsAppUrl = buildWhatsAppInquiryUrl(property, pageUrl);

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIdx((prev) => (prev + 1) % images.length);
  };

  const brokerageShort =
    property.brokerageStatus === 'No Brokerage'
      ? 'Zero'
      : property.brokerageAmount > 0
        ? formatINR(property.brokerageAmount)
        : property.brokerageStatus;

  const topHighlights = [
    ...(property.carpetArea ? [property.carpetArea] : []),
    ...property.facilities,
  ].slice(0, 3);

  const isRentedOut = isPropertyRentedOut(property);

  return (
    <article
      data-testid={`property-card-${property.id}`}
      data-rented={isRentedOut ? 'true' : 'false'}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-200 ${
        isRentedOut
          ? 'border-[#6B1CD4]/10 bg-[#FAF8FE]'
          : 'border-[#6B1CD4]/12 bg-white hover:border-[#6B1CD4]/36 hover:shadow-[0_18px_36px_-20px_rgba(95,24,200,0.22)]'
      }`}
    >
      {/* Top Property Image Frame */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F1EBFC]">
        <button
          type="button"
          onClick={() => onViewDetails(property)}
          aria-label={`View photos and details for ${property.title} in ${property.locality}`}
          className="block h-full w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
        >
          <SafeImage
            src={currentImg}
            alt={`${property.title} in ${property.locality}`}
            className={`h-full w-full object-cover transition-transform duration-300 ${
              isRentedOut
                ? 'grayscale-[35%] brightness-[0.82] group-hover:scale-[1.02]'
                : 'group-hover:scale-[1.03]'
            }`}
          />
        </button>

        {/* Rented Out Stamp Overlay */}
        {isRentedOut && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#090A14]/25">
            <span className="rounded-lg bg-[#DC2626] px-3.5 py-1.5 text-xs font-bold tracking-wider text-white uppercase shadow-md">
              Rented Out
            </span>
          </div>
        )}

        {/* Top-Left Property Type Tag */}
        <span
          className={`pointer-events-none absolute top-3 left-3 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs ${
            isRentedOut ? 'bg-[#2C2440]/90' : 'bg-[#1B0D36]/86'
          }`}
        >
          {property.propertyType}
        </span>

        {/* Top-Right Save Heart Button */}
        <button
          type="button"
          aria-pressed={isSaved}
          onClick={() => onToggleSave(property.id)}
          aria-label={isSaved ? `Remove ${property.title} from saved flats` : `Save ${property.title}`}
          className={`absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-xs transition-colors duration-150 ${
            isSaved ? 'text-[#6B1CD4]' : 'text-[#5C5E6B] hover:text-[#6B1CD4]'
          }`}
        >
          <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>

        {/* Inline Carousel Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevPhoto}
              aria-label={`Previous photo of ${property.title}`}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#090A14] shadow-sm opacity-90 sm:opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              aria-label={`Next photo of ${property.title}`}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#090A14] shadow-sm opacity-90 sm:opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Bottom-Right Subtle Photo Counter */}
        {images.length > 1 && (
          <span className="pointer-events-none absolute right-3 bottom-2.5 inline-flex items-center gap-1 rounded-md bg-[#090A14]/70 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums backdrop-blur-xs">
            <Camera className="h-3 w-3" aria-hidden="true" />
            <span>
              {photoIdx + 1}/{images.length}
            </span>
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Monthly Rent + Status Line */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-display text-[22px] font-bold tracking-[-0.015em] tabular-nums ${
                isRentedOut ? 'text-[#7A748B] line-through' : 'text-[#140A29]'
              }`}
            >
              {formatINR(property.monthlyRent)}
            </span>
            <span className="text-xs font-medium text-[#544E66]">/mo</span>
          </div>
          <span className="text-[11px] font-medium text-[#7A748B] tabular-nums">
            {property.propertyCode}
          </span>
        </div>

        {/* Title */}
        <button
          type="button"
          onClick={() => onViewDetails(property)}
          className="mt-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
        >
          <h3 className="line-clamp-2 min-h-[2.6rem] font-display text-[15px] sm:text-base font-bold leading-snug text-[#140A29] transition-colors hover:text-[#6B1CD4]">
            {property.title}
          </h3>
        </button>

        {/* Locality */}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#544E66]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
          <span className="truncate">{property.locality}</span>
        </p>

        {/* Clean 3-Column Specs Strip */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 border-y border-[#6B1CD4]/10 py-2.5 text-left">
          <div className="min-w-0">
            <span className="block text-[11px] text-[#6A637D]">Deposit</span>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#140A29] tabular-nums">
              {formatDepositLabel(property.securityDeposit)}
            </p>
          </div>

          <div className="min-w-0">
            <span className="block text-[11px] text-[#6A637D]">Brokerage</span>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#140A29] tabular-nums">
              {brokerageShort}
            </p>
          </div>

          <div className="min-w-0">
            <span className="block text-[11px] text-[#6A637D]">Furnishing</span>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#140A29]">
              {property.furnishing === 'Fully Furnished' ? 'Furnished' : property.furnishing}
            </p>
          </div>
        </div>

        {/* Unboxed Inline Highlights Metadata */}
        {topHighlights.length > 0 && (
          <p className="mt-3 truncate text-xs text-[#544E66]">
            {topHighlights.join(' · ')}
          </p>
        )}

        <button
          type="button"
          aria-label={`View details for ${property.title}`}
          onClick={() => onViewDetails(property)}
          className="mt-2 self-start text-xs font-semibold text-[#6B1CD4] hover:underline"
        >
          View {images.length} {images.length === 1 ? 'photo' : 'photos'} &amp; details →
        </button>

        {/* Bottom Action Row */}
        <div className="mt-auto flex items-center gap-2 pt-4">
          {isRentedOut ? (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ask WithBroker on WhatsApp for flats similar to ${property.title}`}
              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#090A14]/15 bg-white px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#090A14] transition-colors duration-150 hover:border-[#16A34A] hover:text-[#15803D]"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#16A34A]" />
              <span>Ask for Similar Flats</span>
            </a>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onShare(property)}
                aria-label={`Share ${property.title} as text post`}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#6B1CD4]/20 bg-white px-3.5 py-2 text-xs sm:text-[13px] font-semibold text-[#140A29] transition-colors duration-150 hover:border-[#6B1CD4] hover:bg-[#F7F3FF] hover:text-[#6B1CD4]"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Share</span>
              </button>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Contact WithBroker on WhatsApp about ${property.title}`}
                className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#16A34A] px-4 py-2 text-xs sm:text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#15803D]"
              >
                <WhatsAppIcon className="h-4 w-4 text-white" />
                <span>WhatsApp</span>
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
