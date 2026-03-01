"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as any).src ?? markerIcon2x,
  iconUrl: (markerIcon as any).src ?? markerIcon,
  shadowUrl: (markerShadow as any).src ?? markerShadow,
});

// Helper component to handle map panning
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], 15);
  return null;
}

const COORDS_BY_LOCATION: Record<string, { lat: number; lng: number }> = {
  Aldrich: { lat: 33.6461, lng: -117.8427 },
  "Plaza Verde": { lat: 33.647992890412965, lng: -117.82901779024394 },
  "Plaza Verde II": { lat: 33.64877726944328, lng: -117.82681344173186 },
  "VDC Norte": { lat: 33.64693005928019, lng: -117.82366410112326 },
  "Camino Del Sol": { lat: 33.644715041285316, lng: -117.82489791720157 },
  "Vista Del Campo": { lat: 33.64034735896951, lng: -117.8240181526251 },
  "Puerta Del Sol": { lat: 33.64821720903248, lng: -117.83215642142689 },
  "Cornell Court": { lat: 33.648771010152096, lng: -117.83423791741171 },
  "Columbia Court": { lat: 33.65193829556482, lng: -117.82828514111182 },
  "Stanford Court": { lat: 33.65327800948177, lng: -117.84052185345652 },
  "Dartmouth Court": { lat: 33.65197430512281, lng: -117.83753731051367 },
  "Berkeley Court": { lat: 33.649034017585585, lng: -117.83711056962204 },
  "Harvard Court": { lat: 33.65035828928843, lng: -117.83456518556835 },
};

export type ResultRow = {
  location_name: string;
  plan_name?: string;
  final_score?: number;
  price?: number;
  distance_mi?: number;
  has_shuttle?: boolean;
  year_built?: number;
  review_reasoning?: string;
  image_path?: string;
};

function formatMoney(n?: number) {
  if (typeof n !== "number") return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function HousingMapClient({ results }: { results: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof ResultRow>("final_score");
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  const resultsArray: ResultRow[] = useMemo(() => {
    if (Array.isArray(results)) return results;
    if (results && typeof results === "object") return Object.values(results) as ResultRow[];
    return [];
  }, [results]);

  const sidebarList = useMemo(() => {
    let list = [...resultsArray];

    if (searchTerm) {
      list = list.filter((r) =>
        r.location_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    list.sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;

      return sortBy === "price" || sortBy === "distance_mi"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return list;
  }, [resultsArray, searchTerm, sortBy]);

  const markers = useMemo(() => {
    const bestByLocation = new Map<string, ResultRow>();

    for (const r of resultsArray) {
      if (!r?.location_name) continue;

      const prev = bestByLocation.get(r.location_name);
      if (!prev || (r.final_score ?? 0) > (prev.final_score ?? 0)) {
        bestByLocation.set(r.location_name, r);
      }
    }

    return Array.from(bestByLocation.values())
      .map((r) => ({
        id: r.location_name,
        ...COORDS_BY_LOCATION[r.location_name],
        ...r,
      }))
      .filter((m) => m.lat);
  }, [resultsArray]);

  return (
    <div className="flex h-screen w-full overflow-hidden rounded-3xl m-4 shadow-2xl">
      
      {/* MAP */}
      <div className="flex-1 rounded-l-3xl overflow-hidden">
        <MapContainer
          center={[33.645, -117.835]}
          zoom={14}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {activeCoords && <RecenterMap {...activeCoords} />}
          {markers.map((m) => (
            <Marker key={m.id} position={[m.lat!, m.lng!]}>
              <Popup>
                <div className="text-black">
                  <b>{m.location_name}</b>
                  <br />
                  {formatMoney(m.price)}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* SIDEBAR */}
      <div className="w-[420px] flex flex-col border-l border-white/20 bg-gradient-to-br from-blue-400 to-green-400 rounded-r-3xl">
        
        {/* Header */}
        <div className="p-6 border-b border-white/20 backdrop-blur-md">
          <h1 className="text-xl font-semibold mb-4 tracking-tight text-white">
            Apartment Discovery
          </h1>

          <input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 rounded-lg border border-white/40 bg-white/80 backdrop-blur-md text-black text-sm mb-3 outline-none focus:ring-2 focus:ring-white/60"
          />

          <div className="text-sm flex gap-2 items-center text-white">
            <span className="opacity-80">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-semibold cursor-pointer outline-none text-white"
            >
              <option value="final_score" className="text-black">
                Final Score
              </option>
              <option value="price" className="text-black">
                Price
              </option>
              <option value="distance_mi" className="text-black">
                Distance
              </option>
            </select>
          </div>
        </div>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3">
          {sidebarList.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                const coords = COORDS_BY_LOCATION[item.location_name];
                if (coords) setActiveCoords(coords);
              }}
              className="bg-white/90 backdrop-blur-md border border-white/40 rounded-xl p-4 mb-3 cursor-pointer transition-all duration-200 hover:border-black"
            >
              {item.image_path && (
                <img
                  src={item.image_path}
                  alt=""
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}

              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold text-black">
                  {formatMoney(item.price)}
                </span>
                <span className="text-xs font-semibold text-black bg-gray-200 px-2 py-1 rounded">
                  Score: {item.final_score?.toFixed(1)}
                </span>
              </div>

              <div className="text-sm font-semibold mt-1 text-black">
                {item.location_name}
              </div>

              <div className="text-xs text-gray-600 mt-1">
                {item.plan_name} • {item.distance_mi} mi
              </div>

              {item.review_reasoning && (
                <p className="text-xs text-gray-700 mt-3 border-t border-gray-200 pt-2 leading-relaxed">
                  {item.review_reasoning}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}