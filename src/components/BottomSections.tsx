import React from 'react';
import { FileText, Home, KeyRound, Plus, Users } from 'lucide-react';
import { WHATSAPP_COMMUNITY_URL } from '../data/properties';
import { WhatsAppIcon } from './WhatsAppButton';

interface BottomSectionsProps {
  onOpenPostModal: () => void;
}

export const BottomSections: React.FC<BottomSectionsProps> = ({ onOpenPostModal }) => {
  return (
    <div className="bg-[#F9F8FC] pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl space-y-10 px-4 sm:space-y-12 sm:px-6">
        {/* Owner / Broker List Property Banner */}
        <section
          id="list-property"
          aria-labelledby="owner-banner-title"
          className="rounded-2xl border border-[#6B1CD4]/12 bg-gradient-to-r from-[#EFE6FF] via-[#F7F3FF] to-[#EEE5FF] px-5 py-5 sm:px-8 sm:py-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#6B1CD4] shadow-xs">
                <div className="relative">
                  <Home className="h-7 w-7" aria-hidden="true" />
                  <KeyRound
                    className="absolute -bottom-1 -right-1.5 h-4 w-4 text-[#C89B45]"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="hidden sm:block h-10 w-px bg-[#6B1CD4]/18" aria-hidden="true" />
              <div>
                <h2
                  id="owner-banner-title"
                  className="font-display text-lg font-bold text-[#090A14] sm:text-xl"
                >
                  Have a Flat for Rent?
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#524F61]">
                  Are you a property owner or broker? Share your property details with us and get it listed on WithBroker.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenPostModal}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wide text-white shadow-sm transition-all duration-150 hover:from-[#6B1CD4] hover:to-[#4E11A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>ADD YOUR PROPERTY FREE</span>
            </button>
          </div>
        </section>

        {/* 3-Column Platform Value Props */}
        <section id="about" aria-label="Why use WithBroker" className="py-1">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFE8FC] text-[#6B1CD4]">
                <Home className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-[#090A14]">
                  Local Rental Listings
                </h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#656275]">
                  Flats from Viman Nagar, Wadgaon Sheri, Somnath Nagar &amp; nearby areas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFE8FC] text-[#6B1CD4]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-[#090A14]">
                  Transparent Details
                </h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#656275]">
                  Rent, deposit, brokerage and all key information, clearly listed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F8EE] text-[#16A34A]">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-[#090A14]">
                  Direct Communication
                </h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#656275]">
                  Contact us instantly on WhatsApp for quick and easy assistance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dark Purple WhatsApp Community Banner */}
        <section
          aria-labelledby="community-banner-title"
          className="rounded-2xl bg-gradient-to-r from-[#2D0A5E] via-[#5312AB] to-[#6B1CD4] px-5 py-5 text-white shadow-[0_18px_40px_-16px_rgba(45,10,94,0.45)] sm:px-8 sm:py-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
                <WhatsAppIcon className="h-6 w-6" />
              </span>
              <div>
                <h2
                  id="community-banner-title"
                  className="font-display text-lg font-bold text-white sm:text-xl"
                >
                  Join the WithBroker Rental Community
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-white/80">
                  Get instant updates on newly available flats, rental properties and local opportunities.
                </p>
              </div>
            </div>

            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#5312AB] shadow-xs transition-colors duration-150 hover:bg-[#F5F1FD] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>Join WhatsApp Group</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
