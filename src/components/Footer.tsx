import React from 'react';
import { ExternalLink, MapPin, PhoneCall } from 'lucide-react';
import {
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_NUMBER_DISPLAY,
  WITHBROKER_LOGO_URL,
} from '../data/properties';
import { buildGeneralWhatsAppUrl } from '../utils/propertyLogic';

interface FooterProps {
  onResetHome: () => void;
  onOpenPostModal: () => void;
  onOpenPostRoommate: () => void;
  onOpenMyRoommates: () => void;
  onOpenContactModal: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onResetHome,
  onOpenPostModal,
  onOpenPostRoommate,
  onOpenMyRoommates,
  onOpenContactModal,
  onOpenAdmin,
}) => {
  const scrollToSection = (sectionId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="border-t border-white/8 bg-[#11121A] text-white">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 sm:pt-14">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div>
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                onResetHome();
              }}
              aria-label="WithBroker Home"
              className="inline-flex items-center rounded-xl bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <img
                src={WITHBROKER_LOGO_URL}
                alt="WithBroker — Rent, Search, Connect"
                className="h-8 w-auto object-contain"
              />
            </a>
            <p className="mt-4 text-xs leading-relaxed text-white/65">
              Hyperlocal rental apartment and roommate discovery across Viman Nagar, Wadgaon Sheri,
              Somnath Nagar, Kharadi, and Karve Nagar in Pune.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-xs font-bold tracking-wider text-white/55 uppercase">
              Explore
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-white/80">
              <li>
                <a
                  href="#home"
                  onClick={(e) => {
                    e.preventDefault();
                    onResetHome();
                  }}
                  className="transition-colors hover:text-white"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#flats"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('flats');
                  }}
                  className="transition-colors hover:text-white"
                >
                  Find Flats
                </a>
              </li>
              <li>
                <a
                  href="#roommates"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('roommates');
                  }}
                  className="transition-colors hover:text-white"
                >
                  Find a Roommate
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenContactModal}
                  className="text-left transition-colors hover:text-white"
                >
                  About Us &amp; Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Post & Manage */}
          <div>
            <h3 className="font-display text-xs font-bold tracking-wider text-white/55 uppercase">
              Listings
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-white/80">
              <li>
                <button
                  type="button"
                  onClick={onOpenPostModal}
                  className="text-left transition-colors hover:text-white"
                >
                  List Your Property Free
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenPostRoommate}
                  className="text-left transition-colors hover:text-white"
                >
                  Post Roommate Vacancy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenMyRoommates}
                  className="text-left transition-colors hover:text-white"
                >
                  My Roommate Listings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="text-left text-white/55 transition-colors hover:text-white"
                >
                  Admin Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Community */}
          <div>
            <h3 className="font-display text-xs font-bold tracking-wider text-white/55 uppercase">
              Contact
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm text-white/80">
              <li>
                <a
                  href={buildGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-white tabular-nums transition-colors hover:text-[#D5B6FF]"
                >
                  <PhoneCall className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span>{WHATSAPP_NUMBER_DISPLAY}</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-xs leading-relaxed text-white/65">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
                <span>Pune, Maharashtra, India</span>
              </li>
            </ul>

            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#6B1CD4] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5412AD]"
            >
              <span>Join WhatsApp Group</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Bottom Legal & Tagline Strip */}
        <div className="mt-10 border-t border-white/10 pt-5 pb-14 text-xs text-white/55 sm:flex sm:items-center sm:justify-between sm:pb-0">
          <p>© 2026 WithBroker. All Rights Reserved.</p>
          <p className="mt-2 font-medium tracking-wider text-white/70 sm:mt-0">
            RENT · SEARCH · CONNECT
          </p>
        </div>
      </div>
    </footer>
  );
};
