import React from 'react';
import { ExternalLink, MapPin, PhoneCall, Users } from 'lucide-react';
import {
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_NUMBER_DISPLAY,
  WITHBROKER_LOGO_URL,
} from '../data/properties';
import { buildGeneralWhatsAppUrl } from '../utils/propertyLogic';

interface FooterProps {
  onResetHome: () => void;
  onOpenPostModal: () => void;
  onOpenContactModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onResetHome,
  onOpenPostModal,
  onOpenContactModal,
}) => {
  const scrollToSection = (sectionId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="bg-[#140A29] text-white">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:pt-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column with Clean White Badge Container for Cropped Logo */}
          <div>
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                onResetHome();
              }}
              aria-label="WithBroker Home"
              className="inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <img
                src={WITHBROKER_LOGO_URL}
                alt="WithBroker — Rent, Search, Connect"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </a>
            <p className="mt-3.5 text-xs leading-relaxed text-white/70">
              Hyperlocal rental apartment discovery in Viman Nagar, Wadgaon Sheri &amp; Somnath Nagar, Pune.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-sm font-bold text-white">Quick Links</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
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
                  Available Flats
                </a>
              </li>
              <li>
                <a
                  href="#areas"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('areas');
                  }}
                  className="transition-colors hover:text-white"
                >
                  Areas
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenPostModal}
                  className="text-left transition-colors hover:text-white"
                >
                  List Your Property
                </button>
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

          {/* Contact */}
          <div>
            <h3 className="font-display text-sm font-bold text-white">Contact</h3>
            <ul className="mt-3 space-y-3 text-sm text-white/80">
              <li>
                <a
                  href={buildGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-white tabular-nums transition-colors hover:text-[#C89B45]"
                >
                  <PhoneCall className="h-4 w-4 text-[#A87FF3]" aria-hidden="true" />
                  <span>{WHATSAPP_NUMBER_DISPLAY}</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-xs leading-relaxed text-white/75">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#A87FF3]" aria-hidden="true" />
                <span>Pune, Maharashtra, India</span>
              </li>
            </ul>
          </div>

          {/* WhatsApp Community */}
          <div>
            <h3 className="font-display text-sm font-bold text-white">WhatsApp Community</h3>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-white/75">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#A87FF3]" aria-hidden="true" />
              <span>Join Our Group for Latest Property Updates</span>
            </p>
            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7C2AE8] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-[#6B1CD4]"
            >
              <span>Join Group</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Bottom Legal & Tagline Strip */}
        <div className="mt-8 border-t border-white/10 pt-5 pb-14 text-xs text-white/60 sm:flex sm:items-center sm:justify-between sm:pb-0">
          <p>© 2026 WithBroker. All Rights Reserved.</p>
          <p className="mt-2 font-medium tracking-wider text-white/75 sm:mt-0">
            RENT • SEARCH • CONNECT
          </p>
        </div>
      </div>
    </footer>
  );
};
