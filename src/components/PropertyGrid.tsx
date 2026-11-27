import React, { useState } from 'react';
import {
  ArrowUpDown,
  Bookmark,
  CheckCircle2,
  LayoutGrid,
  Map as MapIcon,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  FurnishingStatus,
  LocalityConfig,
  PropertyListing,
  PropertyType,
  SearchFiltersState,
  SortOrder,
  SubmitterRole,
} from '../types/property';
import { buildGeneralWhatsAppUrl, isPropertyRentedOut } from '../utils/propertyLogic';
import { PropertyCard } from './PropertyCard';
import { PuneListingsMap } from './PuneListingsMap';
import { WhatsAppIcon } from './WhatsAppButton';

interface PropertyGridProps {
  allProperties: PropertyListing[];
  properties: PropertyListing[];
  localities: LocalityConfig[];
  filters: SearchFiltersState;
  savedIds: string[];
  onToggleSave: (propertyId: string) => void;
  onFilterChange: (next: SearchFiltersState) => void;
  onResetFilters: () => void;
  onViewDetails: (property: PropertyListing) => void;
  onShare: (property: PropertyListing) => void;
}

const PROPERTY_TYPE_TABS: Array<{ value: 'all' | PropertyType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: '1RK', label: '1RK' },
  { value: '1BHK', label: '1BHK' },
  { value: '2BHK', label: '2BHK' },
  { value: '3BHK', label: '3BHK' },
];

const FURNISHING_OPTIONS: Array<{ value: 'all' | FurnishingStatus; label: string }> = [
  { value: 'all', label: 'Any Furnishing' },
  { value: 'Fully Furnished', label: 'Fully Furnished' },
  { value: 'Semi-Furnished', label: 'Semi-Furnished' },
  { value: 'Unfurnished', label: 'Unfurnished' },
];

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'rent-asc', label: 'Rent: Low to High' },
  { value: 'rent-desc', label: 'Rent: High to Low' },
];

const MIN_RENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any Min Rent' },
  { value: '5000', label: 'Min ₹5,000' },
  { value: '10000', label: 'Min ₹10,000' },
  { value: '15000', label: 'Min ₹15,000' },
  { value: '20000', label: 'Min ₹20,000' },
  { value: '25000', label: 'Min ₹25,000' },
];

const MAX_RENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any Max Rent' },
  { value: '10000', label: 'Max ₹10,000' },
  { value: '15000', label: 'Max ₹15,000' },
  { value: '22000', label: 'Max ₹22,000' },
  { value: '25000', label: 'Max ₹25,000' },
  { value: '35000', label: 'Max ₹35,000' },
];

const SOURCE_OPTIONS: Array<{ value: 'all' | SubmitterRole; label: string }> = [
  { value: 'all', label: 'Owner & Broker' },
  { value: 'Owner', label: 'Owner Only' },
  { value: 'Broker', label: 'Broker Only' },
];

