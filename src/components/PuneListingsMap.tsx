/// <reference types="google.maps" />
import React, { useCallback, useEffect, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { Crosshair, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { PropertyListing } from '../types/property';
import { formatINR, isPropertyRentedOut } from '../utils/propertyLogic';

interface PuneListingsMapProps {
  properties: PropertyListing[];
  focusedProperty?: PropertyListing | null;
  activeAreaName?: string | null;
  onSelectProperty?: (property: PropertyListing) => void;
  heightClass?: string;
}

const PUNE_DEFAULT_CENTER = { lat: 18.5605, lng: 73.9245 };

const MapBoundsFitter: React.FC<{
  properties: PropertyListing[];
  focusedProperty?: PropertyListing | null;
}> = ({ properties, focusedProperty }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;
    if (focusedProperty) {
      map.panTo(focusedProperty.coordinates);
      map.setZoom(15);
      return;
    }
    if (properties.length === 1) {
      map.panTo(properties[0].coordinates);
      map.setZoom(15);
      return;
    }
    if (properties.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      properties.forEach((p) => bounds.extend(p.coordinates));
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }, [map, properties, focusedProperty]);

  return null;
};

interface PropertyMarkerItemProps {
  property: PropertyListing;
  isSelected: boolean;
  onSelect: (
    property: PropertyListing,
    marker: google.maps.marker.AdvancedMarkerElement
  ) => void;
}

const PropertyMarkerItem: React.FC<PropertyMarkerItemProps> = ({
  property,
  isSelected,
  onSelect,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isRentedOut = isPropertyRentedOut(property);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={property.coordinates}
      title={`${property.propertyType}${isRentedOut ? ' (Rented Out)' : ''} · ${formatINR(property.monthlyRent)} · ${property.locality}`}
      zIndex={isSelected ? 1000 : isRentedOut ? 5 : 10}
      onClick={() => {
        if (marker) {
          onSelect(property, marker);
        }
      }}
    >
      <Pin
        background={isSelected ? '#090A14' : isRentedOut ? '#71717A' : '#6B1CD4'}
        borderColor="#FFFFFF"
        glyphColor="#FFFFFF"
        scale={isSelected ? 1.15 : 1.0}
      />
    </AdvancedMarker>
  );
};

const MapNearMeControl: React.FC = () => {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleNearMe = () => {
    if (!map || typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(14);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      type="button"
      onClick={handleNearMe}
      disabled={locating}
      title="Center map on your live location"
      className="absolute right-3 bottom-6 z-10 inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#090A14]/15 bg-white/95 px-3 text-xs font-semibold text-[#090A14] shadow-md backdrop-blur-xs transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4] disabled:opacity-60"
    >
      <Crosshair className={`h-3.5 w-3.5 text-[#6B1CD4] ${locating ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>{locating ? 'Locating...' : 'Near Me'}</span>
    </button>
  );
};

interface MapCanvasProps {
  properties: PropertyListing[];
  focusedProperty?: PropertyListing | null;
  activeAreaName?: string | null;
  onSelectProperty?: (property: PropertyListing) => void;
  heightClass: string;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  properties,
  focusedProperty,
  activeAreaName,
  onSelectProperty,
  heightClass,
}) => {
  const status = useApiLoadingStatus();
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(
    focusedProperty ?? null
  );
  const [selectedMarker, setSelectedMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const handleMarkerClick = useCallback(
    (property: PropertyListing, marker: google.maps.marker.AdvancedMarkerElement) => {
      setSelectedProperty(property);
      setSelectedMarker(marker);
    },
    []
  );

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <MapDirectoryFallback
        properties={properties}
        focusedProperty={focusedProperty}
        activeAreaName={activeAreaName}
        onSelectProperty={onSelectProperty}
        heightClass={heightClass}
        reason="Interactive map tiles could not load in this environment."
      />
    );
  }

  const center = focusedProperty?.coordinates ?? properties[0]?.coordinates ?? PUNE_DEFAULT_CENTER;
  const zoom = focusedProperty ? 15 : 13.6;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-[#24212D]/12 ${heightClass}`}>
      {!focusedProperty && (
        <div className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-xl border border-[#090A14]/12 bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#090A14] shadow-sm backdrop-blur-xs">
          <MapPin className="h-3.5 w-3.5 text-[#6B1CD4]" aria-hidden="true" />
          <span>
            {activeAreaName
              ? `${properties.length} flat${properties.length === 1 ? '' : 's'} in ${activeAreaName}`
              : `${properties.length} pinned flat${properties.length === 1 ? '' : 's'} in Pune`}
          </span>
        </div>
      )}

      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="cooperative"
        disableDefaultUI={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <MapBoundsFitter properties={properties} focusedProperty={focusedProperty} />
        {!focusedProperty && <MapNearMeControl />}
        {properties.map((property) => (
          <PropertyMarkerItem
            key={property.id}
            property={property}
            isSelected={selectedProperty?.id === property.id}
            onSelect={handleMarkerClick}
          />
        ))}

        {selectedProperty && selectedMarker && (
          <InfoWindow
            anchor={selectedMarker}
            maxWidth={270}
            onCloseClick={() => {
              setSelectedProperty(null);
              setSelectedMarker(null);
            }}
          >
            <div className="p-1 text-[#24212D]">
              <p className="text-xs font-semibold text-[#6B1CD4]">
                {selectedProperty.propertyCode} · {selectedProperty.propertyType} ·{' '}
                {isPropertyRentedOut(selectedProperty) ? (
                  <span className="font-bold text-[#DC2626]">Rented Out</span>
                ) : (
                  selectedProperty.furnishing
                )}
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#090A14]">
                {selectedProperty.title}
              </p>
              <p className="mt-0.5 text-xs text-[#6E6B7B]">{selectedProperty.locality}</p>
              <p className="mt-1.5 text-sm font-bold text-[#090A14] tabular-nums">
                {formatINR(selectedProperty.monthlyRent)} / month
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                {onSelectProperty && (
                  <button
                    type="button"
                    onClick={() => onSelectProperty(selectedProperty)}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#6B1CD4] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5412AD]"
                  >
                    View Details
                  </button>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedProperty.coordinates.lat},${selectedProperty.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#090A14]/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                >
                  <Navigation className="h-3 w-3" aria-hidden="true" />
                  <span>Maps</span>
                </a>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

interface MapDirectoryFallbackProps {
  properties: PropertyListing[];
  focusedProperty?: PropertyListing | null;
  activeAreaName?: string | null;
  onSelectProperty?: (property: PropertyListing) => void;
  heightClass: string;
  reason?: string;
}

const MapDirectoryFallback: React.FC<MapDirectoryFallbackProps> = ({
  properties,
  focusedProperty,
  activeAreaName,
  onSelectProperty,
  heightClass,
  reason,
}) => {
  const list = focusedProperty ? [focusedProperty] : properties;
  return (
    <div
      className={`flex flex-col justify-between overflow-y-auto rounded-2xl border border-[#24212D]/12 bg-[#F7F5FC] p-4 sm:p-5 ${heightClass}`}
    >
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#090A14]">
          <MapPin className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
          <span>
            {activeAreaName
              ? `${activeAreaName} — Google Maps Flat Locations`
              : 'Pune Rental Flat Google Map Locations'}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#6E6B7B]">
          {reason || 'Tap any location pin below to view flat details or open directly in Google Maps.'}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {list.map((prop) => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${prop.coordinates.lat},${prop.coordinates.lng}`;
            return (
              <div
                key={prop.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#24212D]/10 bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#090A14]">
                    {prop.propertyType} · {prop.subLocality}
                    {isPropertyRentedOut(prop) && (
                      <span className="ml-1.5 font-bold text-[#DC2626]">(Rented Out)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[#6E6B7B]">
                    {formatINR(prop.monthlyRent)} / mo
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {onSelectProperty && (
                    <button
                      type="button"
                      onClick={() => onSelectProperty(prop)}
                      className="rounded-lg bg-[#6B1CD4] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5412AD]"
                    >
                      View
                    </button>
                  )}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${prop.locality} on Google Maps`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#24212D]/12 text-[#24212D] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PuneListingsMap: React.FC<PuneListingsMapProps> = ({
  properties,
  focusedProperty,
  activeAreaName,
  onSelectProperty,
  heightClass = 'h-[420px]',
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey) {
    return (
      <MapDirectoryFallback
        properties={properties}
        focusedProperty={focusedProperty}
        activeAreaName={activeAreaName}
        onSelectProperty={onSelectProperty}
        heightClass={heightClass}
      />
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['marker', 'places']} language="en" region="IN">
      <MapCanvas
        properties={properties}
        focusedProperty={focusedProperty}
        activeAreaName={activeAreaName}
        onSelectProperty={onSelectProperty}
        heightClass={heightClass}
      />
    </APIProvider>
  );
};
