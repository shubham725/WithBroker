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
import { ExternalLink, MapPin } from 'lucide-react';
import { PropertyListing } from '../types/property';
import { formatINR, isPropertyRentedOut } from '../utils/propertyLogic';

interface PuneListingsMapProps {
  properties: PropertyListing[];
  focusedProperty?: PropertyListing | null;
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

interface MapCanvasProps {
  properties: PropertyListing[];
  focusedProperty?: PropertyListing | null;
  onSelectProperty?: (property: PropertyListing) => void;
  heightClass: string;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  properties,
  focusedProperty,
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
            maxWidth={260}
            onCloseClick={() => {
              setSelectedProperty(null);
              setSelectedMarker(null);
            }}
          >
            <div className="p-1 text-[#24212D]">
              <p className="text-xs font-semibold text-[#6B1CD4]">
                {selectedProperty.propertyType} ·{' '}
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
              {onSelectProperty && (
                <button
                  type="button"
                  onClick={() => onSelectProperty(selectedProperty)}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#6B1CD4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5412AD]"
                >
                  View Flat Details
                </button>
              )}
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
  onSelectProperty?: (property: PropertyListing) => void;
  heightClass: string;
  reason?: string;
}

const MapDirectoryFallback: React.FC<MapDirectoryFallbackProps> = ({
  properties,
  focusedProperty,
  onSelectProperty,
  heightClass,
  reason,
}) => {
  const list = focusedProperty ? [focusedProperty] : properties;
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-[#24212D]/12 bg-[#F7F5FC] p-5 ${heightClass}`}
    >
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#090A14]">
          <MapPin className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
          <span>Pune Approximate Neighborhood Locations</span>
        </div>
        <p className="mt-1 text-xs text-[#6E6B7B]">
          {reason || 'Approximate locality pins across Viman Nagar, Wadgaon Sheri & Somnath Nagar.'}
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
  onSelectProperty,
  heightClass = 'h-[420px]',
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey) {
    return (
      <MapDirectoryFallback
        properties={properties}
        focusedProperty={focusedProperty}
        onSelectProperty={onSelectProperty}
        heightClass={heightClass}
      />
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['marker']} language="en" region="IN">
      <MapCanvas
        properties={properties}
        focusedProperty={focusedProperty}
        onSelectProperty={onSelectProperty}
        heightClass={heightClass}
      />
    </APIProvider>
  );
};
