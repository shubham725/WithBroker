import React from 'react';
import { ArrowRight, LayoutDashboard, Plus, Search } from 'lucide-react';
import type { PreferredGender, RoommateFlatOccupancy } from '../types/roommate';

interface RoommateBannerSectionProps {
  activeRoommateCount: number;
  onScrollToRoommates: (preset?: {
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
  }) => void;
  onOpenPostRoommate: (preset?: {
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
  }) => void;
  onOpenMyRoommates: () => void;
}

const QUICK_POST_PRESETS: Array<{
  label: string;
  sublabel: string;
  flatOccupancy: RoommateFlatOccupancy;
  preferredGender: PreferredGender;
}> = [
  {
    label: 'Pre-Occupied Flat',
    sublabel: 'Male Roommate',
    flatOccupancy: 'Pre-Occupied Flat',
    preferredGender: 'Male',
  },
  {
    label: 'Pre-Occupied Flat',
    sublabel: 'Female Roommate',
    flatOccupancy: 'Pre-Occupied Flat',
    preferredGender: 'Female',
  },
  {
    label: 'New Flat',
    sublabel: 'Male Roommate',
    flatOccupancy: 'New Flat',
    preferredGender: 'Male',
  },
  {
    label: 'New Flat',
    sublabel: 'Female Roommate',
    flatOccupancy: 'New Flat',
    preferredGender: 'Female',
  },
];

export const RoommateBannerSection: React.FC<RoommateBannerSectionProps> = ({
  activeRoommateCount,
  onScrollToRoommates,
  onOpenPostRoommate,
  onOpenMyRoommates,
}) => {
  return (
    <section
      aria-labelledby="roommate-banner-heading"
      className="bg-[#F8F8FA] pt-7 pb-3 sm:pt-9 sm:pb-5"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border border-[#090A14]/10 bg-white p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left: Main Value Proposition & Primary Actions */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B1CD4]">
                <span>Roommate Connect</span>
                <span aria-hidden="true" className="text-[#090A14]/20">
                  ·
                </span>
                <span className="font-medium text-[#5C5E6B]">Pre-Occupied &amp; New Flats</span>
                {activeRoommateCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-[#090A14]/20">
                      ·
                    </span>
                    <span className="tabular-nums text-[#090A14]">
                      {activeRoommateCount} Active{' '}
                      {activeRoommateCount === 1 ? 'Vacancy' : 'Vacancies'}
                    </span>
                  </>
                )}
              </div>

              <h2
                id="roommate-banner-heading"
                className="mt-2.5 font-display text-2xl font-bold tracking-[-0.02em] text-[#090A14] sm:text-[32px] [text-wrap:balance]"
              >
                Looking for a Room Partner in Pune?
              </h2>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#525563] sm:text-[15px]">
                Find verified Male &amp; Female roommate vacancies in pre-occupied and new flats
                across Karve Nagar, Kothrud, Viman Nagar, Wadgaon Sheri, and Kharadi.
              </p>

              {/* Main Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="banner-find-roommate-btn"
                  onClick={() => onScrollToRoommates()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#090A14] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#232533] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#090A14]"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span>Find a Roommate</span>
                </button>

                <button
                  type="button"
                  data-testid="banner-post-requirement-btn"
                  onClick={() => onOpenPostRoommate()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#090A14]/15 bg-white px-5 py-2.5 text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Post Roommate Vacancy</span>
                </button>

                <button
                  type="button"
                  data-testid="banner-my-roommates-btn"
                  onClick={onOpenMyRoommates}
                  className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold text-[#5C5E6B] transition-colors hover:text-[#090A14]"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  <span>My Listings</span>
                </button>
              </div>
            </div>

            {/* Right: Clean Quick-Post Category Grid */}
            <div className="border-t border-[#090A14]/8 pt-6 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-sm font-bold text-[#090A14]">
                  Have a room &amp; need a flatmate?
                </h3>
                <span className="text-[11px] font-medium text-[#5C5E6B]">Free · No login</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#5C5E6B]">
                Post your vacancy in 30 seconds with clear per-person rent, deposit, and facilities.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {QUICK_POST_PRESETS.map((item) => (
                  <button
                    key={`${item.flatOccupancy}-${item.preferredGender}`}
                    type="button"
                    onClick={() =>
                      onOpenPostRoommate({
                        flatOccupancy: item.flatOccupancy,
                        preferredGender: item.preferredGender,
                      })
                    }
                    className="group flex items-center justify-between gap-2 rounded-xl border border-[#090A14]/10 bg-[#F8F8FA] px-3 py-2.5 text-left transition-colors hover:border-[#6B1CD4]/40 hover:bg-[#F6F2FD]"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[#090A14]">
                        {item.label}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-[#5C5E6B]">
                        {item.sublabel}
                      </span>
                    </div>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-[#8D90A0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#6B1CD4]"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  data-testid="banner-have-room-btn"
                  onClick={() => onOpenPostRoommate()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B1CD4] transition-colors hover:text-[#5412AD]"
                >
                  <span>Post Available Room</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
