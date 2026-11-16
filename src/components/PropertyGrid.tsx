import React, { useState } from 'react';
import {
  ArrowUpDown,
  Bookmark,
  LayoutGrid,
  Map as MapIcon,
  RotateCcw,
  Sofa,
} from 'lucide-react';
import {
  FurnishingStatus,
  LocalityConfig,
  PropertyListing,
  PropertyType,
  SearchFiltersState,
  SortOrder,
} from '../types/property';
import { buildGeneralWhatsAppUrl } from '../utils/propertyLogic';
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
  { value: 'all', label: 'All Furnishing' },
  { value: 'Fully Furnished', label: 'Fully Furnished' },
  { value: 'Semi-Furnished', label: 'Semi-Furnished' },
  { value: 'Unfurnished', label: 'Unfurnished' },
];

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'featured', label: 'Sort: Featured' },
  { value: 'rent-asc', label: 'Rent: Low to High' },
  { value: 'rent-desc', label: 'Rent: High to Low' },
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

  const furnishingValue = filters.furnishing ?? 'all';
  const sortValue = filters.sortBy ?? 'featured';
  const onlySavedValue = Boolean(filters.onlySaved);

  const hasActiveFilter =
    filters.location !== 'all' ||
    filters.propertyType !== 'all' ||
    filters.maxRent !== null ||
    furnishingValue !== 'all' ||
    sortValue !== 'featured' ||
    onlySavedValue;

  const activeSavedCount = allProperties.filter(
    (p) => p.listingStatus === 'active' && savedIds.includes(p.id)
  ).length;

  const activeLocalityName =
    filters.location === 'all'
      ? null
      : localities.find((l) => l.slug === filters.location)?.name ?? filters.location;

  return (
    <section id="flats" className="bg-[#F9F8FC] pt-2 pb-10 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header Matching Reference Mockup */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#090A14] sm:text-[28px]">
              Available <span className="text-[#6B1CD4]">Rental Flats</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#656275]">
              Latest and verified rental properties in your preferred location.
            </p>
          </div>

          {/* Right Quick BHK Filter Buttons */}
          <div
            role="group"
            aria-label="Filter by property type"
            className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0"
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
                  className={`inline-flex min-h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-1.5 text-xs sm:text-[13px] font-semibold transition-colors duration-150 ${
                    isActive
                      ? 'border-[#6B1CD4] bg-[#6B1CD4] text-white shadow-xs'
                      : 'border-[#090A14]/12 bg-white text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Compact Utility Bar: Count, Furnishing, Sort, Saved & Cards/Map */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#090A14]/8 bg-white px-4 py-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#656275]">
            <span
              data-testid="listings-count"
              className="font-semibold text-[#090A14] tabular-nums"
            >
              {properties.length} {properties.length === 1 ? 'Flat' : 'Flats'} Available
            </span>
            {activeLocalityName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#6B1CD4]">{activeLocalityName}</span>
              </>
            )}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={onResetFilters}
                className="ml-1 inline-flex items-center gap-1 font-semibold text-[#6B1CD4] hover:underline"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="relative">
              <label htmlFor="toolbar-furnishing" className="sr-only">
                Furnishing Status
              </label>
              <Sofa
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B1CD4]"
                aria-hidden="true"
              />
              <select
                id="toolbar-furnishing"
                value={furnishingValue}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    furnishing: e.target.value as 'all' | FurnishingStatus,
                  })
                }
                className="h-9 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] pl-8 pr-2.5 text-xs font-semibold text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
              >
                {FURNISHING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label htmlFor="toolbar-sort" className="sr-only">
                Sort Properties
              </label>
              <ArrowUpDown
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#656275]"
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
                className="h-9 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] pl-8 pr-2.5 text-xs font-semibold text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
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
              aria-pressed={onlySavedValue}
              onClick={() =>
                onFilterChange({
                  ...filters,
                  onlySaved: !onlySavedValue,
                })
              }
              className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-semibold transition-colors duration-150 ${
                onlySavedValue
                  ? 'border-[#6B1CD4] bg-[#6B1CD4] text-white'
                  : 'border-[#090A14]/12 bg-[#F9F8FC] text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]'
              }`}
            >
              <Bookmark
                className={`h-3.5 w-3.5 ${onlySavedValue ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              <span>Saved</span>
              <span className="tabular-nums opacity-80">({activeSavedCount})</span>
            </button>

            <div
              role="group"
              aria-label="Listings view mode"
              className="inline-flex items-center rounded-xl bg-[#F5F3FA] p-0.5"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#090A14] shadow-2xs'
                    : 'text-[#656275] hover:text-[#090A14]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-[#090A14] shadow-2xs'
                    : 'text-[#656275] hover:text-[#090A14]'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Listings Content: Empty / Map / 3-Col Cards */}
        {properties.length === 0 ? (
          <div
            data-testid="empty-listings-state"
            className="mt-6 rounded-2xl border border-[#090A14]/8 bg-white px-6 py-14 text-center shadow-2xs"
          >
            <h3 className="font-display text-lg font-bold text-[#090A14]">
              {onlySavedValue ? 'No saved flats yet' : 'No matching flats found'}
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-[#656275]">
              {onlySavedValue
                ? 'Save any flat card to shortlist apartments for quick comparison.'
                : 'Try selecting another Pune locality, relaxing furnishing filters, or increasing your monthly budget.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#6B1CD4] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5412AD]"
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
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#090A14]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
              >
                <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                <span>Ask on WhatsApp</span>
              </a>
            </div>
          </div>
        ) : viewMode === 'map' ? (
          <div className="mt-6">
            <PuneListingsMap
              properties={properties}
              onSelectProperty={onViewDetails}
              heightClass="h-[520px]"
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSaved={savedIds.includes(property.id)}
                onToggleSave={onToggleSave}
                onViewDetails={onViewDetails}
                onShare={onShare}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
