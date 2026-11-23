import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
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
import { AuthProvider } from './contexts/AuthContext';
import { LOCALITIES } from './data/properties';
import { PropertyListing, SearchFiltersState } from './types/property';
import { filterProperties } from './utils/propertyLogic';

const INITIAL_FILTERS: SearchFiltersState = {
  location: 'all',
  propertyType: 'all',
  minRent: null,
  maxRent: null,
  furnishing: 'all',
  submitterRole: 'all',
  onlyAvailable: false,
  sortBy: 'recent',
  onlySaved: false,
};

const SAVED_STORAGE_KEY = 'withbroker-saved-flats';

function isAdminHash(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hash === '#admin' ||
    window.location.pathname === '/admin'
  );
}

function WithBrokerAppContent() {
  const [view, setView] = useState<'public' | 'admin'>(() =>
    isAdminHash() ? 'admin' : 'public'
  );
  const [allProperties, setAllProperties] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const fetchPublicListings = useCallback(async () => {
    setLoadingListings(true);
    setLoadError(null);
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/properties', {
          headers: { Accept: 'application/json' },
        });
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error('Could not load available rental flats.');
        }
        const data = await res.json();
        setAllProperties(Array.isArray(data.properties) ? data.properties : []);
        setLoadingListings(false);
        return;
      } catch (err: unknown) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    setLoadError((lastErr as Error)?.message || 'Unable to load rental flats right now.');
    setLoadingListings(false);
  }, []);

  useEffect(() => {
    void fetchPublicListings();
  }, [fetchPublicListings]);

  // Sync SPA admin route with hash/popstate
  useEffect(() => {
    const syncRoute = () => {
      setView(isAdminHash() ? 'admin' : 'public');
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

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

  // Support deep links like ?flat=WB-1001
  useEffect(() => {
    if (typeof window === 'undefined' || allProperties.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const flatId = params.get('flat');
    if (flatId) {
      const found = allProperties.find(
        (p) => p.id === flatId || p.propertyCode === flatId
      );
      if (found) {
        setSelectedProperty(found);
      }
    }
  }, [allProperties]);

  const filteredListings = useMemo(
    () => filterProperties(allProperties, filters, LOCALITIES, savedIds),
    [allProperties, filters, savedIds]
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

  const openAdminDashboard = () => {
    setView('admin');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '#admin');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const openPublicWebsite = () => {
    setView('public');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    void fetchPublicListings();
  };

  if (view === 'admin') {
    return (
      <AdminDashboard
        onBackToWebsite={openPublicWebsite}
        onDataChanged={() => void fetchPublicListings()}
      />
    );
  }

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
        onOpenAdmin={openAdminDashboard}
        onResetHome={handleResetHome}
      />

      <main className="flex-1">
        <HeroSection
          filters={filters}
          onFilterChange={setFilters}
          onSearchSubmit={scrollToFlats}
          onOpenPostModal={() => setPostModalOpen(true)}
        />

        <ExploreAreasSection
          allProperties={allProperties}
          localities={LOCALITIES}
          selectedLocation={filters.location}
          onSelectLocation={handleSelectArea}
        />

        {loadError ? (
          <section id="flats" className="bg-[#F9F8FC] py-12">
            <div className="mx-auto max-w-2xl px-4 text-center">
              <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-xs">
                <h2 className="font-display text-lg font-bold text-[#090A14]">
                  Unable to Load Rental Flats
                </h2>
                <p className="mt-1.5 text-sm text-[#656275]">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void fetchPublicListings()}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#6B1CD4] px-5 text-sm font-semibold text-white hover:bg-[#5412AD]"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </section>
        ) : loadingListings && allProperties.length === 0 ? (
          <section id="flats" className="bg-[#F9F8FC] py-14">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#6B1CD4]" />
              <p className="text-sm font-medium text-[#656275]">
                Loading verified Pune rental listings...
              </p>
            </div>
          </section>
        ) : (
          <PropertyGrid
            allProperties={allProperties}
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
        )}

        <BottomSections onOpenPostModal={() => setPostModalOpen(true)} />
      </main>

      <Footer
        onResetHome={handleResetHome}
        onOpenPostModal={() => setPostModalOpen(true)}
        onOpenContactModal={() => setContactModalOpen(true)}
        onOpenAdmin={openAdminDashboard}
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

export default function App() {
  return (
    <AuthProvider>
      <WithBrokerAppContent />
    </AuthProvider>
  );
}
