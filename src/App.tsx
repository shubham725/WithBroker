import React, { useEffect, useMemo, useState } from 'react';
import { BottomSections } from './components/BottomSections';
import { ContactModal } from './components/ContactModal';
import { ExploreAreasSection } from './components/ExploreAreasSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { PostPropertyModal } from './components/PostPropertyModal';
import { PropertyDetails } from './components/PropertyDetails';
import { PropertyGrid } from './components/PropertyGrid';
import { SharePropertyModal } from './components/SharePropertyModal';
import { FloatingWhatsAppButton } from './components/WhatsAppButton';
import { LOCALITIES, SAMPLE_PROPERTIES } from './data/properties';
import { PropertyListing, SearchFiltersState } from './types/property';
import { filterProperties, getActiveListings } from './utils/propertyLogic';

const INITIAL_FILTERS: SearchFiltersState = {
  location: 'all',
  propertyType: 'all',
  maxRent: null,
  furnishing: 'all',
  sortBy: 'featured',
  onlySaved: false,
};

const SAVED_STORAGE_KEY = 'withbroker-saved-flats';

export default function App() {
  const [filters, setFilters] = useState<SearchFiltersState>(INITIAL_FILTERS);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [shareProperty, setShareProperty] = useState<PropertyListing | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  // Listen for Google Maps Platform demo key quota events
  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Persist shortlisted flats locally
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // Ignore storage quota errors in restricted contexts
    }
  }, [savedIds]);

  // Support deep links like ?flat=wb-flat-1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const flatId = params.get('flat');
    if (flatId) {
      const found = getActiveListings(SAMPLE_PROPERTIES).find((p) => p.id === flatId);
      if (found) {
        setSelectedProperty(found);
      }
    }
  }, []);

  const filteredListings = useMemo(
    () => filterProperties(SAMPLE_PROPERTIES, filters, LOCALITIES, savedIds),
    [filters, savedIds]
  );

  const handleToggleSave = (propertyId: string) => {
    setSavedIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  const scrollToFlats = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('flats');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectArea = (slug: string) => {
    setFilters((prev) => ({ ...prev, location: slug }));
    scrollToFlats();
  };

  const handleResetHome = () => {
    setFilters(INITIAL_FILTERS);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F9F8FC] text-[#090A14]">
      {mapsQuotaExceeded && (
        <div
          role="status"
          className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 md:text-sm"
        >
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar
        onOpenPostModal={() => setPostModalOpen(true)}
        onOpenContactModal={() => setContactModalOpen(true)}
        onResetHome={handleResetHome}
      />

      <main className="flex-1">
        <HeroSection
          filters={filters}
          onFilterChange={setFilters}
          onSearchSubmit={scrollToFlats}
        />

        <ExploreAreasSection
          allProperties={SAMPLE_PROPERTIES}
          localities={LOCALITIES}
          selectedLocation={filters.location}
          onSelectLocation={handleSelectArea}
        />

        <PropertyGrid
          allProperties={SAMPLE_PROPERTIES}
          properties={filteredListings}
          localities={LOCALITIES}
          filters={filters}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          onFilterChange={setFilters}
          onResetFilters={() => setFilters(INITIAL_FILTERS)}
          onViewDetails={(property) => setSelectedProperty(property)}
          onShare={(property) => setShareProperty(property)}
        />

        <BottomSections onOpenPostModal={() => setPostModalOpen(true)} />
      </main>

      <Footer
        onResetHome={handleResetHome}
        onOpenPostModal={() => setPostModalOpen(true)}
        onOpenContactModal={() => setContactModalOpen(true)}
      />

      <FloatingWhatsAppButton />

      <PropertyDetails
        property={selectedProperty}
        isSaved={selectedProperty ? savedIds.includes(selectedProperty.id) : false}
        onToggleSave={handleToggleSave}
        onClose={() => setSelectedProperty(null)}
        onShare={(property) => setShareProperty(property)}
      />

      <SharePropertyModal
        property={shareProperty}
        onClose={() => setShareProperty(null)}
      />

      <PostPropertyModal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
      />

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onOpenPostModal={() => setPostModalOpen(true)}
      />
    </div>
  );
}
