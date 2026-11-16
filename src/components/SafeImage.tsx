import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'h-full w-full object-cover',
  eager = false,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full flex-col items-center justify-center bg-[#F7F5FC] px-4 text-center text-[#6E6B7B]"
      >
        <Building2 className="mb-2 h-8 w-8 text-[#6B1CD4]/50" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#090A14] line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
