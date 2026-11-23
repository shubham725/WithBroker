import React from 'react';
import {
  Building,
  CheckCircle2,
  IndianRupee,
  MapPin,
  PlusCircle,
  Search,
  Users,
  Zap,
} from 'lucide-react';
import { PropertyType, SearchFiltersState } from '../types/property';

interface HeroSectionProps {
  filters: SearchFiltersState;
  onFilterChange: (next: SearchFiltersState) => void;
  onSearchSubmit: () => void;
  onOpenPostModal: () => void;
}

const HERO_IMAGE_URL = '/src/assets/images/hero_pune_apartments_1794817950867.jpg';

const LOCATION_OPTIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'viman-nagar', label: 'Viman Nagar' },
  { value: 'wadgaon-sheri', label: 'Wadgaon Sheri' },
  { value: 'somnath-nagar', label: 'Somnath Nagar' },
  { value: 'other', label: 'Nearby Areas' },
];

const PROPERTY_TYPE_OPTIONS: Array<{ value: 'all' | PropertyType; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: '1RK', label: '1RK' },
  { value: '1BHK', label: '1BHK' },
  { value: '2BHK', label: '2BHK' },
  { value: '3BHK', label: '3BHK' },
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Any Budget' },
  { value: '10000', label: 'Up to ₹10,000' },
  { value: '15000', label: 'Up to ₹15,000' },
  { value: '22000', label: 'Up to ₹22,000' },
  { value: '25000', label: 'Up to ₹25,000' },
  { value: '35000', label: 'Up to ₹35,000' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  filters,
  onFilterChange,
  onSearchSubmit,
  onOpenPostModal,
}) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit();
  };

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-br from-[#FAF7FF] via-[#F3ECFF] to-[#E9DDFB] pb-8 sm:pb-10 lg:pt-12 lg:pb-12"
    >
      {/* Mobile Seamless Top Banner (Edge-to-edge, vivid building, feathered bottom edge) */}
      <div className="relative h-48 w-full overflow-hidden sm:h-60 md:hidden">
        <img
          src={HERO_IMAGE_URL}
          alt="Modern residential apartment building in Pune with landscaped greenery"
          className="h-full w-full object-cover object-[54%_32%] contrast-[1.04] saturate-[1.06] [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
        />
      </div>

      {/* Desktop / Tablet Seamless Right-Side Panoramic Banner (UI Template Style, crisp & low transparency) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[68%] overflow-hidden md:block lg:w-[64%] xl:w-[62%]"
      >
        <img
          src={HERO_IMAGE_URL}
          alt=""
          className="h-full w-full object-cover object-[56%_28%] contrast-[1.04] saturate-[1.08] [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.45)_16%,rgba(0,0,0,0.92)_30%,black_44%,black_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.45)_16%,rgba(0,0,0,0.92)_30%,black_44%,black_100%)]"
        />
        {/* Subtle sky tint along the very top-left sky only, leaving the building 100% crisp */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#ECE2FC]/45 via-[#ECE2FC]/10 to-transparent" />
      </div>

      {/* Subtle Ambient Glow Left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#6B1CD4]/8 blur-3xl"
      />

      {/* Sweeping Bottom Wave Layers Matching UI Template */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] overflow-hidden leading-none"
      >
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="h-14 w-full sm:h-20 lg:h-24"
        >
          <path
            d="M0,48 C280,104 620,96 960,54 C1180,26 1340,18 1440,32 L1440,120 L0,120 Z"
            fill="#EAE0FA"
            fillOpacity="0.65"
          />
          <path
            d="M0,28 C220,96 580,106 940,70 C1180,46 1350,48 1440,68 L1440,120 L0,120 Z"
            fill="#F9F8FC"
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 md:pt-8 lg:pt-2">
        {/* Left-Aligned Hero Copy with Clear Breathing Room Over Feathered Backdrop */}
        <div className="max-w-xl md:max-w-[490px] lg:max-w-[540px]">
          {/* City Anchor */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#6B1CD4]/18 bg-white/95 px-3 py-1 text-xs font-semibold text-[#090A14] shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
            <span>Pune, Maharashtra</span>
          </div>

          {/* Primary Headline */}
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#090A14] text-balance sm:text-[44px] sm:leading-[1.12] lg:text-[48px]">
            Find Your Perfect{' '}
            <span className="text-[#6B1CD4]">Rental Home</span> in Pune
          </h1>

          {/* Subtitle */}
          <p className="mt-3.5 max-w-md text-sm leading-relaxed text-[#4E4A5E] sm:text-base">
            Explore available 1RK, 1BHK, 2BHK apartments in Viman Nagar, Wadgaon Sheri, Somnath Nagar and nearby areas.
          </p>

          {/* 3 Clean Trust Indicators */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs font-medium text-[#090A14] sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-[#6B1CD4] shadow-2xs ring-1 ring-[#6B1CD4]/12">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Verified Listings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-[#6B1CD4] shadow-2xs ring-1 ring-[#6B1CD4]/12">
                <Zap className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Quick Response</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-[#6B1CD4] shadow-2xs ring-1 ring-[#6B1CD4]/12">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>Local Experts</span>
            </div>
          </div>

          {/* Prominent Public Property Submission CTA */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="hero-add-property-btn"
              onClick={onOpenPostModal}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-5 py-2.5 text-xs sm:text-sm font-bold tracking-wide text-white shadow-[0_12px_28px_-10px_rgba(107,28,212,0.55)] transition-all duration-150 hover:from-[#6B1CD4] hover:to-[#4E11A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>ADD YOUR PROPERTY FREE</span>
            </button>
            <span className="text-xs font-medium text-[#524F61]">
              For Owners &amp; Brokers · No login required
            </span>
          </div>
        </div>

        {/* Floating Search Bar Anchored Over Bottom Curved Wave */}
        <form
          onSubmit={handleFormSubmit}
          aria-label="Search rental flats in Pune"
          className="relative z-10 mt-6 rounded-2xl border border-[#090A14]/8 bg-white p-3 shadow-[0_22px_50px_-16px_rgba(95,24,200,0.18)] sm:mt-8 sm:p-3.5 lg:mt-10"
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center lg:gap-0 lg:divide-x lg:divide-[#090A14]/10">
            {/* Location */}
            <div className="lg:col-span-4 lg:px-3">
              <label
                htmlFor="hero-location"
                className="block text-[11px] font-medium text-[#656275]"
              >
                Location
              </label>
              <div className="mt-0.5 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                <select
                  id="hero-location"
                  value={filters.location}
                  onChange={(e) =>
                    onFilterChange({ ...filters, location: e.target.value })
                  }
                  className="h-8 w-full bg-transparent text-sm font-semibold text-[#090A14] focus:outline-none"
                >
                  {LOCATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Property Type */}
            <div className="lg:col-span-3 lg:px-4">
              <label
                htmlFor="hero-type"
                className="block text-[11px] font-medium text-[#656275]"
              >
                Property Type
              </label>
              <div className="mt-0.5 flex items-center gap-2">
                <Building className="h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                <select
                  id="hero-type"
                  value={filters.propertyType}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      propertyType: e.target.value as 'all' | PropertyType,
                    })
                  }
                  className="h-8 w-full bg-transparent text-sm font-semibold text-[#090A14] focus:outline-none"
                >
                  {PROPERTY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max Rent */}
            <div className="lg:col-span-3 lg:px-4">
              <label
                htmlFor="hero-budget"
                className="block text-[11px] font-medium text-[#656275]"
              >
                Max Rent
              </label>
              <div className="mt-0.5 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                <select
                  id="hero-budget"
                  value={filters.maxRent !== null ? String(filters.maxRent) : ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxRent: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-8 w-full bg-transparent text-sm font-semibold text-[#090A14] focus:outline-none"
                >
                  {BUDGET_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Action */}
            <div className="sm:col-span-2 lg:col-span-2 lg:pl-3">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:from-[#6B1CD4] hover:to-[#4E11A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Search Flats</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};
