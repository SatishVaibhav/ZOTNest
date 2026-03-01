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
      list = list.filter((r) => r.location_name.toLowerCase().includes(searchTerm.toLowerCase()));
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
      if (!prev || (r.final_score ?? -Infinity) > (prev.final_score ?? -Infinity)) {
        bestByLocation.set(r.location_name, r);
      }
    }

    return Array.from(bestByLocation.values())
      .map((r) => ({
        id: r.location_name,
        ...COORDS_BY_LOCATION[r.location_name],
        ...r,
      }))
      .filter((m) => typeof m.lat === "number" && typeof m.lng === "number");
  }, [filteredResults]);

  const scoreRange = useMemo(() => {
    const scores = markers
      .map((m) => (typeof m.final_score === "number" ? m.final_score : null))
      .filter((s): s is number => s !== null);

    if (scores.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...scores), max: Math.max(...scores) };
  }, [markers]);

  const iconCache = useMemo(() => new Map<string, L.DivIcon>(), []);

  const getColorForScore = (score?: number) => {
    if (typeof score !== "number") return "#9ca3af";
    const denom = scoreRange.max - scoreRange.min;
    const t = denom === 0 ? 1 : (score - scoreRange.min) / denom;
    return scoreToHexColor(t);
  };

  const getIcon = (score: number | undefined, isSelected: boolean) => {
    const color = getColorForScore(score);
    const key = `${color}-${isSelected ? "sel" : "norm"}`;
    if (!iconCache.has(key)) {
      iconCache.set(key, isSelected ? makeSelectedIcon(color) : makeColorIcon(color));
    }
    return iconCache.get(key)!;
  };

  const selectedMarker: MarkerRow | null = useMemo(() => {
    if (!selectedId) return null;
    return markers.find((m) => m.id === selectedId) ?? null;
  }, [selectedId, markers]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        fontFamily: ANTHROPIC_FONT,
        color: "#000",
      }}
    >
      {/* ✅ FULL FLOOR PLAN MODAL */}
      {floorPlanModalSrc && (
        <div
          onClick={() => setFloorPlanModalSrc(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1000px, 100%)",
              maxHeight: "90vh",
              background: "#fff",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {floorPlanModalTitle || "Floor plan"}
              </div>
              <button
                onClick={() => setFloorPlanModalSrc(null)}
                style={{
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 14, overflow: "auto", background: "#fafafa" }}>
              <img
                src={floorPlanModalSrc}
                alt="Full floor plan"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: 12,
                  background: "#fff",
                  border: "1px solid #eee",
                }}
              />
              <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
                Tip: You can zoom with your browser (Ctrl/⌘ + / -).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAP */}
      <div style={{ flex: 1 }}>
        <MapContainer center={[33.645, -117.835]} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {activeCoords && <RecenterMap {...activeCoords} />}

          {markers.map((m) => {
            const isSelected = selectedId === m.id;
            return (
              <Marker
                key={m.id}
                position={[m.lat, m.lng]}
                icon={getIcon(m.final_score, isSelected)}
                eventHandlers={{
                  click: () => {
                    setSelectedId(m.id);
                    setActiveCoords({ lat: m.lat, lng: m.lng });
                    setIsFloorPlanOpen(false); // ✅ collapse on new selection
                  },
                }}
              >
                <Popup>
                  <div style={{ color: "#000", fontFamily: ANTHROPIC_FONT, maxWidth: 280 }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>{m.location_name}</div>
                    {m.plan_name && <div style={{ marginTop: 2, fontWeight: 700 }}>{m.plan_name}</div>}

                    <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }}>
                      <div>
                        <b>Score:</b>{" "}
                        {typeof m.final_score === "number" ? m.final_score.toFixed(1) : "—"}
                      </div>
                      <div>
                        <b>Price:</b> {formatMoney(m.price)}
                      </div>
                      <div>
                        <b>Distance:</b>{" "}
                        {typeof m.distance_mi === "number" ? `${m.distance_mi} mi` : "—"}
                      </div>
                      <div>
                        <b>Shuttle:</b> {m.has_shuttle ? "Yes" : "No"}
                      </div>
                      <div>
                        <b>Year built:</b> {m.year_built ?? "—"}
                      </div>
                    </div>

                    {m.review_reasoning && (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <b>Why:</b> {m.review_reasoning}
                      </div>
                    )}

                    {m.image_path && (
                      <button
                        onClick={() => {
                          setFloorPlanModalSrc(m.image_path!);
                          setFloorPlanModalTitle(
                            `${m.location_name}${m.plan_name ? ` • ${m.plan_name}` : ""}`
                          );
                        }}
                        style={{
                          marginTop: 12,
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e5e5",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        View full floor plan
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* SIDEBAR */}
      <div style={{ width: "420px", borderLeft: "1px solid #e5e5e5", display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
        <div style={{ padding: "24px", borderBottom: "1px solid #eee" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", letterSpacing: "-0.02em" }}>
            Apartment Discovery
          </h1>

          <input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              outline: "none",
              fontSize: "14px",
              marginBottom: "12px",
            }}
          />

          <div style={{ fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ color: "#666" }}>Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                border: "none",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                outline: "none",
                color: "#000",
              }}
            >
              <option value="final_score">Final Score</option>
              <option value="price">Price</option>
              <option value="distance_mi">Distance</option>
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

        <div style={{ flex: 1, overflowY: "auto", padding: "12px", backgroundColor: "#fafafa" }}>
          {sidebarList.map((item, idx) => {
            const isSelected = selectedId === item.location_name;

            return (
              <div
                key={idx}
                onClick={() => {
                  const coords = COORDS_BY_LOCATION[item.location_name];
                  if (coords) setActiveCoords(coords);
                  setSelectedId(item.location_name);
                  setIsFloorPlanOpen(false); // ✅ collapse on new selection
                }}
                style={{
                  backgroundColor: "#fff",
                  border: isSelected ? "2px solid #000" : "1px solid #e5e5e5",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected ? "0 8px 20px rgba(0,0,0,0.10)" : "none",
                }}
              >
                {/* sidebar preview can stay cropped */}
                {item.image_path && (
                  <img
                    src={item.image_path}
                    alt=""
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      marginBottom: "12px",
                    }}
                  />
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "18px", fontWeight: 900 }}>{formatMoney(item.price)}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#000",
                      background: "#f0f0f0",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    Score: {item.final_score?.toFixed(1)}
                  </span>
                </div>

                <div style={{ fontSize: "14px", fontWeight: 800, marginTop: "4px" }}>{item.location_name}</div>
                <div style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>
                  {item.plan_name} • {item.distance_mi} mi
                </div>

                {item.review_reasoning && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#444",
                      marginTop: "12px",
                      lineHeight: "1.5",
                      borderTop: "1px solid #f0f0f0",
                      paddingTop: "8px",
                    }}
                  >
                    {item.review_reasoning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}