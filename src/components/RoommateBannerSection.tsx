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
      className="bg-[#F9F7FD] pt-7 pb-3 sm:pt-9 sm:pb-5"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border border-[#6B1CD4]/14 bg-gradient-to-br from-white via-white to-[#F6F0FF] p-6 shadow-[0_18px_42px_-24px_rgba(95,24,200,0.18)] sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left: Main Value Proposition & Primary Actions */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B1CD4]">
                <span>Roommate Connect</span>
                <span aria-hidden="true" className="text-[#6B1CD4]/30">
                  ·
                </span>
                <span className="font-medium text-[#544E66]">Pre-Occupied &amp; New Flats</span>
                {activeRoommateCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-[#6B1CD4]/30">
                      ·
                    </span>
                    <span className="tabular-nums text-[#140A29]">
                      {activeRoommateCount} Active{' '}
                      {activeRoommateCount === 1 ? 'Vacancy' : 'Vacancies'}
                    </span>
                  </>
                )}
              </div>

              <h2
                id="roommate-banner-heading"
                className="mt-2.5 font-display text-2xl font-bold tracking-[-0.02em] text-[#140A29] sm:text-[32px] [text-wrap:balance]"
              >
                Looking for a <span className="text-[#6B1CD4]">Room Partner</span> in Pune?
              </h2>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#544E66] sm:text-[15px]">
                Find verified Male &amp; Female roommate vacancies in pre-occupied and new flats
                across Pune — posted directly by flatmates with clear per-person rent and deposit.
              </p>

              {/* Main Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="banner-find-roommate-btn"
                  onClick={() => onScrollToRoommates()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgba(107,28,212,0.48)] transition-all duration-150 hover:from-[#6B1CD4] hover:to-[#4E11A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span>Find a Roommate</span>
                </button>

                <button
                  type="button"
                  data-testid="banner-post-requirement-btn"
                  onClick={() => onOpenPostRoommate()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#6B1CD4]/25 bg-white px-5 py-2.5 text-sm font-semibold text-[#6B1CD4] transition-colors hover:border-[#6B1CD4] hover:bg-[#F5EEFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Post Roommate Vacancy</span>
                </button>

                <button
                  type="button"
                  data-testid="banner-my-roommates-btn"
                  onClick={onOpenMyRoommates}
                  className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold text-[#544E66] transition-colors hover:text-[#6B1CD4]"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  <span>My Listings</span>
                </button>
              </div>
            </div>

            {/* Right: Clean Quick-Post Category Grid */}
            <div className="border-t border-[#6B1CD4]/12 pt-6 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-sm font-bold text-[#140A29]">
                  Have a room &amp; need a flatmate?
                </h3>
                <span className="text-[11px] font-medium text-[#6B1CD4]">Free · No login</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#544E66]">
                Post your vacancy in 30 seconds with clear per-person rent, deposit, and facilities.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
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
                    className="group flex items-center justify-between gap-2 rounded-xl border border-[#6B1CD4]/14 bg-white/90 px-3 py-2.5 text-left transition-all duration-150 hover:border-[#6B1CD4]/45 hover:bg-[#F5EEFF]"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[#140A29] group-hover:text-[#6B1CD4]">
                        {item.label}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-[#544E66]">
                        {item.sublabel}
                      </span>
                    </div>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-[#8D7FB0] transition-transform group-hover:translate-x-0.5 group-hover:text-[#6B1CD4]"
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
