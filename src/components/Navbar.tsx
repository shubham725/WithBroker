import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { WHATSAPP_NUMBER_DISPLAY, WITHBROKER_LOGO_URL } from '../data/properties';
import { buildGeneralWhatsAppUrl } from '../utils/propertyLogic';
import { WhatsAppIcon } from './WhatsAppButton';

interface NavbarProps {
  onOpenPostModal: () => void;
  onOpenContactModal: () => void;
  onResetHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPostModal,
  onOpenContactModal,
  onResetHome,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (typeof document === 'undefined') return;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAction = (fn: () => void) => {
    setMobileMenuOpen(false);
    fn();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#090A14]/8 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 sm:h-[74px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Cropped WithBroker Logo */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleAction(onResetHome);
          }}
          aria-label="WithBroker Home"
          className="flex items-center shrink-0 rounded-lg whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
        >
          <img
            src={WITHBROKER_LOGO_URL}
            alt="WithBroker — Rent, Search, Connect"
            className="h-9 sm:h-11 w-auto max-w-[172px] sm:max-w-none object-contain"
          />
        </a>

        {/* Center: Clean 5-Item Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#524F61]"
        >
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleAction(onResetHome);
            }}
            className="relative rounded-lg bg-[#F5EFFD] px-3 py-1.5 font-semibold text-[#6B1CD4] whitespace-nowrap shrink-0 transition-colors"
          >
            Home
          </a>
          <a
            href="#flats"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('flats');
            }}
            className="whitespace-nowrap shrink-0 py-1.5 transition-colors hover:text-[#6B1CD4]"
          >
            Available Flats
          </a>
          <a
            href="#areas"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('areas');
            }}
            className="whitespace-nowrap shrink-0 py-1.5 transition-colors hover:text-[#6B1CD4]"
          >
            Areas
          </a>
          <button
            type="button"
            onClick={() => handleAction(onOpenPostModal)}
            className="whitespace-nowrap shrink-0 py-1.5 transition-colors hover:text-[#6B1CD4]"
          >
            List Your Property
          </button>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('about');
            }}
            className="whitespace-nowrap shrink-0 py-1.5 transition-colors hover:text-[#6B1CD4]"
          >
            About
          </a>
        </nav>

        {/* Right: WhatsApp CTA + Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={buildGeneralWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 sm:h-11 items-center gap-2 whitespace-nowrap shrink-0 rounded-full bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-150 hover:from-[#6B1CD4] hover:to-[#4E11A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
          >
            <WhatsAppIcon className="h-4 w-4 text-white" />
            <span className="hidden sm:inline leading-tight text-left">
              <span className="block text-[10px] font-medium text-white/80">WhatsApp</span>
              <span className="block text-xs font-semibold tabular-nums">
                {WHATSAPP_NUMBER_DISPLAY}
              </span>
            </span>
            <span className="sm:hidden">WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#090A14]/12 text-[#090A14] transition-colors hover:bg-[#F9F8FC] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#090A14]/8 bg-white px-4 py-3.5 lg:hidden">
          <div className="flex flex-col gap-1.5 text-sm font-semibold text-[#090A14]">
            <button
              type="button"
              onClick={() => handleAction(onResetHome)}
              className="flex min-h-[44px] w-full items-center rounded-xl bg-[#F5EFFD] px-3.5 text-left text-[#6B1CD4]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('flats')}
              className="flex min-h-[44px] w-full items-center rounded-xl px-3.5 text-left hover:bg-[#F9F8FC]"
            >
              Available Flats
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('areas')}
              className="flex min-h-[44px] w-full items-center rounded-xl px-3.5 text-left hover:bg-[#F9F8FC]"
            >
              Areas
            </button>
            <button
              type="button"
              onClick={() => handleAction(onOpenPostModal)}
              className="flex min-h-[44px] w-full items-center rounded-xl px-3.5 text-left hover:bg-[#F9F8FC]"
            >
              List Your Property
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="flex min-h-[44px] w-full items-center rounded-xl px-3.5 text-left hover:bg-[#F9F8FC]"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => handleAction(onOpenContactModal)}
              className="flex min-h-[44px] w-full items-center rounded-xl border border-[#090A14]/10 bg-[#F9F8FC] px-3.5 text-left text-[#6B1CD4]"
            >
              Contact &amp; WhatsApp Group
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
