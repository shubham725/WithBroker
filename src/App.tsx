import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, X } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { BottomSections } from './components/BottomSections';
import { ContactModal } from './components/ContactModal';
import { ExploreAreasSection } from './components/ExploreAreasSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { MyRoommateDashboardModal } from './components/MyRoommateDashboardModal';
import { Navbar } from './components/Navbar';
import { PostPropertyModal } from './components/PostPropertyModal';
import { PostRoommateModal } from './components/PostRoommateModal';
import { PropertyDetails } from './components/PropertyDetails';
import { PropertyGrid } from './components/PropertyGrid';
import { RoommateBannerSection } from './components/RoommateBannerSection';
import { RoommateDetailModal } from './components/RoommateDetailModal';
import { RoommateSection } from './components/RoommateSection';
import { SharePropertyModal } from './components/SharePropertyModal';
import { FloatingWhatsAppButton } from './components/WhatsAppButton';
import { AuthProvider } from './contexts/AuthContext';
import {
  buildDynamicLocalities,
  subscribePublicProperties,
} from './lib/firestoreRepo';
import { subscribePublicRoommates } from './lib/roommateRepo';
import { PropertyListing, SearchFiltersState } from './types/property';
import type {
  PreferredGender,
  PublicRoommateListing,
  RoommateFlatOccupancy,
  RoommateListingRecord,
} from './types/roommate';
import { filterProperties } from './utils/propertyLogic';
import {
  buildRoommateShareText,
  buildRoommateShareWhatsAppUrl,
} from './utils/roommateLogic';
import {
  applyClientDocumentMetadata,
  parseAppRoute,
} from './utils/seoMetadata';

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

function readBrowserRoute() {
  if (typeof window === 'undefined') {
    return parseAppRoute('/', '', '');
  }
  return parseAppRoute(
    window.location.pathname,
    window.location.search,
    window.location.hash
  );
}

