import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { resolveFirestorePhotoUrl } from '../lib/firestoreRepo';

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
  const isFirestorePhoto = Boolean(src && src.startsWith('fbphoto://'));
  const [resolvedSrc, setResolvedSrc] = useState<string>(isFirestorePhoto ? '' : src);
  const [loadingPhoto, setLoadingPhoto] = useState<boolean>(isFirestorePhoto);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (!src) {
      setResolvedSrc('');
      setLoadingPhoto(false);
      return;
    }

    if (!src.startsWith('fbphoto://')) {
      setResolvedSrc(src);
      setLoadingPhoto(false);
      return;
    }

    let cancelled = false;
    setLoadingPhoto(true);
    void resolveFirestorePhotoUrl(src).then((dataUrl) => {
      if (cancelled) return;
      if (!dataUrl) {
        setHasError(true);
      } else {
        setResolvedSrc(dataUrl);
      }
      setLoadingPhoto(false);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (loadingPhoto) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full animate-pulse items-center justify-center bg-[#EFEAF9]"
      >
        <Building2 className="h-7 w-7 text-[#6B1CD4]/35" strokeWidth={1.5} />
      </div>
    );
  }

  if (hasError || !resolvedSrc) {
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
      src={resolvedSrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
