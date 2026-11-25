/// <reference types="google.maps" />
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react';

interface LocationValue {
  location: string;
  lat: number | null;
  lng: number | null;
  locationSource: 'gps' | 'google' | 'manual';
  societyHint?: string;
}

interface LocationPickerFieldProps {
  location: string;
  lat?: number | null;
  lng?: number | null;
  locationSource?: 'gps' | 'google' | 'manual';
  error?: string;
  onChange: (next: LocationValue) => void;
}

const PUNE_CENTER = { lat: 18.5529, lng: 73.9277 };

const QUICK_PUNE_AREAS: Array<{ label: string; full: string; lat: number; lng: number }> = [
  { label: 'Viman Nagar', full: 'Viman Nagar, Pune', lat: 18.5679, lng: 73.9143 },
  { label: 'Wadgaon Sheri', full: 'Wadgaon Sheri, Pune', lat: 18.5529, lng: 73.9277 },
  { label: 'Somnath Nagar', full: 'Somnath Nagar, Wadgaon Sheri, Pune', lat: 18.5565, lng: 73.9306 },
  { label: 'Kharadi', full: 'Kharadi, Pune', lat: 18.5515, lng: 73.9475 },
  { label: 'Keshav Nagar', full: 'Keshav Nagar, Mundhwa, Pune', lat: 18.5337, lng: 73.9521 },
  { label: 'Wanowrie', full: 'Wanowrie, Pune', lat: 18.4976, lng: 73.9036 },
];

