"use client";

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Leaflet's default marker icon paths assume a classic (non-bundled) asset
// layout that breaks under Next.js/webpack — pointing at the CDN copies is
// the standard workaround, and keeps this feature dependency-free (no icon
// assets to add to the build, no API key, same "free" spirit as choosing
// OpenStreetMap tiles over a paid provider).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  lat: number | null;
  lng: number | null;
  radiusMeters: number | null;
  onPick: (lat: number, lng: number) => void;
};

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

// Defaults to Kozhikode (Wanago's home region) when no coordinates are set
// yet, so the map opens somewhere useful instead of the middle of the ocean.
const DEFAULT_CENTER: [number, number] = [11.2588, 75.7804];

export default function LocationPickerMapInner({ lat, lng, radiusMeters, onPick }: Props) {
  const hasPoint = lat != null && lng != null;
  const center: [number, number] = hasPoint ? [lat, lng] : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={hasPoint ? 16 : 12} style={{ height: "280px", width: "100%", borderRadius: "12px", zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {hasPoint && (
        <>
          <Marker position={[lat, lng]} />
          {radiusMeters != null && radiusMeters > 0 && (
            <Circle center={[lat, lng]} radius={radiusMeters} pathOptions={{ color: "#16a34a", fillOpacity: 0.1 }} />
          )}
        </>
      )}
    </MapContainer>
  );
}
