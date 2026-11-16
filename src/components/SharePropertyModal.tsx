import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Mail, MessageSquare, Send, Share2, X } from 'lucide-react';
import { WEBSITE_URL } from '../data/properties';
import { PropertyListing } from '../types/property';
import {
  buildEmailSharePostUrl,
  buildPropertyShareText,
  buildSmsSharePostUrl,
  buildTelegramSharePostUrl,
  buildWhatsAppSharePostUrl,
  getPropertyDirectUrl,
} from '../utils/propertyLogic';
import { WhatsAppIcon } from './WhatsAppButton';

interface SharePropertyModalProps {
  property: PropertyListing | null;
  onClose: () => void;
}

export const SharePropertyModal: React.FC<SharePropertyModalProps> = ({
  property,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setCopied(false);
    setShareFeedback(null);
  }, [property?.id]);

  useEffect(() => {
    if (!property) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [property, onClose]);

  if (!property) return null;

  const propertyUrl = getPropertyDirectUrl(WEBSITE_URL, property.id);
  const shareText = buildPropertyShareText(property, propertyUrl);
  const whatsAppShareUrl = buildWhatsAppSharePostUrl(shareText);
  const telegramShareUrl = buildTelegramSharePostUrl(shareText, propertyUrl);
  const smsShareUrl = buildSmsSharePostUrl(shareText);
  const emailShareUrl = buildEmailSharePostUrl(property, shareText);

  const handleCopyText = async () => {
    let didCopy = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        didCopy = true;
      } catch {
        didCopy = false;
      }
    }

    if (!didCopy && textareaRef.current) {
      try {
        textareaRef.current.focus();
        textareaRef.current.select();
        textareaRef.current.setSelectionRange(0, shareText.length);
        didCopy = document.execCommand('copy');
      } catch {
        didCopy = false;
      }
    }

    if (didCopy) {
      setCopied(true);
      setShareFeedback('Advertisement copied to clipboard.');
      setTimeout(() => setCopied(false), 2500);
    } else {
      setShareFeedback('Select and copy the formatted advertisement text above.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${property.propertyType} Flat for Rent in ${property.locality}`,
          text: shareText,
          url: propertyUrl,
        });
        setShareFeedback('Shared via your device share sheet.');
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
      }
    }
    await handleCopyText();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-3 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#090A14]/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#090A14]/8 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6B1CD4]">Ready-to-Send Listing</p>
            <h2
              id="share-modal-title"
              className="font-display text-base sm:text-lg font-bold text-[#090A14]"
            >
              Share Property Text Post
            </h2>
            <p className="truncate text-xs text-[#656275]">
              Includes Website & WhatsApp Group link for {property.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 text-[#090A14] transition-colors hover:bg-[#F9F8FC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <label htmlFor="share-post-preview" className="sr-only">
            Formatted property advertisement text
          </label>
          <textarea
            ref={textareaRef}
            id="share-post-preview"
            readOnly
            value={shareText}
            rows={15}
            className="w-full resize-none rounded-xl border border-[#090A14]/10 bg-[#F9F8FC] p-4 font-sans text-xs sm:text-[13px] leading-relaxed text-[#090A14] focus:border-[#6B1CD4] focus:outline-none"
          />

          {shareFeedback && (
            <p role="status" className="mt-2.5 text-xs font-medium text-[#6B1CD4]">
              {shareFeedback}
            </p>
          )}

          {/* Multi-Channel Share Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <a
              href={whatsAppShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#6B1CD4] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-[#5412AD]"
            >
              <WhatsAppIcon className="h-4 w-4 text-white" />
              <span>WhatsApp</span>
            </a>

            <a
              href={telegramShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#229ED9] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-[#1B87BB]"
            >
              <Send className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              <span>Telegram</span>
            </a>

            <a
              href={smsShareUrl}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#090A14]/15 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span>SMS / Text</span>
            </a>

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#090A14]/15 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <a
              href={emailShareUrl}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#090A14]/15 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span>Email</span>
            </a>

            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#090A14]/15 bg-[#F9F8FC] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>More Apps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
