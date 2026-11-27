import React from 'react';
import { ArrowRight } from 'lucide-react';
import { LocalityConfig, PropertyListing } from '../types/property';
import { getLocalityListingCount } from '../utils/propertyLogic';
import { SafeImage } from './SafeImage';

interface ExploreAreasSectionProps {
  allProperties: PropertyListing[];
  localities: LocalityConfig[];
  selectedLocation: string;
  onSelectLocation: (slug: string) => void;
}

export const ExploreAreasSection: React.FC<ExploreAreasSectionProps> = ({
  allProperties,
  localities,
  selectedLocation,
  onSelectLocation,
}) => {
  return (
    <section id="areas" className="scroll-mt-24 bg-[#F8F8FA] pt-6 pb-8 sm:pt-8 sm:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-[-0.015em] text-[#090A14] sm:text-2xl">
              Explore Flats by Neighborhood
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#5C5E6B]">
              Browse verified rental properties across popular Pune localities.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectLocation('all')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors hover:text-[#6B1CD4]"
          >
            <span className="tabular-nums">View All Areas ({allProperties.length})</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {localities.map((loc) => {
            const availCount = getLocalityListingCount(allProperties, loc);
            const totalInArea = allProperties.filter(
              (p) =>
                p.localitySlug === loc.slug || loc.matchSlugs.includes(p.localitySlug)
            ).length;
            const isSelected = selectedLocation === loc.slug;
            const displayName = loc.slug === 'other' ? 'Nearby Areas' : loc.name;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelectLocation(loc.slug)}
                className={`group flex items-center gap-3.5 rounded-xl border bg-white p-2.5 text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-[#6B1CD4] ring-1 ring-[#6B1CD4]/25'
                    : 'border-[#090A14]/9 hover:border-[#090A14]/25'
                }`}
              >
                <div className="h-14 w-18 shrink-0 overflow-hidden rounded-lg bg-[#F3F3F7]">
                  <SafeImage
                    src={loc.image}
                    alt={`${displayName} apartments`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="min-w-0 flex-1 pr-1">
                  <span className="block truncate font-display text-sm font-bold text-[#090A14] transition-colors group-hover:text-[#6B1CD4]">
                    {displayName}
                  </span>
                  <p className="mt-0.5 text-xs font-medium text-[#5C5E6B] tabular-nums">
                    {availCount} Available
                    {totalInArea > availCount ? ` · ${totalInArea - availCount} Rented` : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