async function reverseGeocodeFallback(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat.toFixed(6)
      )}&lon=${encodeURIComponent(lng.toFixed(6))}&accept-language=en`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: {
        neighbourhood?: string;
        suburb?: string;
        city_district?: string;
        road?: string;
        city?: string;
        town?: string;
        village?: string;
      };
      display_name?: string;
    };
    const addr = data.address;
    if (addr) {
      const parts = [
        addr.road,
        addr.neighbourhood || addr.suburb || addr.city_district,
        addr.city || addr.town || addr.village || 'Pune',
      ].filter((p): p is string => Boolean(p && p.trim()));
      const unique = Array.from(new Set(parts));
      if (unique.length > 0) {
        return unique.join(', ').slice(0, 160);
      }
    }
    return data.display_name ? data.display_name.slice(0, 160) : null;
  } catch {
    return null;
  }
}

const MapPanController: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
};

interface GoogleLocationInnerProps extends LocationPickerFieldProps {
  hasGoogleKey: boolean;
}

const GoogleLocationInner: React.FC<GoogleLocationInnerProps> = ({
  location,
  lat,
  lng,
  locationSource,
  error,
  onChange,
  hasGoogleKey,
}) => {
  const placesLib = useMapsLibrary('places');
  const apiStatus = useApiLoadingStatus();
  const mapsReady =
    hasGoogleKey &&
    apiStatus !== APILoadingStatus.FAILED &&
    apiStatus !== APILoadingStatus.AUTH_FAILURE;

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const fetchSuggestions = useCallback(
    (inputText: string) => {
      if (!mapsReady || !placesLib) return;
      const trimmed = inputText.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        return;
      }

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      }

      setSearchingPlaces(true);
      placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['in'],
        locationBias: {
          center: PUNE_CENTER,
          radius: 35000,
        },
      })
        .then((res) => {
          setSuggestions(res.suggestions.slice(0, 5));
          setDropdownOpen(true);
        })
        .catch(() => {
          setSuggestions([]);
        })
        .finally(() => {
          setSearchingPlaces(false);
        });
    },
    [mapsReady, placesLib]
  );

  const handleManualInput = (value: string) => {
    setGpsError(null);
    onChange({
      location: value,
      lat: lat ?? null,
      lng: lng ?? null,
      locationSource: 'manual',
    });

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (mapsReady && placesLib) {
      debounceRef.current = window.setTimeout(() => {
        fetchSuggestions(value);
      }, 260);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!suggestion.placePrediction) return;
    setDropdownOpen(false);
    setSuggestions([]);
    setGpsError(null);

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const nextLat = place.location?.lat() ?? null;
      const nextLng = place.location?.lng() ?? null;
      const formatted =
        place.formattedAddress ||
        place.displayName ||
        suggestion.placePrediction.text.text;

      onChange({
        location: formatted.replace(/, India$/i, '').slice(0, 160),
        lat: nextLat,
        lng: nextLng,
        locationSource: 'google',
        societyHint: place.displayName || undefined,
      });

      if (nextLat !== null && nextLng !== null) {
        setShowMapPicker(true);
      }
    } catch {
      onChange({
        location: suggestion.placePrediction.text.text.slice(0, 160),
        lat: lat ?? null,
        lng: lng ?? null,
        locationSource: 'manual',
      });
    } finally {
      sessionTokenRef.current = null;
    }
  };

  const resolveCoordsToAddress = useCallback(
    async (pickedLat: number, pickedLng: number): Promise<string> => {
      // When Google Places API (New) is loaded, look up nearest locality via modern Place.searchNearby
      if (mapsReady && placesLib && typeof placesLib.Place?.searchNearby === 'function') {
        try {
          const { places } = await placesLib.Place.searchNearby({
            fields: ['displayName', 'formattedAddress', 'location'],
            locationRestriction: {
              center: { lat: pickedLat, lng: pickedLng },
              radius: 250,
            },
            maxResultCount: 1,
          });
          const nearest = places?.[0];
          const formatted = nearest?.formattedAddress
            ? nearest.formattedAddress.replace(/, India$/i, '').slice(0, 160)
            : '';
          if (formatted && /[a-zA-Z]{3,}/.test(formatted) && !/[\u0900-\u097F]/.test(formatted)) {
            return formatted;
          }
          const display = nearest?.displayName ? `${nearest.displayName}, Pune`.slice(0, 160) : '';
          if (display && /[a-zA-Z]{3,}/.test(display) && !/[\u0900-\u097F]/.test(display)) {
            return display;
          }
        } catch {
          // Fall through cleanly
        }
      }

      // Non-Google fallback (when Maps key is absent or no nearby POI match)
      const fallbackAddress = await reverseGeocodeFallback(pickedLat, pickedLng);
      if (fallbackAddress) {
        return fallbackAddress;
      }
      return `Pune (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`;
    },
    [mapsReady, placesLib]
  );

  const handleDetectLiveLocation = () => {
    setGpsError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Live GPS is not supported on this browser. Please type your area below.');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextLat = Number(pos.coords.latitude.toFixed(6));
        const nextLng = Number(pos.coords.longitude.toFixed(6));
        const resolvedAddress = await resolveCoordsToAddress(nextLat, nextLng);

        onChange({
          location: resolvedAddress,
          lat: nextLat,
          lng: nextLng,
          locationSource: 'gps',
        });
        if (mapsReady) {
          setShowMapPicker(true);
        }
        setDetectingGps(false);
      },
      (geoErr) => {
        setDetectingGps(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setGpsError(
            'Location permission denied. Allow GPS access in your browser or select/type your area below.'
          );
        } else if (geoErr.code === geoErr.TIMEOUT) {
          setGpsError('GPS took too long to respond. Please retry or type your area manually.');
        } else {
          setGpsError('Could not detect live location right now. You can type your area manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  const handleMapClick = async (nextLat: number, nextLng: number) => {
    const roundedLat = Number(nextLat.toFixed(6));
    const roundedLng = Number(nextLng.toFixed(6));
    onChange({
      location: location.trim() || `Pinned Location (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`,
      lat: roundedLat,
      lng: roundedLng,
      locationSource: 'google',
    });

    const resolvedAddress = await resolveCoordsToAddress(roundedLat, roundedLng);
    if (resolvedAddress) {
      onChange({
        location: resolvedAddress,
        lat: roundedLat,
        lng: roundedLng,
        locationSource: 'google',
      });
    }
  };

  const hasPinnedCoords = typeof lat === 'number' && typeof lng === 'number';
  const activePin = hasPinnedCoords ? { lat, lng } : PUNE_CENTER;
  const googleMapsLink = hasPinnedCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="sub-location" className="block text-xs font-semibold text-[#090A14]">
          Property Location (Google / Live GPS / Manual) *
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="detect-live-location-btn"
            onClick={handleDetectLiveLocation}
            disabled={detectingGps}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#6B1CD4] px-3 text-[11px] font-semibold text-white shadow-2xs transition-colors hover:bg-[#5412AD] disabled:opacity-60"
          >
            {detectingGps ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{detectingGps ? 'Detecting GPS...' : 'Use Live Location'}</span>
          </button>

          {mapsReady && (
            <button
              type="button"
              onClick={() => setShowMapPicker((prev) => !prev)}
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                showMapPicker
                  ? 'border-[#6B1CD4] bg-[#F5EFFD] text-[#6B1CD4]'
                  : 'border-[#090A14]/12 bg-white text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showMapPicker ? 'Hide Map' : 'Pin on Map'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search / Manual Location Input */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B1CD4]"
          aria-hidden="true"
        />
        <input
          id="sub-location"
          type="text"
          autoComplete="off"
          value={location}
          onChange={(e) => handleManualInput(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setDropdownOpen(true);
          }}
          placeholder="Search Google address or type area (e.g. Viman Nagar, Pune)"
          aria-invalid={Boolean(error)}
          className="h-11 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] pl-9 pr-9 text-sm text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
        />
        {searchingPlaces && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#6B1CD4]"
            aria-hidden="true"
          />
        )}

        {/* Google Places Autocomplete Dropdown */}
        {dropdownOpen && suggestions.length > 0 && (
          <ul
            role="listbox"
            aria-label="Google location suggestions"
            className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-[#090A14]/12 bg-white py-1 shadow-xl"
          >
            {suggestions.map((suggestion, idx) => (
              <li key={`${suggestion.placePrediction?.placeId ?? idx}`}>
                <button
                  type="button"
                  onClick={() => void handleSelectSuggestion(suggestion)}
                  className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-xs text-[#090A14] transition-colors hover:bg-[#F5EFFD]"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" aria-hidden="true" />
                  <span className="leading-snug">{suggestion.placePrediction?.text.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 1-Tap Quick Pune Areas (Super fast on mobile!) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-[#656275]">Quick Pune areas:</span>
        {QUICK_PUNE_AREAS.map((area) => {
          const isSelected = location.toLowerCase().includes(area.label.toLowerCase());
          return (
            <button
              key={area.label}
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setGpsError(null);
                onChange({
                  location: area.full,
                  lat: area.lat,
                  lng: area.lng,
                  locationSource: 'manual',
                });
              }}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                isSelected
                  ? 'border-[#6B1CD4] bg-[#6B1CD4] text-white'
                  : 'border-[#090A14]/10 bg-[#F9F8FC] text-[#524F61] hover:border-[#6B1CD4] hover:text-[#6B1CD4]'
              }`}
            >
              {area.label}
            </button>
          );
        })}
      </div>

      {/* GPS / Pinned Confirmation Bar */}
      {hasPinnedCoords && (
        <div
          data-testid="pinned-location-badge"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[11px]"
        >
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>
              {locationSource === 'gps'
                ? 'Live GPS Location Detected'
                : locationSource === 'google'
                  ? 'Google Maps Location Pinned'
                  : 'Map Area Coordinates Ready'}
              {' · '}
              <span className="tabular-nums opacity-80">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </span>
          </span>
          {googleMapsLink && (
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline hover:text-emerald-900"
            >
              <Navigation className="h-3 w-3" aria-hidden="true" />
              <span>View on Google Maps</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {gpsError && (
        <p role="alert" className="text-xs font-medium text-amber-700">
          {gpsError}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {/* Interactive Google Map Pin Picker (when Maps API key is configured) */}
      {mapsReady && showMapPicker && (
        <div className="space-y-1.5">
          <div className="h-[210px] w-full overflow-hidden rounded-xl border border-[#090A14]/12">
            <GoogleMap
              mapId="DEMO_MAP_ID"
              defaultCenter={activePin}
              defaultZoom={15}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              onClick={(ev) => {
                const clicked = ev.detail.latLng;
                if (clicked) {
                  void handleMapClick(clicked.lat, clicked.lng);
                }
              }}
            >
              <MapPanController lat={activePin.lat} lng={activePin.lng} />
              <AdvancedMarker position={activePin} title="Selected Flat Location">
                <Pin background="#6B1CD4" borderColor="#FFFFFF" glyphColor="#FFFFFF" scale={1.1} />
              </AdvancedMarker>
            </GoogleMap>
          </div>
          <p className="text-[11px] text-[#656275]">
            Tap anywhere on the map to adjust the flat&apos;s exact location pin.
          </p>
        </div>
      )}
    </div>
  );
};

export const LocationPickerField: React.FC<LocationPickerFieldProps> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey) {
    return <GoogleLocationInner {...props} hasGoogleKey={false} />;
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['marker', 'places']} language="en" region="IN">
      <GoogleLocationInner {...props} hasGoogleKey={true} />
    </APIProvider>
  );
};