function WithBrokerAppContent() {
  const initialRoute = useMemo(() => readBrowserRoute(), []);

  const [view, setView] = useState<'public' | 'admin' | 'owner-form'>(() => initialRoute.view);
  const [requestedPropertyId, setRequestedPropertyId] = useState<string | null>(
    () => initialRoute.propertyId
  );
  const [routeNotice, setRouteNotice] = useState<string | null>(() =>
    initialRoute.isUnknownRoute
      ? `We couldn't find "${initialRoute.originalPath}" — showing all available Pune rental flats.`
      : null
  );
  const [allProperties, setAllProperties] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Roommate Connect live public state
  const [allRoommates, setAllRoommates] = useState<PublicRoommateListing[]>([]);
  const [loadingRoommates, setLoadingRoommates] = useState(true);
  const [selectedRoommate, setSelectedRoommate] = useState<PublicRoommateListing | null>(null);
  const [postRoommateOpen, setPostRoommateOpen] = useState(() =>
    Boolean(initialRoute.openPostRoommateModal)
  );
  const [postRoommatePreset, setPostRoommatePreset] = useState<{
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
  } | null>(null);
  const [roommateFilterPreset, setRoommateFilterPreset] = useState<{
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
    ts: number;
  } | null>(null);
  const [editingRoommate, setEditingRoommate] = useState<RoommateListingRecord | null>(null);
  const [myRoommatesOpen, setMyRoommatesOpen] = useState(() =>
    Boolean(initialRoute.openMyRoommatesModal)
  );
  const [userRoommateCache, setUserRoommateCache] = useState<RoommateListingRecord[]>([]);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const [filters, setFilters] = useState<SearchFiltersState>(INITIAL_FILTERS);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [shareProperty, setShareProperty] = useState<PropertyListing | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(() => initialRoute.openPostModal);
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

  const [refreshKey, setRefreshKey] = useState(0);

  const triggerPublicRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const showShareToast = useCallback((message: string) => {
    setShareToast(message);
    window.setTimeout(() => {
      setShareToast((prev) => (prev === message ? null : prev));
    }, 3500);
  }, []);

  useEffect(() => {
    setLoadingListings(true);
    setLoadError(null);
    const unsubscribe = subscribePublicProperties(
      (listings) => {
        setAllProperties(listings);
        setLoadError(null);
        setLoadingListings(false);
      },
      () => {
        setLoadingListings(false);
      }
    );
    return () => unsubscribe();
  }, [refreshKey]);

  useEffect(() => {
    setLoadingRoommates(true);
    const unsubscribe = subscribePublicRoommates(
      (listings) => {
        setAllRoommates(listings);
        setLoadingRoommates(false);
      },
      () => {
        setLoadingRoommates(false);
      }
    );
    return () => unsubscribe();
  }, [refreshKey]);

  // Normalize unknown 404 paths gracefully back to "/" on initial load, or scroll to roommates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initialRoute.isUnknownRoute) {
      window.history.replaceState(null, '', '/');
    } else if (initialRoute.scrollToRoommates) {
      window.setTimeout(() => {
        const el = document.getElementById('roommates');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }, [initialRoute]);

  // Sync SPA routes (including /property/:id, /admin, /owner-add-property, roommate paths, and 404 fallback)
  useEffect(() => {
    const syncRoute = () => {
      const next = readBrowserRoute();
      setView(next.view);
      setRequestedPropertyId(next.propertyId);
      if (!next.propertyId) {
        setSelectedProperty(null);
      }
      if (next.openPostModal) {
        setPostModalOpen(true);
      }
      if (next.openPostRoommateModal) {
        setEditingRoommate(null);
        setPostRoommatePreset(null);
        setPostRoommateOpen(true);
      }
      if (next.openMyRoommatesModal) {
        setMyRoommatesOpen(true);
      }
      if (next.scrollToRoommates) {
        const el = document.getElementById('roommates');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (next.isUnknownRoute) {
        setRouteNotice(
          `We couldn't find "${next.originalPath}" — showing all available Pune rental flats.`
        );
        window.history.replaceState(null, '', '/');
      }
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

  // Resolve /property/:id and ?flat=:id deep links cleanly; redirect gracefully if listing does not exist
  useEffect(() => {
    if (!requestedPropertyId) return;
    const targetLower = requestedPropertyId.trim().toLowerCase();
    const found = allProperties.find(
      (p) =>
        p.propertyCode.toLowerCase() === targetLower ||
        p.id.toLowerCase() === targetLower
    );

    if (found) {
      setSelectedProperty(found);
      setRouteNotice(null);
      if (typeof window !== 'undefined' && window.location.search.includes('flat=')) {
        const canonicalPath = `/property/${encodeURIComponent(found.propertyCode || found.id)}`;
        window.history.replaceState(null, '', canonicalPath);
      }
      return;
    }

    if (!loadingListings) {
      setSelectedProperty(null);
      setRequestedPropertyId(null);
      setRouteNotice(
        `Property "${requestedPropertyId}" is no longer available — browse similar Pune rental flats below.`
      );
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [requestedPropertyId, allProperties, loadingListings]);

  // Dynamically update document.title, OpenGraph tags, Twitter Card, canonical URL, and JSON-LD
  useEffect(() => {
    applyClientDocumentMetadata(view === 'public' ? selectedProperty : null, view);
  }, [selectedProperty, view]);

  const handleOpenPropertyDetails = (property: PropertyListing) => {
    const code = property.propertyCode || property.id;
    setSelectedProperty(property);
    setRequestedPropertyId(code);
    setRouteNotice(null);
    if (typeof window !== 'undefined') {
      const targetPath = `/property/${encodeURIComponent(code)}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  const handleClosePropertyDetails = () => {
    setSelectedProperty(null);
    setRequestedPropertyId(null);
    if (typeof window !== 'undefined') {
      if (
        window.location.pathname.startsWith('/property/') ||
        window.location.search.includes('flat=')
      ) {
        window.history.replaceState(null, '', '/');
      }
    }
  };

  const dynamicLocalities = useMemo(
    () => buildDynamicLocalities(allProperties),
    [allProperties]
  );

  const filteredListings = useMemo(
    () => filterProperties(allProperties, filters, dynamicLocalities, savedIds),
    [allProperties, filters, dynamicLocalities, savedIds]
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

  const scrollToRoommates = (preset?: {
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
  }) => {
    if (preset) {
      setRoommateFilterPreset({ ...preset, ts: Date.now() });
    }
    if (typeof document === 'undefined') return;
    const el = document.getElementById('roommates');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenPostRoommate = (preset?: {
    flatOccupancy?: RoommateFlatOccupancy;
    preferredGender?: PreferredGender;
  }) => {
    setEditingRoommate(null);
    setPostRoommatePreset(preset ?? null);
    setPostRoommateOpen(true);
  };

  const handleEditMyRoommate = (listing: RoommateListingRecord) => {
    setMyRoommatesOpen(false);
    setEditingRoommate(listing);
    setPostRoommatePreset({
      flatOccupancy: listing.flatOccupancy,
      preferredGender: listing.preferredGender,
    });
    setPostRoommateOpen(true);
  };

  const handleShareRoommateListing = async (listing: PublicRoommateListing) => {
    const text = buildRoommateShareText(listing);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `WithBroker Roommate Listing (${listing.listingCode})`,
          text,
        });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showShareToast(
          `Roommate post (${listing.listingCode}) copied! Paste it into WhatsApp or Telegram.`
        );
        return;
      }
    } catch {
      // Fallback to WhatsApp share link below
    }
    const waShareUrl = buildRoommateShareWhatsAppUrl(listing);
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = waShareUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
  };

  const handleHeroSearchSubmit = () => {
    setFilters((prev) => ({ ...prev, onlyAvailable: true }));
    scrollToFlats();
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
    triggerPublicRefresh();
  };

  if (view === 'admin') {
    return (
      <AdminDashboard
        onBackToWebsite={openPublicWebsite}
        onDataChanged={triggerPublicRefresh}
      />
    );
  }

  if (view === 'owner-form') {
    return (
      <PostPropertyModal
        isOpen={true}
        ownerOnly={true}
        standalone={true}
        onClose={openPublicWebsite}
        onSubmitted={triggerPublicRefresh}
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

      {routeNotice && (
        <div
          role="status"
          data-testid="spa-route-notice"
          className="border-b border-[#6B1CD4]/20 bg-[#F5EFFD] px-4 py-2.5 text-center text-xs font-medium text-[#3B0F7A] sm:text-sm"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3">
            <span>{routeNotice}</span>
            <button
              type="button"
              onClick={() => setRouteNotice(null)}
              aria-label="Dismiss notice"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#5412AD] transition-colors hover:bg-[#6B1CD4]/15"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {shareToast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 shadow-lg sm:text-sm"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{shareToast}</span>
        </div>
      )}

      <Navbar
        onOpenPostModal={() => setPostModalOpen(true)}
        onOpenPostRoommate={() => handleOpenPostRoommate()}
        onOpenMyRoommates={() => setMyRoommatesOpen(true)}
        onOpenContactModal={() => setContactModalOpen(true)}
        onOpenAdmin={openAdminDashboard}
        onResetHome={handleResetHome}
      />

      <main className="flex-1">
        <HeroSection
          filters={filters}
          localities={dynamicLocalities}
          onFilterChange={setFilters}
          onSearchSubmit={handleHeroSearchSubmit}
          onOpenPostModal={() => setPostModalOpen(true)}
        />

        <RoommateBannerSection
          activeRoommateCount={allRoommates.length}
          onScrollToRoommates={scrollToRoommates}
          onOpenPostRoommate={handleOpenPostRoommate}
          onOpenMyRoommates={() => setMyRoommatesOpen(true)}
        />

        <ExploreAreasSection
          allProperties={allProperties}
          localities={dynamicLocalities}
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
                  onClick={triggerPublicRefresh}
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
            localities={dynamicLocalities}
            filters={filters}
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
            onFilterChange={setFilters}
            onResetFilters={() => setFilters(INITIAL_FILTERS)}
            onViewDetails={handleOpenPropertyDetails}
            onShare={(property) => setShareProperty(property)}
          />
        )}

        <RoommateSection
          allRoommates={allRoommates}
          loading={loadingRoommates}
          externalFilterPreset={roommateFilterPreset}
          onViewDetails={(listing) => setSelectedRoommate(listing)}
          onShareListing={(listing) => void handleShareRoommateListing(listing)}
          onOpenPostRoommate={handleOpenPostRoommate}
          onOpenMyRoommates={() => setMyRoommatesOpen(true)}
        />

        <BottomSections onOpenPostModal={() => setPostModalOpen(true)} />
      </main>

      <Footer
        onResetHome={handleResetHome}
        onOpenPostModal={() => setPostModalOpen(true)}
        onOpenPostRoommate={() => handleOpenPostRoommate()}
        onOpenMyRoommates={() => setMyRoommatesOpen(true)}
        onOpenContactModal={() => setContactModalOpen(true)}
        onOpenAdmin={openAdminDashboard}
      />

      <FloatingWhatsAppButton />

      <PropertyDetails
        property={selectedProperty}
        isSaved={selectedProperty ? savedIds.includes(selectedProperty.id) : false}
        onToggleSave={handleToggleSave}
        onClose={handleClosePropertyDetails}
        onShare={(property) => setShareProperty(property)}
      />

      <SharePropertyModal
        property={shareProperty}
        onClose={() => setShareProperty(null)}
      />

      <PostPropertyModal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        onSwitchToRoommateForm={() => {
          setPostModalOpen(false);
          handleOpenPostRoommate();
        }}
      />

      <RoommateDetailModal
        listing={selectedRoommate}
        onClose={() => setSelectedRoommate(null)}
      />

      <PostRoommateModal
        isOpen={postRoommateOpen}
        initialFlatOccupancy={postRoommatePreset?.flatOccupancy ?? null}
        initialPreferredGender={postRoommatePreset?.preferredGender ?? null}
        editingListing={editingRoommate}
        existingUserListings={userRoommateCache}
        onSwitchToPropertyForm={() => {
          setPostRoommateOpen(false);
          setEditingRoommate(null);
          setPostRoommatePreset(null);
          setPostModalOpen(true);
        }}
        onClose={() => {
          setPostRoommateOpen(false);
          setEditingRoommate(null);
          setPostRoommatePreset(null);
        }}
        onSuccess={triggerPublicRefresh}
      />

      <MyRoommateDashboardModal
        isOpen={myRoommatesOpen}
        onClose={() => setMyRoommatesOpen(false)}
        onCreateNew={() => {
          setMyRoommatesOpen(false);
          handleOpenPostRoommate();
        }}
        onEditListing={handleEditMyRoommate}
        onUserListingsLoaded={setUserRoommateCache}
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
