import React from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
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
    <section id="areas" className="bg-[#F9F8FC] pt-4 pb-8 sm:pt-6 sm:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#090A14] sm:text-2xl">
              Explore Flats by <span className="text-[#6B1CD4]">Location</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#656275]">
              Discover approved rental properties automatically organized by Pune area.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectLocation('all')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors hover:text-[#6B1CD4]"
          >
            <span>View All Areas ({allProperties.length})</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {localities.map((loc) => {
            const availCount = getLocalityListingCount(allProperties, loc);
            const totalInArea = allProperties.filter(
              (p) =>
                p.localitySlug === loc.slug ||
                loc.matchSlugs.includes(p.localitySlug)
            ).length;
            const isSelected = selectedLocation === loc.slug;
            const displayName = loc.slug === 'other' ? 'Nearby Areas' : loc.name;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelectLocation(loc.slug)}
                className={`group flex items-center gap-3 rounded-2xl border bg-white p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#6B1CD4]/40 hover:shadow-[0_14px_32px_-16px_rgba(95,24,200,0.18)] ${
                  isSelected
                    ? 'border-[#6B1CD4] ring-1 ring-[#6B1CD4]/25'
                    : 'border-[#090A14]/8'
                }`}
              >
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F3F0FA]">
                  <SafeImage
                    src={loc.image}
                    alt={`${displayName} apartments`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                    <span className="truncate font-display text-sm font-bold text-[#090A14]">
                      {displayName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-[#656275] tabular-nums">
                    {availCount} Available
                    {totalInArea > availCount ? ` · ${totalInArea - availCount} Rented` : ''}
                  </p>
                </div>

                <span className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5F1FD] text-[#6B1CD4] transition-colors group-hover:bg-[#6B1CD4] group-hover:text-white">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
