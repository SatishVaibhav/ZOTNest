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

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], 15);
  return null;
}

const COORDS_BY_LOCATION: Record<string, { lat: number; lng: number }> = {
  Aldrich: { lat: 33.6461, lng: -117.8427 },
  "Plaza Verde": { lat: 33.64799, lng: -117.82901 },
  "Plaza Verde II": { lat: 33.64877, lng: -117.82681 },
  "VDC Norte": { lat: 33.64693, lng: -117.82366 },
  "Camino Del Sol": { lat: 33.64471, lng: -117.82489 },
  "Vista Del Campo": { lat: 33.64034, lng: -117.82401 },
  "Puerta Del Sol": { lat: 33.64821, lng: -117.83215 },
  "Cornell Court": { lat: 33.64877, lng: -117.83423 },
  "Columbia Court": { lat: 33.65193, lng: -117.82828 },
  "Stanford Court": { lat: 33.65327, lng: -117.84052 },
  "Dartmouth Court": { lat: 33.65197, lng: -117.83753 },
  "Berkeley Court": { lat: 33.64903, lng: -117.83711 },
  "Harvard Court": { lat: 33.65035, lng: -117.83456 },
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

/* ---------- SCORE COLOR ---------- */

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function scoreToHexColor(t: number) {
  const tt = clamp01(t);
  const r = Math.round(lerp(220, 34, tt));
  const g = Math.round(lerp(53, 197, tt));
  const b = Math.round(lerp(69, 94, tt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function makeColorIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;"></div>`,
  });
}

function makeSelectedIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:4px solid #000;"></div>`,
  });
}

/* ---------- COMPONENT ---------- */

export default function HousingMapClient({ results }: { results: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof ResultRow>("final_score");
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState(false);
  const [floorPlanModalSrc, setFloorPlanModalSrc] = useState<string | null>(null);

  const resultsArray: ResultRow[] = useMemo(() => {
    if (Array.isArray(results)) return results;
    if (results && typeof results === "object") return Object.values(results);
    return [];
  }, [results]);

  /* ---------- Price Filter ---------- */

  const prices = resultsArray
    .map((r) => r.price)
    .filter((p): p is number => typeof p === "number");

  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 5000;

  const effectiveMax = maxPrice ?? priceMax;

  const filtered = resultsArray.filter((r) =>
    typeof r.price === "number" ? r.price <= effectiveMax : true
  );

  /* ---------- Sidebar List ---------- */

  const sidebarList = useMemo(() => {
    let list = [...filtered];

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
  }, [filtered, searchTerm, sortBy]);

  /* ---------- Markers ---------- */

  const markers = useMemo(() => {
    const best = new Map<string, ResultRow>();

    for (const r of filtered) {
      const prev = best.get(r.location_name);
      if (!prev || (r.final_score ?? 0) > (prev.final_score ?? 0)) {
        best.set(r.location_name, r);
      }
    }

    return Array.from(best.values())
      .map((r) => ({
        id: r.location_name,
        ...COORDS_BY_LOCATION[r.location_name],
        ...r,
      }))
      .filter((m) => m.lat);
  }, [filtered]);

  const scoreRange = useMemo(() => {
    const scores = markers
      .map((m) => m.final_score)
      .filter((s): s is number => typeof s === "number");

    if (!scores.length) return { min: 0, max: 1 };

    return { min: Math.min(...scores), max: Math.max(...scores) };
  }, [markers]);

  const getIcon = (score?: number, selected?: boolean) => {
    if (typeof score !== "number") return undefined;
    const t =
      scoreRange.max === scoreRange.min
        ? 1
        : (score - scoreRange.min) / (scoreRange.max - scoreRange.min);
    const color = scoreToHexColor(t);
    return selected ? makeSelectedIcon(color) : makeColorIcon(color);
  };

  const selected = markers.find((m) => m.id === selectedId);

  /* ---------- UI ---------- */

  return (
    <div className="flex h-screen w-full overflow-hidden rounded-3xl m-4 shadow-2xl">
      {/* FLOOR PLAN MODAL */}
      {floorPlanModalSrc && (
        <div
          onClick={() => setFloorPlanModalSrc(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
        >
          <img
            src={floorPlanModalSrc}
            className="max-h-[90vh] max-w-[90vw] bg-white rounded-xl"
          />
        </div>
      )}

      {/* MAP */}
      <div className="flex-1 rounded-l-3xl overflow-hidden">
        <MapContainer center={[33.645, -117.835]} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {activeCoords && <RecenterMap {...activeCoords} />}

          {markers.map((m) => (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={getIcon(m.final_score, selectedId === m.id)}
              eventHandlers={{
                click: () => {
                  setSelectedId(m.id);
                  setActiveCoords({ lat: m.lat, lng: m.lng });
                  setIsFloorPlanOpen(false);
                },
              }}
            >
              <Popup>
                <b>{m.location_name}</b>
                <br />
                {formatMoney(m.price)}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* SIDEBAR */}
      <div className="w-[420px] flex flex-col border-l border-white/20 bg-gradient-to-br from-blue-400 to-green-400 rounded-r-3xl">
        <div className="p-6 border-b border-white/20 backdrop-blur-md">
          <h1 className="text-xl font-semibold mb-4 text-white">
            Apartment Discovery
          </h1>

          <input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 rounded-lg bg-white/80 text-black mb-3"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-white font-semibold"
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

          {/* Price Slider */}
          <div className="mt-4">
            <div className="text-xs text-white mb-1">
              Max Price: {formatMoney(effectiveMax)}
            </div>
            <input
              type="range"
              min={priceMin}
              max={priceMax}
              value={effectiveMax}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {sidebarList.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                const coords = COORDS_BY_LOCATION[item.location_name];
                if (coords) setActiveCoords(coords);
                setSelectedId(item.location_name);
              }}
              className="bg-white/90 rounded-xl p-4 mb-3 cursor-pointer"
            >
              <div className="flex justify-between">
                <span className="font-bold text-black">
                  {formatMoney(item.price)}
                </span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded text-black">
                  {item.final_score?.toFixed(1)}
                </span>
              </div>

              <div className="text-sm font-semibold mt-1 text-black">
                {item.location_name}
              </div>

              {selectedId === item.location_name && selected && (
                <div className="mt-3 text-xs text-black">
                  <div>Distance: {selected.distance_mi} mi</div>
                  <div>Shuttle: {selected.has_shuttle ? "Yes" : "No"}</div>

                  {selected.image_path && (
                    <>
                      <button
                        onClick={() => setIsFloorPlanOpen(!isFloorPlanOpen)}
                        className="mt-2 underline"
                      >
                        {isFloorPlanOpen ? "Hide Floor Plan" : "Show Floor Plan"}
                      </button>

                      {isFloorPlanOpen && (
                        <img
                          src={selected.image_path}
                          onClick={() => setFloorPlanModalSrc(selected.image_path!)}
                          className="mt-2 rounded-lg cursor-zoom-in"
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}