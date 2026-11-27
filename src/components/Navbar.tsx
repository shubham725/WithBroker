import React, { useState } from 'react';
import { LayoutDashboard, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { WHATSAPP_NUMBER_DISPLAY, WITHBROKER_LOGO_URL } from '../data/properties';
import { buildGeneralWhatsAppUrl } from '../utils/propertyLogic';
import { WhatsAppIcon } from './WhatsAppButton';

interface NavbarProps {
  onOpenPostModal: () => void;
  onOpenPostRoommate: () => void;
  onOpenMyRoommates: () => void;
  onOpenContactModal: () => void;
  onOpenAdmin: () => void;
  onResetHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPostModal,
  onOpenPostRoommate,
  onOpenMyRoommates,
  onOpenContactModal,
  onOpenAdmin,
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
      <div className="mx-auto flex h-16 sm:h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
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
            className="h-8 sm:h-10 w-auto max-w-[152px] sm:max-w-none object-contain"
          />
        </a>

        {/* Center: Cleanly Aligned Single-Line Navigation Matching Brand Layout */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-5 xl:gap-6 text-[13.5px] font-medium text-[#3F3D4D]"
        >
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleAction(onResetHome);
            }}
            className="rounded-xl bg-[#F5EFFD] px-3.5 py-2 font-semibold text-[#6B1CD4] whitespace-nowrap shrink-0 transition-colors"
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
          <a
            href="#roommates"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('roommates');
            }}
            className="whitespace-nowrap shrink-0 py-1.5 transition-colors hover:text-[#6B1CD4]"
          >
            Roommates
          </a>
          <button
            type="button"
            onClick={() => handleAction(onOpenPostModal)}
            className="whitespace-nowrap shrink-0 rounded-xl border border-[#6B1CD4]/25 bg-[#FAF7FF] px-4 py-2 font-semibold text-[#6B1CD4] transition-colors hover:border-[#6B1CD4] hover:bg-[#F3EAFE]"
          >
            Add Your Property Free
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

        {/* Right: Admin Pill + WhatsApp Pill CTA + Mobile Menu */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="navbar-admin-btn"
            onClick={() => handleAction(onOpenAdmin)}
            aria-label="Open WithBroker Admin Dashboard"
            className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-full border border-[#090A14]/12 bg-white px-4 text-xs font-semibold text-[#3F3D4D] whitespace-nowrap shrink-0 transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Admin</span>
          </button>

          <a
            href={buildGeneralWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 sm:h-11 items-center gap-2.5 whitespace-nowrap shrink-0 rounded-full bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-150 hover:from-[#6B1CD4] hover:to-[#4E11A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
          >
            <WhatsAppIcon className="h-4 w-4 text-white" />
            <span className="hidden sm:inline leading-tight text-left">
              <span className="block text-[10px] font-medium text-white/85">WhatsApp</span>
              <span className="block text-xs font-bold tabular-nums">
                {WHATSAPP_NUMBER_DISPLAY}
              </span>
            </span>
            <span className="sm:hidden">WhatsApp</span>
          </a>

          <button
            type="button"
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#090A14]/12 text-[#090A14] transition-colors hover:bg-[#F4F4F7] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-nav-drawer"
          className="border-t border-[#090A14]/8 bg-white px-4 py-4 lg:hidden"
        >
          <div className="flex flex-col divide-y divide-[#090A14]/6 text-sm font-medium text-[#090A14]">
            <button
              type="button"
              onClick={() => handleAction(onResetHome)}
              className="flex min-h-[46px] w-full items-center px-1 text-left font-semibold text-[#6B1CD4]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('flats')}
              className="flex min-h-[46px] w-full items-center px-1 text-left hover:text-[#6B1CD4]"
            >
              Available Flats
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('areas')}
              className="flex min-h-[46px] w-full items-center px-1 text-left hover:text-[#6B1CD4]"
            >
              Areas
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('roommates')}
              className="flex min-h-[46px] w-full items-center gap-2 px-1 text-left hover:text-[#6B1CD4]"
            >
              <Users className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
              <span>Find a Roommate</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction(onOpenMyRoommates)}
              className="flex min-h-[46px] w-full items-center gap-2 px-1 text-left hover:text-[#6B1CD4]"
            >
              <LayoutDashboard className="h-4 w-4 text-[#5C5E6B]" aria-hidden="true" />
              <span>My Roommate Listings</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="flex min-h-[46px] w-full items-center px-1 text-left hover:text-[#6B1CD4]"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => handleAction(onOpenContactModal)}
              className="flex min-h-[46px] w-full items-center px-1 text-left hover:text-[#6B1CD4]"
            >
              Contact &amp; WhatsApp Group
            </button>
            <button
              type="button"
              onClick={() => handleAction(onOpenAdmin)}
              className="flex min-h-[46px] w-full items-center gap-2 px-1 text-left text-[#5C5E6B] hover:text-[#090A14]"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Admin Dashboard</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleAction(onOpenPostModal)}
              className="flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#6B1CD4] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#5412AD]"
            >
              Add Your Property Free
            </button>
            <button
              type="button"
              onClick={() => handleAction(onOpenPostRoommate)}
              className="flex min-h-[46px] w-full items-center justify-center rounded-xl border border-[#090A14]/15 bg-white px-4 text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
            >
              Post Roommate Vacancy
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
