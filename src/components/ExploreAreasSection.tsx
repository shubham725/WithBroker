import React from 'react';
import { ArrowRight } from 'lucide-react';
import { LocalityConfig, PropertyListing } from '../types/property';
import { getLocalityListingCount, matchesLocality } from '../utils/propertyLogic';
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
  if (localities.length === 0) {
    return null;
  }

  return (
    <section id="areas" className="scroll-mt-24 bg-[#F9F7FD] pt-6 pb-8 sm:pt-8 sm:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-[-0.015em] text-[#140A29] sm:text-2xl">
              Explore Flats by <span className="text-[#6B1CD4]">Area</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#544E66]">
              Areas shown automatically based on live rental flats available across Pune.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectLocation('all')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#6B1CD4] transition-colors hover:text-[#5412AD]"
          >
            <span className="tabular-nums">View All Areas ({allProperties.length})</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {localities.map((loc) => {
            const availCount = getLocalityListingCount(allProperties, loc);
            const totalInArea = allProperties.filter((p) => matchesLocality(p, loc)).length;
            const isSelected = selectedLocation === loc.slug;
            const displayName = loc.slug === 'other' ? 'Other Areas' : loc.name;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelectLocation(loc.slug)}
                className={`group flex items-center gap-3.5 rounded-xl border p-2.5 text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-[#6B1CD4] bg-[#F5EEFF] shadow-[0_10px_24px_-14px_rgba(107,28,212,0.32)] ring-1 ring-[#6B1CD4]/25'
                    : 'border-[#6B1CD4]/12 bg-white hover:border-[#6B1CD4]/38 hover:shadow-[0_12px_26px_-16px_rgba(95,24,200,0.22)]'
                }`}
              >
                <div className="h-14 w-18 shrink-0 overflow-hidden rounded-lg bg-[#F1EBFC]">
                  <SafeImage
                    src={loc.image}
                    alt={`${displayName} apartments`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="min-w-0 flex-1 pr-1">
                  <span className="block truncate font-display text-sm font-bold text-[#140A29] transition-colors group-hover:text-[#6B1CD4]">
                    {displayName}
                  </span>
                  <p className="mt-0.5 text-xs font-medium text-[#544E66] tabular-nums">
                    <span className="font-semibold text-[#6B1CD4]">{availCount} Available</span>
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
