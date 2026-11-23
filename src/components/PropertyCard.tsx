import React, { useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Handshake,
  Heart,
  Image as ImageIcon,
  MapPin,
  Share2,
  ShieldCheck,
  Sofa,
} from 'lucide-react';
import { WEBSITE_URL } from '../data/properties';
import { PropertyListing } from '../types/property';
import {
  buildWhatsAppInquiryUrl,
  formatDepositLabel,
  formatINR,
  getPropertyDirectUrl,
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

  const pageUrl =
    typeof window !== 'undefined'
      ? getPropertyDirectUrl(window.location.href, property.id)
      : getPropertyDirectUrl(WEBSITE_URL, property.id);
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
      ? 'No Brokerage'
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
          ? 'border-[#090A14]/10 bg-[#FCFBFE] shadow-[0_6px_18px_-12px_rgba(9,10,20,0.1)] hover:border-[#DC2626]/35'
          : 'border-[#090A14]/8 bg-white shadow-[0_8px_24px_-14px_rgba(9,10,20,0.12)] hover:-translate-y-0.5 hover:border-[#6B1CD4]/35 hover:shadow-[0_20px_44px_-16px_rgba(95,24,200,0.18)]'
      }`}
    >
      {/* Top Property Image Frame */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F3F0FA]">
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
                ? 'grayscale-[35%] brightness-[0.8] group-hover:scale-[1.02]'
                : 'group-hover:scale-[1.03]'
            }`}
          />
        </button>

        {/* Rented Out Stamp Overlay */}
        {isRentedOut && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#090A14]/25">
            <span className="rounded-lg border border-white/40 bg-[#DC2626] px-4 py-1.5 text-xs font-extrabold tracking-widest text-white uppercase shadow-lg">
              Rented Out
            </span>
          </div>
        )}

        {/* Top-Left Property Type Tag */}
        <span
          className={`pointer-events-none absolute top-3 left-3 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-xs ${
            isRentedOut ? 'bg-[#3F3D4D]' : 'bg-[#6B1CD4]'
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
            isSaved ? 'text-[#6B1CD4]' : 'text-[#524F61] hover:text-[#6B1CD4]'
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
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#090A14] shadow-sm opacity-90 sm:opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              aria-label={`Next photo of ${property.title}`}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#090A14] shadow-sm opacity-90 sm:opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Bottom-Left Property ID Tag */}
        <span className="pointer-events-none absolute left-3 bottom-3 rounded-md bg-[#140A29]/80 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white tabular-nums">
          {property.propertyCode}
        </span>

        {/* Bottom-Right Photo Count Pill */}
        <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-[#090A14]/75 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          <Camera className="h-3 w-3" aria-hidden="true" />
          <span>
            {photoIdx + 1}/{images.length}
          </span>
        </span>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <button
          type="button"
          onClick={() => onViewDetails(property)}
          className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
        >
          <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-base sm:text-[17px] font-bold leading-snug text-[#090A14] transition-colors hover:text-[#6B1CD4]">
            {property.title}
          </h3>
        </button>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#656275]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
          <span className="truncate">{property.locality}</span>
        </p>

        {/* Monthly Rent Line */}
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span
            className={`font-display text-2xl font-bold tabular-nums ${
              isRentedOut ? 'text-[#767287] line-through' : 'text-[#6B1CD4]'
            }`}
          >
            {formatINR(property.monthlyRent)}
          </span>
          <span className="text-xs font-medium text-[#656275]">/month</span>
          {isRentedOut && (
            <span className="ml-auto rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-bold text-[#DC2626] ring-1 ring-[#DC2626]/20">
              Rented Out
            </span>
          )}
        </div>

        {/* 3-Column Specs Strip: Deposit, Brokerage, Furnishing */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-y border-[#090A14]/8 py-2.5 text-left">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] text-[#656275]">
              <ShieldCheck className="h-3 w-3 shrink-0 text-[#524F61]" aria-hidden="true" />
              <span className="truncate">Deposit</span>
            </div>
            <p className="mt-0.5 truncate text-xs sm:text-[13px] font-bold text-[#090A14] tabular-nums">
              {formatDepositLabel(property.securityDeposit)}
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] text-[#656275]">
              <Handshake className="h-3 w-3 shrink-0 text-[#524F61]" aria-hidden="true" />
              <span className="truncate">Brokerage</span>
            </div>
            <p className="mt-0.5 truncate text-xs sm:text-[13px] font-bold text-[#090A14] tabular-nums">
              {brokerageShort}
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] text-[#656275]">
              <Sofa className="h-3 w-3 shrink-0 text-[#524F61]" aria-hidden="true" />
              <span className="truncate">Furnishing</span>
            </div>
            <p className="mt-0.5 truncate text-xs sm:text-[13px] font-bold text-[#090A14]">
              {property.furnishing === 'Fully Furnished' ? 'Furnished' : property.furnishing}
            </p>
          </div>
        </div>

        {/* Top Highlights Strip + Details Trigger */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[#5312AB]">
          {topHighlights.map((item) => (
            <span
              key={item}
              className="rounded-md bg-[#F5F1FD] px-2 py-1 text-[#5312AB]"
            >
              {item}
            </span>
          ))}
        </div>

        <button
          type="button"
          aria-label={`View details for ${property.title}`}
          onClick={() => onViewDetails(property)}
          className="mt-2.5 inline-flex items-center gap-1 self-start text-xs font-semibold text-[#6B1CD4] hover:underline"
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>View {images.length} photos &amp; full details →</span>
        </button>

        {/* Bottom Action Row */}
        <div className="mt-auto flex items-center gap-2.5 pt-3.5">
          {isRentedOut ? (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ask WithBroker on WhatsApp for flats similar to ${property.title}`}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#090A14]/15 bg-[#F8F7FC] px-4 py-2 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors duration-150 hover:border-[#16A34A] hover:bg-[#F0FDF4] hover:text-[#15803D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A]"
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
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#090A14]/12 bg-[#F8F7FC] px-4 py-2 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors duration-150 hover:border-[#6B1CD4] hover:text-[#6B1CD4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Share</span>
              </button>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Contact WithBroker on WhatsApp about ${property.title}`}
                className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#16A34A] px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#15803D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A]"
              >
                <WhatsAppIcon className="h-4 w-4 text-white" />
                <span>Contact on WhatsApp</span>
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
