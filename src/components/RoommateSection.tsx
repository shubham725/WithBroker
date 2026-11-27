import React, { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Calendar,
  Flame,
  LayoutDashboard,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PreferredGender,
  PublicRoommateListing,
  ROOMMATE_PUNE_LOCATIONS,
  ROOMMATE_ROOM_TYPES,
  RoommateFiltersState,
  RoommateFlatOccupancy,
  RoommateFurnishing,
  RoommateRoomType,
  RoommateSortOrder,
} from '../types/roommate';
import { formatINR } from '../utils/propertyLogic';
import {
  INITIAL_ROOMMATE_FILTERS,
  buildRoommateWhatsAppUrl,
  filterAndSortRoommates,
  formatRoommateDate,
} from '../utils/roommateLogic';
import { SafeImage } from './SafeImage';
import { WhatsAppIcon } from './WhatsAppButton';

interface RoommateSectionProps {
  allRoommates: PublicRoommateListing[];
  loading: boolean;
  externalFilterPreset?: {
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
    ts: number;
  } | null;
  onViewDetails: (listing: PublicRoommateListing) => void;
  onShareListing: (listing: PublicRoommateListing) => void;
  onOpenPostRoommate: (preset?: {
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
  }) => void;
  onOpenMyRoommates: () => void;
}

