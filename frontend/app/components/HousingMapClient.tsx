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

const ANTHROPIC_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

/** ---------- SCORE -> COLOR (red -> green) ---------- */
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
    popupAnchor: [0, -10],
    html: `
      <div style="
        width:18px;height:18px;border-radius:50%;
        background:${color};
        border:2px solid #ffffff;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
      "></div>
    `,
  });
}
function makeSelectedIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    html: `
      <div style="
        width:26px;height:26px;border-radius:50%;
        background:${color};
        border:4px solid #000000;
        box-shadow:0 6px 16px rgba(0,0,0,0.35);
      "></div>
    `,
  });
}
/** --------------------------------------------------- */

type MarkerRow = ResultRow & {
  id: string;
  lat: number;
  lng: number;
};

export default function HousingMapClient({ results }: { results: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof ResultRow>("final_score");
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ✅ NEW: floorplan expand/collapse in the selected panel
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState(false);

  // ✅ full floor plan modal
  const [floorPlanModalSrc, setFloorPlanModalSrc] = useState<string | null>(null);
  const [floorPlanModalTitle, setFloorPlanModalTitle] = useState<string>("");

  const resultsArray: ResultRow[] = useMemo(() => {
    if (Array.isArray(results)) return results;
    if (results && typeof results === "object") return Object.values(results) as ResultRow[];
    return [];
  }, [results]);

  const priceBounds = useMemo(() => {
    const prices = resultsArray
      .map((r) => (typeof r.price === "number" ? r.price : null))
      .filter((p): p is number => p !== null);

    if (prices.length === 0) return { min: 0, max: 6000 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [resultsArray]);

  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const effectiveMaxPrice = maxPrice ?? priceBounds.max;

  const filteredResults = useMemo(() => {
    const cap = effectiveMaxPrice;
    return resultsArray.filter((r) => {
      if (typeof r.price !== "number") return true;
      return r.price <= cap;
    });
  }, [resultsArray, effectiveMaxPrice]);

  const sidebarList = useMemo(() => {
    let list = [...filteredResults];
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
        : (valB as any) - (valA as any);
    });

    return list;
  }, [filteredResults, searchTerm, sortBy]);

  const markers: MarkerRow[] = useMemo(() => {
    const bestByLocation = new Map<string, ResultRow>();
    for (const r of filteredResults) {
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

          {/* ✅ GRADIENT SCORE LEGEND */}
          <div style={{ marginTop: 14, fontSize: 12, color: "#444" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Lower score</span>
              <span>Higher score</span>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                marginTop: 6,
                background: "linear-gradient(90deg, #dc3545, #f59e0b, #22c55e)",
                border: "1px solid #eee",
              }}
            />
          </div>

          {/* ✅ MAX PRICE SLIDER */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#444" }}>
              <span style={{ fontWeight: 800 }}>Max price</span>
              <span style={{ fontWeight: 800 }}>{formatMoney(effectiveMaxPrice)}</span>
            </div>

            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={10}
              value={effectiveMaxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{ width: "100%", marginTop: 8 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginTop: 4 }}>
              <span>{formatMoney(priceBounds.min)}</span>
              <span>{formatMoney(priceBounds.max)}</span>
            </div>

            <button
              onClick={() => setMaxPrice(priceBounds.max)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e5e5",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Reset max price
            </button>
          </div>

          {/* ✅ Selected details panel that DOES NOT take over the sidebar */}
          {selectedMarker && (
            <div
              style={{
                marginTop: 16,
                borderRadius: 12,
                border: "1px solid #e5e5e5",
                background: "#fafafa",
                maxHeight: "38vh",
                overflow: "auto",
              }}
            >
              {/* Sticky header with close */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  background: "#fafafa",
                  borderBottom: "1px solid #e5e5e5",
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {selectedMarker.location_name}
                  </div>

                  {selectedMarker.plan_name && (
                    <div style={{ marginTop: 2, fontSize: 13, color: "#444", fontWeight: 700 }}>
                      {selectedMarker.plan_name}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#fff",
                      border: "1px solid #e5e5e5",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Score{" "}
                    {typeof selectedMarker.final_score === "number"
                      ? selectedMarker.final_score.toFixed(1)
                      : "—"}
                  </span>

                  <button
                    onClick={() => setSelectedId(null)}
                    style={{
                      border: "1px solid #e5e5e5",
                      background: "#fff",
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                    aria-label="Clear selection"
                    title="Clear selection"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <div>
                    <b>Price:</b> {formatMoney(selectedMarker.price)}
                  </div>
                  <div>
                    <b>Distance:</b>{" "}
                    {typeof selectedMarker.distance_mi === "number"
                      ? `${selectedMarker.distance_mi} mi`
                      : "—"}
                  </div>
                  <div>
                    <b>Shuttle:</b> {selectedMarker.has_shuttle ? "Yes" : "No"}
                  </div>
                  <div>
                    <b>Year built:</b> {selectedMarker.year_built ?? "—"}
                  </div>
                </div>

                {selectedMarker.review_reasoning && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#333" }}>
                    <b>Why:</b> {selectedMarker.review_reasoning}
                  </div>
                )}

                {/* Collapsible floor plan */}
                {selectedMarker.image_path && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setIsFloorPlanOpen((v) => !v)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e5e5",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Floor plan</span>
                      <span style={{ fontWeight: 900 }}>{isFloorPlanOpen ? "Hide" : "Show"}</span>
                    </button>

                    {isFloorPlanOpen && (
                      <div style={{ marginTop: 10 }}>
                        <img
                          src={selectedMarker.image_path}
                          alt="Floor plan"
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                            borderRadius: 10,
                            border: "1px solid #e5e5e5",
                            background: "#fff",
                            cursor: "zoom-in",
                            maxHeight: 260,
                            objectFit: "contain",
                          }}
                          onClick={() => {
                            setFloorPlanModalSrc(selectedMarker.image_path!);
                            setFloorPlanModalTitle(
                              `${selectedMarker.location_name}${
                                selectedMarker.plan_name ? ` • ${selectedMarker.plan_name}` : ""
                              }`
                            );
                          }}
                        />

                        <button
                          onClick={() => {
                            setFloorPlanModalSrc(selectedMarker.image_path!);
                            setFloorPlanModalTitle(
                              `${selectedMarker.location_name}${
                                selectedMarker.plan_name ? ` • ${selectedMarker.plan_name}` : ""
                              }`
                            );
                          }}
                          style={{
                            marginTop: 10,
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid #e5e5e5",
                            background: "#fff",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          View full floor plan
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e5e5",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}
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