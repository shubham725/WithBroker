import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { WHATSAPP_COMMUNITY_URL } from '../data/properties';
import { WhatsAppIcon } from './WhatsAppButton';

interface BottomSectionsProps {
  onOpenPostModal: () => void;
}

const VALUE_PILLARS = [
  {
    index: '01',
    title: 'Pune-Wide Live Inventory',
    description:
      'Verified rental flats and roommate openings across Pune neighborhoods, organized automatically by live availability.',
  },
  {
    index: '02',
    title: 'Transparent Terms Upfront',
    description:
      'Monthly rent, security deposit, brokerage, furnishing, and move-in dates are clearly stated on every listing before you visit.',
  },
  {
    index: '03',
    title: 'Direct WhatsApp Coordination',
    description:
      'Skip endless portal forms. Reach our local team directly on WhatsApp for quick availability checks and site visits.',
  },
];

export const BottomSections: React.FC<BottomSectionsProps> = ({ onOpenPostModal }) => {
  return (
    <div className="bg-[#F9F7FD] pt-10 pb-14 sm:pt-12 sm:pb-18">
      <div className="mx-auto max-w-7xl space-y-10 px-4 sm:space-y-14 sm:px-6">
        {/* Owner / Broker List Property Banner */}
        <section
          id="list-property"
          aria-labelledby="owner-banner-title"
          className="scroll-mt-24 rounded-2xl border border-[#6B1CD4]/16 bg-gradient-to-r from-white via-[#FBF9FF] to-[#F3EAFF] px-6 py-6 shadow-[0_16px_36px_-24px_rgba(95,24,200,0.22)] sm:px-8 sm:py-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#6B1CD4]">For Property Owners &amp; Brokers</p>
              <h2
                id="owner-banner-title"
                className="mt-1 font-display text-xl font-bold tracking-[-0.015em] text-[#140A29] sm:text-2xl"
              >
                Have a Flat Available for Rent in Pune?
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#544E66]">
                Submit your flat photos and rental details in under a minute. Listings are reviewed
                and published directly on WithBroker with zero listing fees.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenPostModal}
              className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(107,28,212,0.5)] transition-all duration-150 hover:from-[#6B1CD4] hover:to-[#4E11A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>List Your Property Free</span>
            </button>
          </div>
        </section>

        {/* Clean Editorial 3-Column Platform Proof Row */}
        <section id="about" aria-label="Why use WithBroker" className="scroll-mt-24 py-1">
          <div className="grid grid-cols-1 gap-8 border-t border-[#6B1CD4]/14 pt-8 sm:grid-cols-3">
            {VALUE_PILLARS.map((item) => (
              <div key={item.index}>
                <span className="font-display text-xs font-bold tracking-wider text-[#6B1CD4] tabular-nums">
                  {item.index}
                </span>
                <h3 className="mt-2 font-display text-base font-bold text-[#140A29]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#544E66]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Deep Royal Plum WhatsApp Community Banner */}
        <section
          aria-labelledby="community-banner-title"
          className="rounded-2xl bg-gradient-to-r from-[#1A0B36] via-[#2A1356] to-[#411982] px-6 py-6 text-white shadow-[0_22px_44px_-22px_rgba(42,19,86,0.55)] ring-1 ring-[#8B5CF6]/25 sm:px-8 sm:py-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-[0_8px_18px_-6px_rgba(37,211,102,0.55)]">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <div>
                <h2
                  id="community-banner-title"
                  className="font-display text-lg font-bold tracking-[-0.01em] text-white sm:text-xl"
                >
                  Join the WithBroker Rental Community
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#E4D9F7]">
                  Receive instant alerts when new flats and roommate vacancies go live in Pune.
                </p>
              </div>
            </div>

            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#2A1356] transition-colors duration-150 hover:bg-[#F5EEFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>Join WhatsApp Group</span>
              <ArrowRight className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