export const RoommateSection: React.FC<RoommateSectionProps> = ({
  allRoommates,
  loading,
  externalFilterPreset,
  onViewDetails,
  onShareListing,
  onOpenPostRoommate,
  onOpenMyRoommates,
}) => {
  const [filters, setFilters] = useState<RoommateFiltersState>(INITIAL_ROOMMATE_FILTERS);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    if (!externalFilterPreset) return;
    setFilters((prev) => ({
      ...prev,
      flatOccupancy: externalFilterPreset.flatOccupancy ?? prev.flatOccupancy ?? 'all',
      preferredGender: externalFilterPreset.preferredGender ?? prev.preferredGender,
    }));
  }, [externalFilterPreset]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>(ROOMMATE_PUNE_LOCATIONS);
    allRoommates.forEach((item) => {
      if (item.location.trim()) set.add(item.location.trim());
    });
    return Array.from(set);
  }, [allRoommates]);

  const filteredListings = useMemo(
    () => filterAndSortRoommates(allRoommates, filters),
    [allRoommates, filters]
  );

  const extraFilterCount = [
    filters.roomType !== 'all',
    filters.minBudget !== null,
    filters.maxBudget !== null,
    filters.furnishing !== 'all',
    Boolean(filters.availableFrom),
  ].filter(Boolean).length;

  const hasActiveFilters =
    (filters.flatOccupancy && filters.flatOccupancy !== 'all') ||
    filters.location !== 'all' ||
    filters.preferredGender !== 'all' ||
    extraFilterCount > 0;

  const resetFilters = () => setFilters(INITIAL_ROOMMATE_FILTERS);

  return (
    <section
      id="roommates"
      aria-labelledby="roommates-section-heading"
      className="scroll-mt-20 border-t border-[#090A14]/8 bg-white py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Editorial Section Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B1CD4]">Roommate Connect · Pune</p>
            <h2
              id="roommates-section-heading"
              className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] text-[#090A14] sm:text-[28px]"
            >
              Roommate Vacancies in Pune
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-[#5C5E6B]">
              Verified openings in pre-occupied and new flats with per-person rent, deposit,
              facilities, and joining dates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenMyRoommates}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#090A14]/14 bg-white px-3.5 py-2 text-xs font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4] sm:text-[13px]"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-[#5C5E6B]" aria-hidden="true" />
              <span>My Listings</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPostRoommate()}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#6B1CD4] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5412AD] sm:text-[13px]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Post Roommate Vacancy</span>
            </button>
          </div>
        </div>

        {/* Sleek Single-Row Marketplace Filter Bar */}
        <div className="mt-6 rounded-2xl border border-[#090A14]/9 bg-[#FAFAFC] p-3 sm:p-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Occupancy Segmented Control */}
              <div
                role="group"
                aria-label="Filter by flat occupancy"
                className="inline-flex rounded-xl bg-[#ECECF2] p-0.5"
              >
                {(
                  [
                    { key: 'all', label: `All (${allRoommates.length})` },
                    { key: 'Pre-Occupied Flat', label: 'Pre-Occupied' },
                    { key: 'New Flat', label: 'New Flat' },
                  ] as const
                ).map((tab) => {
                  const active = (filters.flatOccupancy || 'all') === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, flatOccupancy: tab.key }))
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-white text-[#090A14] shadow-2xs'
                          : 'text-[#5C5E6B] hover:text-[#090A14]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Gender Segmented Control */}
              <div
                role="group"
                aria-label="Filter by Male or Female roommate"
                className="inline-flex rounded-xl bg-[#ECECF2] p-0.5"
              >
                {(['all', 'Male', 'Female'] as const).map((g) => {
                  const active = filters.preferredGender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          preferredGender: g as 'all' | PreferredGender,
                        }))
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-white text-[#090A14] shadow-2xs'
                          : 'text-[#5C5E6B] hover:text-[#090A14]'
                      }`}
                    >
                      {g === 'all' ? 'All Gender' : g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact Area, Sort & More Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="rm-filter-loc" className="sr-only">
                Pune Area / Location
              </label>
              <select
                id="rm-filter-loc"
                value={filters.location}
                onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
                className="h-9 rounded-lg border border-[#090A14]/12 bg-white px-3 text-xs font-semibold text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
              >
                <option value="all">All Pune Areas</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <label htmlFor="rm-sort" className="sr-only">
                Sort roommate vacancies
              </label>
              <select
                id="rm-sort"
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as RoommateSortOrder,
                  }))
                }
                className="h-9 rounded-lg border border-[#090A14]/12 bg-white px-3 text-xs font-semibold text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
              >
                <option value="recent">Recently Posted</option>
                <option value="rent-asc">Lowest Rent</option>
                <option value="rent-desc">Highest Rent</option>
              </select>

              <button
                type="button"
                aria-expanded={showMoreFilters}
                onClick={() => setShowMoreFilters((prev) => !prev)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  showMoreFilters || extraFilterCount > 0
                    ? 'border-[#6B1CD4] bg-[#F7F3FD] text-[#6B1CD4]'
                    : 'border-[#090A14]/12 bg-white text-[#090A14] hover:border-[#090A14]/30'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Filters</span>
                {extraFilterCount > 0 && (
                  <span className="tabular-nums">({extraFilterCount})</span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#6B1CD4] hover:underline"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Expandable Extra Filters */}
          {showMoreFilters && (
            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#090A14]/8 pt-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label
                  htmlFor="rm-filter-room"
                  className="block text-[11px] font-medium text-[#5C5E6B]"
                >
                  Flat / Room Type
                </label>
                <select
                  id="rm-filter-room"
                  value={filters.roomType}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      roomType: e.target.value as 'all' | RoommateRoomType,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#090A14]/12 bg-white px-3 text-xs font-semibold text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
                >
                  <option value="all">All Types</option>
                  {ROOMMATE_ROOM_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="rm-filter-min"
                  className="block text-[11px] font-medium text-[#5C5E6B]"
                >
                  Min Rent (₹)
                </label>
                <input
                  id="rm-filter-min"
                  type="number"
                  min={0}
                  step={500}
                  placeholder="e.g. 2500"
                  value={filters.minBudget ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minBudget: e.target.value.trim() ? Number(e.target.value) : null,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#090A14]/12 bg-white px-3 text-xs font-medium text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="rm-filter-max"
                  className="block text-[11px] font-medium text-[#5C5E6B]"
                >
                  Max Rent (₹)
                </label>
                <input
                  id="rm-filter-max"
                  type="number"
                  min={0}
                  step={500}
                  placeholder="e.g. 6000"
                  value={filters.maxBudget ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      maxBudget: e.target.value.trim() ? Number(e.target.value) : null,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#090A14]/12 bg-white px-3 text-xs font-medium text-[#090A14] tabular-nums focus:border-[#6B1CD4] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="rm-filter-furnishing"
                  className="block text-[11px] font-medium text-[#5C5E6B]"
                >
                  Furnishing
                </label>
                <select
                  id="rm-filter-furnishing"
                  value={filters.furnishing}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      furnishing: e.target.value as 'all' | RoommateFurnishing,
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#090A14]/12 bg-white px-3 text-xs font-semibold text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
                >
                  <option value="all">Any Furnishing</option>
                  <option value="Furnished">Furnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                  <option value="Unfurnished">Unfurnished</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="rm-filter-date"
                  className="block text-[11px] font-medium text-[#5C5E6B]"
                >
                  Joining On or Before
                </label>
                <input
                  id="rm-filter-date"
                  type="date"
                  value={filters.availableFrom}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, availableFrom: e.target.value }))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#090A14]/12 bg-white px-3 text-xs font-medium text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5E6B]">
          <p>
            Showing <strong className="text-[#090A14] tabular-nums">{filteredListings.length}</strong>{' '}
            active {filteredListings.length === 1 ? 'vacancy' : 'vacancies'}
          </p>
          <p className="text-[11px] text-[#767887]">
            Verified by WithBroker before publishing
          </p>
        </div>

        {/* Results Grid / Empty State */}
        {loading && allRoommates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#6B1CD4]" />
            <p className="text-sm font-medium text-[#5C5E6B]">
              Loading verified roommate vacancies...
            </p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div
            data-testid="roommates-empty-state"
            className="mt-6 rounded-2xl border border-[#090A14]/9 bg-[#FAFAFC] px-6 py-12 text-center"
          >
            <h3 className="font-display text-lg font-bold text-[#090A14]">
              {hasActiveFilters
                ? 'No roommate vacancies match these filters'
                : 'Have a flat or room? Post your roommate vacancy'}
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#5C5E6B] sm:text-sm">
              {hasActiveFilters
                ? 'Try clearing filters or selecting another Pune locality to view available roommate openings.'
                : 'Looking for a Male or Female flatmate for a pre-occupied or new flat in Pune? Post free in 30 seconds with no login required.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#090A14]/15 bg-white px-4 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenPostRoommate({ flatOccupancy: 'Pre-Occupied Flat' })}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#090A14] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#6B1CD4]"
              >
                <BedDouble className="h-4 w-4" aria-hidden="true" />
                <span>Post Pre-Occupied Flat</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenPostRoommate({ flatOccupancy: 'New Flat' })}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#090A14]/15 bg-white px-4 text-xs font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Post New Flat</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            data-testid="roommates-grid"
            className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredListings.map((item) => {
              const occupancy = item.flatOccupancy || 'Pre-Occupied Flat';
              const hasPhoto = item.images.length > 0;
              const fullLoc = [item.publicBuildingName, item.location]
                .filter(Boolean)
                .join(', ');
              const genderHeadline =
                item.preferredGender === 'Any'
                  ? 'Roommate'
                  : `${item.preferredGender} Roommate`;
              const headline = `${item.peopleRequired} ${genderHeadline}${item.peopleRequired > 1 ? 's' : ''} Required · ${item.roomType}`;

              const visibleFacilities = (item.facilities || []).slice(0, 3);
              const extraFacCount = Math.max(0, (item.facilities || []).length - 3);

              return (
                <article
                  key={item.listingCode}
                  data-testid={`roommate-card-${item.listingCode}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#090A14]/9 bg-white transition-all duration-200 hover:border-[#090A14]/22 hover:shadow-[0_14px_30px_-16px_rgba(9,10,20,0.14)]"
                >
                  {/* Clean Visual Frame */}
                  <div className="relative h-44 w-full overflow-hidden bg-[#F3F3F7]">
                    {hasPhoto ? (
                      <button
                        type="button"
                        onClick={() => onViewDetails(item)}
                        aria-label={`View details for ${headline}`}
                        className="block h-full w-full"
                      >
                        <SafeImage
                          src={item.images[0]}
                          alt={`${headline} in ${item.location}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onViewDetails(item)}
                        className="flex h-full w-full flex-col items-start justify-end bg-[#F4F4F8] p-5 text-left"
                      >
                        <span className="text-[11px] font-semibold text-[#6B1CD4]">
                          {occupancy} · {item.furnishing}
                        </span>
                        <p className="mt-1 font-display text-base font-bold text-[#090A14]">
                          {headline}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5C5E6B]">{item.location}</p>
                      </button>
                    )}

                    {/* Minimal Top-Left Occupancy & Optional Urgent Label */}
                    <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="rounded-lg bg-[#090A14]/82 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
                        {occupancy}
                      </span>
                      {item.urgent && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#DC2626] px-2 py-1 text-[11px] font-semibold text-white">
                          <Flame className="h-3 w-3" aria-hidden="true" />
                          <span>Urgent</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    {/* Price + Code Row */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display text-[22px] font-bold tracking-[-0.015em] text-[#090A14] tabular-nums">
                          {formatINR(item.rent)}
                        </span>
                        <span className="text-xs font-medium text-[#5C5E6B]">/person</span>
                      </div>
                      <span className="text-[11px] font-medium text-[#767887] tabular-nums">
                        {item.listingCode}
                      </span>
                    </div>

                    {/* Headline & Location */}
                    <button
                      type="button"
                      onClick={() => onViewDetails(item)}
                      className="mt-1.5 text-left"
                    >
                      <h3 className="font-display text-[15px] sm:text-base font-bold leading-snug text-[#090A14] transition-colors hover:text-[#6B1CD4]">
                        {headline}
                      </h3>
                    </button>
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-[#5C5E6B]">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                      <span className="line-clamp-2">{fullLoc}</span>
                    </p>

                    {/* Clean Hairline Specs Row */}
                    <div className="mt-3.5 grid grid-cols-3 gap-2 border-y border-[#090A14]/8 py-2.5 text-left">
                      <div className="min-w-0">
                        <span className="block text-[11px] text-[#6B6D7C]">Deposit</span>
                        <p className="mt-0.5 truncate text-xs font-semibold text-[#090A14] tabular-nums">
                          {item.deposit > 0 ? formatINR(item.deposit) : 'None'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] text-[#6B6D7C]">For</span>
                        <p className="mt-0.5 truncate text-xs font-semibold text-[#090A14]">
                          {item.preferredGender}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] text-[#6B6D7C]">Electricity</span>
                        <p className="mt-0.5 truncate text-xs font-semibold text-[#090A14]">
                          {item.electricityBill || 'Shared'}
                        </p>
                      </div>
                    </div>

                    {/* Unboxed Facilities & Joining Metadata */}
                    {visibleFacilities.length > 0 && (
                      <p className="mt-3 truncate text-xs text-[#5C5E6B]">
                        {visibleFacilities.join(' · ')}
                        {extraFacCount > 0 ? ` · +${extraFacCount} more` : ''}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C5E6B]">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#090A14]">
                        <Calendar className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
                        <span>Joining {formatRoommateDate(item.availableFrom)}</span>
                      </span>
                      {item.shiftingNow && (
                        <span className="text-[11px] font-semibold text-[#15803D]">
                          Shifting Now
                        </span>
                      )}
                    </div>

                    {/* Action Row */}
                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => onViewDetails(item)}
                        className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl border border-[#090A14]/14 bg-white px-3 text-xs sm:text-[13px] font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                      >
                        Details
                      </button>

                      <a
                        href={buildRoommateWhatsAppUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#16A34A] px-3 text-xs sm:text-[13px] font-semibold text-white transition-colors hover:bg-[#15803D]"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5 text-white" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onShareListing(item)}
                        aria-label={`Share roommate vacancy ${item.listingCode}`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/14 bg-white text-[#5C5E6B] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                      >
                        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
