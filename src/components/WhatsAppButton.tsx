import React from 'react';
import { buildGeneralWhatsAppUrl } from '../utils/propertyLogic';

interface WhatsAppIconProps {
  className?: string;
}

export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.516.078-1.172.109-1.891-.125-.438-.141-1-.328-1.719-.641-3.031-1.312-5-4.375-5.156-4.578-.156-.203-1.234-1.641-1.234-3.125s.781-2.219 1.063-2.516c.281-.297.609-.375.813-.375.203 0 .406 0 .578.016.188.016.438-.078.688.516.25.609.859 2.094.938 2.25.078.156.125.344.016.547-.109.203-.156.344-.313.516-.156.172-.328.391-.469.531-.156.156-.328.328-.141.656.188.328.828 1.359 1.781 2.203 1.219 1.094 2.25 1.438 2.578 1.594.328.156.516.141.703-.078.188-.219.813-.953 1.031-1.281.219-.328.438-.266.734-.156.297.109 1.891.891 2.219 1.047.328.156.547.234.625.375.078.141.078.813-.172 1.516z" />
  </svg>
);

export const FloatingWhatsAppButton: React.FC = () => {
  return (
    <a
      href={buildGeneralWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with WithBroker on WhatsApp (+91 9834626078)"
      title="Chat on WhatsApp"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#090A14] text-white shadow-lg transition-transform duration-150 hover:scale-[1.05] hover:bg-[#6B1CD4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1CD4]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">
        <WhatsAppIcon className="h-4 w-4" />
      </span>
    </a>
  );
};