export const PropertyGrid: React.FC<PropertyGridProps> = ({
  allProperties,
  properties,
  localities,
  filters,
  savedIds,
  onToggleSave,
  onFilterChange,
  onResetFilters,
  onViewDetails,
  onShare,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const furnishingValue = filters.furnishing ?? 'all';
  const submitterRoleValue = filters.submitterRole ?? 'all';
  const sortValue = filters.sortBy ?? 'recent';
  const onlySavedValue = Boolean(filters.onlySaved);
  const onlyAvailableValue = Boolean(filters.onlyAvailable);

  const extraFilterCount = [
    filters.minRent !== undefined && filters.minRent !== null,
    filters.maxRent !== null,
    furnishingValue !== 'all',
    submitterRoleValue !== 'all',
  ].filter(Boolean).length;

  const hasActiveFilter =
    filters.location !== 'all' ||
    filters.propertyType !== 'all' ||
    extraFilterCount > 0 ||
    onlyAvailableValue ||
    sortValue !== 'recent' ||
    onlySavedValue;

  const activeSavedCount = allProperties.filter(
    (p) => p.listingStatus === 'active' && savedIds.includes(p.id)
  ).length;

  const activeLocalityName =
    filters.location === 'all'
      ? null
      : localities.find((l) => l.slug === filters.location)?.name ?? filters.location;

  const availableCount = properties.filter((p) => !isPropertyRentedOut(p)).length;
  const rentedCount = properties.length - availableCount;

  return (
    <section id="flats" className="scroll-mt-24 bg-[#F9F7FD] pt-2 pb-14 sm:pb-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header + Clean Segmented BHK Filter */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-[#140A29] sm:text-[28px]">
              Available <span className="text-[#6B1CD4]">Rental Flats</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#544E66]">
              Verified apartments with upfront rent, deposit, and brokerage details.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter by property type"
            className="no-scrollbar inline-flex flex-nowrap items-center gap-1 self-start overflow-x-auto rounded-xl border border-[#6B1CD4]/12 bg-[#EFE8FC] p-1 md:self-auto"
          >
            {PROPERTY_TYPE_TABS.map((tab) => {
              const isActive = filters.propertyType === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() =>
                    onFilterChange({
                      ...filters,
                      propertyType: tab.value,
                    })
                  }
                  className={`inline-flex min-h-[34px] shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3.5 text-xs sm:text-[13px] font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] text-white shadow-[0_6px_14px_-6px_rgba(107,28,212,0.55)]'
                      : 'text-[#544E66] hover:text-[#6B1CD4]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Single-Line Marketplace Utility Bar */}
        <div className="mt-5 rounded-2xl border border-[#6B1CD4]/14 bg-white px-4 py-3 shadow-[0_12px_28px_-20px_rgba(95,24,200,0.20)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Live Count & Active Area */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#544E66]">
              <span
                data-testid="listings-count"
                className="font-semibold text-[#140A29] tabular-nums"
              >
                {availableCount} {availableCount === 1 ? 'Flat' : 'Flats'} Available
              </span>
              {rentedCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-[#6B1CD4]/30">
                    ·
                  </span>
                  <span className="font-medium text-[#B91C1C] tabular-nums">
                    {rentedCount} Rented Out
                  </span>
                </>
              )}
              {activeLocalityName && (
                <>
                  <span aria-hidden="true" className="text-[#6B1CD4]/30">
                    ·
                  </span>
                  <span className="font-semibold text-[#6B1CD4]">{activeLocalityName}</span>
                </>
              )}
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="ml-1 inline-flex items-center gap-1 font-semibold text-[#6B1CD4] hover:underline"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Right: Focused Primary Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-expanded={showFilters}
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  showFilters || extraFilterCount > 0
                    ? 'border-[#6B1CD4] bg-[#F5EEFF] text-[#6B1CD4]'
                    : 'border-[#6B1CD4]/18 bg-white text-[#140A29] hover:border-[#6B1CD4]/45 hover:bg-[#F9F7FD]'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
                <span>Filters</span>
                {extraFilterCount > 0 && (
                  <span className="tabular-nums">({extraFilterCount})</span>
                )}
              </button>

              <div className="relative">
                <label htmlFor="toolbar-sort" className="sr-only">
                  Sort Properties
                </label>
                <ArrowUpDown
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B1CD4]"
                  aria-hidden="true"
                />
                <select
                  id="toolbar-sort"
                  value={sortValue}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      sortBy: e.target.value as SortOrder,
                    })
                  }
                  className="h-9 rounded-lg border border-[#6B1CD4]/18 bg-white pl-8 pr-3 text-xs font-semibold text-[#140A29] transition-colors hover:border-[#6B1CD4]/45 focus:border-[#6B1CD4] focus:outline-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                aria-pressed={onlyAvailableValue}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    onlyAvailable: !onlyAvailableValue,
                  })
                }
                className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  onlyAvailableValue
                    ? 'border-[#16A34A] bg-[#16A34A] text-white'
                    : 'border-[#6B1CD4]/18 bg-white text-[#140A29] hover:border-[#6B1CD4]/45 hover:bg-[#F9F7FD]'
                }`}
              >
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${onlyAvailableValue ? 'text-white' : 'text-[#6B1CD4]'}`}
                  aria-hidden="true"
                />
                <span>Available Only</span>
              </button>

              <button
                type="button"
                aria-pressed={onlySavedValue}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    onlySaved: !onlySavedValue,
                  })
                }
                className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  onlySavedValue
                    ? 'border-[#6B1CD4] bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] text-white'
                    : 'border-[#6B1CD4]/18 bg-white text-[#140A29] hover:border-[#6B1CD4]/45 hover:bg-[#F9F7FD]'
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${
                    onlySavedValue ? 'fill-current text-white' : 'text-[#6B1CD4]'
                  }`}
                  aria-hidden="true"
                />
                <span>Saved</span>
                <span className="tabular-nums opacity-75">({activeSavedCount})</span>
              </button>

              <div
                role="group"
                aria-label="Listings view mode"
                className="inline-flex items-center rounded-lg border border-[#6B1CD4]/12 bg-[#EFE8FC] p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#6B1CD4] shadow-2xs'
                      : 'text-[#544E66] hover:text-[#140A29]'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white text-[#6B1CD4] shadow-2xs'
                      : 'text-[#544E66] hover:text-[#140A29]'
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Map</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Secondary Filters Drawer */}
          {showFilters && (
            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#6B1CD4]/12 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="toolbar-min-rent"
                  className="block text-[11px] font-medium text-[#544E66]"
                >
                  Minimum Rent
                </label>
                <select
                  id="toolbar-min-rent"
                  value={filters.minRent ? String(filters.minRent) : ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      minRent: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#6B1CD4]/18 bg-[#F9F7FD] px-3 text-xs font-semibold text-[#140A29] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
                >
                  {MIN_RENT_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="toolbar-max-rent"
                  className="block text-[11px] font-medium text-[#544E66]"
                >
                  Maximum Rent
                </label>
                <select
                  id="toolbar-max-rent"
                  value={filters.maxRent ? String(filters.maxRent) : ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxRent: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#6B1CD4]/18 bg-[#F9F7FD] px-3 text-xs font-semibold text-[#140A29] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
                >
                  {MAX_RENT_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="toolbar-furnishing"
                  className="block text-[11px] font-medium text-[#544E66]"
                >
                  Furnishing
                </label>
                <select
                  id="toolbar-furnishing"
                  value={furnishingValue}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      furnishing: e.target.value as 'all' | FurnishingStatus,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#6B1CD4]/18 bg-[#F9F7FD] px-3 text-xs font-semibold text-[#140A29] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
                >
                  {FURNISHING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="toolbar-source"
                  className="block text-[11px] font-medium text-[#544E66]"
                >
                  Posted By
                </label>
                <select
                  id="toolbar-source"
                  value={submitterRoleValue}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      submitterRole: e.target.value as 'all' | SubmitterRole,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#6B1CD4]/18 bg-[#F9F7FD] px-3 text-xs font-semibold text-[#140A29] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Listings Content: Empty / Map / 3-Col Animated Cards */}
        <MotionConfig reducedMotion="user">
          {properties.length === 0 ? (
            <motion.div
              key="empty-listings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              data-testid="empty-listings-state"
              className="mt-6 rounded-2xl border border-[#6B1CD4]/14 bg-white px-6 py-14 text-center shadow-[0_14px_30px_-24px_rgba(95,24,200,0.2)]"
            >
              <h3 className="font-display text-lg font-bold text-[#140A29]">
                {onlySavedValue ? 'No saved flats yet' : 'No matching flats found'}
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-[#544E66]">
                {onlySavedValue
                  ? 'Save any flat card to shortlist apartments for quick comparison.'
                  : 'Try selecting another Pune locality, relaxing furnishing filters, or increasing your monthly budget.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(107,28,212,0.5)] transition-all hover:from-[#6B1CD4] hover:to-[#4E11A8]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Show All Flats</span>
                </button>
                <a
                  href={buildGeneralWhatsAppUrl(
                    'Hello WithBroker, I did not find an exact match on the website. Can you share available flats in Pune?'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#6B1CD4]/22 bg-white px-5 py-2.5 text-sm font-semibold text-[#140A29] transition-colors hover:border-[#6B1CD4] hover:bg-[#F7F3FF] hover:text-[#6B1CD4]"
                >
                  <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>
            </motion.div>
          ) : viewMode === 'map' ? (
            <motion.div
              key="map-listings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="mt-6"
            >
              <PuneListingsMap
                properties={properties}
                activeAreaName={activeLocalityName}
                onSelectProperty={onViewDetails}
                heightClass="h-[520px]"
              />
            </motion.div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {properties.map((property) => (
                  <motion.div
                    key={property.id}
                    layout="position"
                    initial={{ opacity: 0, y: 10, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.97,
                      transition: { duration: 0.14, ease: 'easeOut' },
                    }}
                    transition={{
                      layout: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
                      opacity: { duration: 0.18, ease: 'easeOut' },
                      y: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                      scale: { duration: 0.18, ease: 'easeOut' },
                    }}
                    className="h-full w-full"
                  >
                    <PropertyCard
                      property={property}
                      isSaved={savedIds.includes(property.id)}
                      onToggleSave={onToggleSave}
                      onViewDetails={onViewDetails}
                      onShare={onShare}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </MotionConfig>
      </div>
    </section>
  );
};
