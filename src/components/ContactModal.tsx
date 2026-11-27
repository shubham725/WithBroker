import React, { useEffect } from 'react';
import { MapPin, PhoneCall, PlusCircle, Users, X } from 'lucide-react';
import {
  WHATSAPP_COMMUNITY_URL,
  WHATSAPP_NUMBER_DISPLAY,
} from '../data/properties';
import { buildGeneralWhatsAppUrl } from '../utils/propertyLogic';
import { WhatsAppIcon } from './WhatsAppButton';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPostModal: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  onOpenPostModal,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#140928]/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#6B1CD4]/16 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#6B1CD4]/12 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[#6B1CD4]">WithBroker Pune</p>
            <h2
              id="contact-modal-title"
              className="font-display text-lg font-bold text-[#140A29]"
            >
              Contact &amp; Community
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact dialog"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#6B1CD4]/18 text-[#140A29] transition-colors hover:bg-[#F7F3FF] hover:text-[#6B1CD4]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hairline-Separated Body Sections */}
        <div className="divide-y divide-[#6B1CD4]/10 px-5">
          {/* Direct WhatsApp Helpdesk */}
          <div className="py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C2AE8] to-[#5F18C8] text-white">
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium text-[#544E66]">WhatsApp Helpdesk</p>
                <p className="font-display text-base font-bold text-[#140A29] tabular-nums">
                  {WHATSAPP_NUMBER_DISPLAY}
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#544E66]">
              Message us directly for flat visits, availability checks, rent &amp; brokerage details in Pune.
            </p>
            <a
              href={buildGeneralWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#5F18C8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(107,28,212,0.5)] transition-all hover:from-[#6B1CD4] hover:to-[#4E11A8]"
            >
              <WhatsAppIcon className="h-4 w-4 text-white" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>

          {/* WhatsApp Community */}
          <div className="py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A0B36] text-white">
                <Users className="h-4 w-4 text-[#D5B6FF]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium text-[#544E66]">Daily Flat Alerts</p>
                <p className="font-display text-sm font-bold text-[#140A29]">
                  WithBroker WhatsApp Group
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#544E66]">
              Join our Pune rental community for instant updates on new 1RK, 1BHK, 2BHK &amp; 3BHK flats.
            </p>
            <a
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#6B1CD4]/22 bg-white px-4 py-2.5 text-sm font-semibold text-[#140A29] transition-colors hover:border-[#6B1CD4] hover:bg-[#F7F3FF] hover:text-[#6B1CD4]"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              <span>Join WhatsApp Group</span>
            </a>
          </div>

          {/* Service Areas & Quick Post Trigger */}
          <div className="space-y-3 py-5">
            <div className="flex items-start gap-2 text-xs text-[#544E66]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
              <span>
                Serving rental flats &amp; roommates across{' '}
                <strong className="font-semibold text-[#140A29]">all of Pune, Maharashtra</strong>{' '}
                — expanding steadily to more locations.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPostModal();
              }}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#6B1CD4]/15 bg-[#F7F3FF] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#6B1CD4] transition-colors hover:bg-[#EFE5FF]"
            >
              <PlusCircle className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
              <span>Have a Flat for Rent? Post It Here</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
