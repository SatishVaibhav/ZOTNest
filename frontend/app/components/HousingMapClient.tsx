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

const ANTHROPIC_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

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
  }, [resultsArray, searchTerm, sortBy]);

  const markers = useMemo(() => {
    const bestByLocation = new Map<string, ResultRow>();
    for (const r of resultsArray) {
      if (!r?.location_name) continue;
      const prev = bestByLocation.get(r.location_name);
      if (!prev || (r.final_score ?? 0) > (prev.final_score ?? 0)) bestByLocation.set(r.location_name, r);
    }
    return Array.from(bestByLocation.values()).map((r) => ({
      id: r.location_name,
      ...COORDS_BY_LOCATION[r.location_name],
      ...r,
    })).filter(m => m.lat);
  }, [resultsArray]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", fontFamily: ANTHROPIC_FONT, color: "#000" }}>
      
      {/* MAP */}
      <div style={{ flex: 1 }}>
        <MapContainer center={[33.645, -117.835]} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {activeCoords && <RecenterMap {...activeCoords} />}
          {markers.map((m) => (
            <Marker key={m.id} position={[m.lat!, m.lng!]}>
              <Popup>
                <div style={{ color: "#000", fontFamily: ANTHROPIC_FONT }}>
                  <b style={{ fontSize: "14px" }}>{m.location_name}</b><br/>
                  {formatMoney(m.price)}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* SIDEBAR */}
      <div style={{ width: "420px", borderLeft: "1px solid #e5e5e5", display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
        <div style={{ padding: "24px", borderBottom: "1px solid #eee" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px", letterSpacing: "-0.02em" }}>Apartment Discovery</h1>
          <input 
            placeholder="Search communities..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", outline: "none", fontSize: "14px", marginBottom: "12px" }}
          />
          <div style={{ fontSize: "13px", display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ color: "#666" }}>Sort by</span>
            <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{ border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer", outline: "none", color: "#000" }}
            >
              <option value="final_score">Final Score</option>
              <option value="price">Price</option>
              <option value="distance_mi">Distance</option>
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px", backgroundColor: "#fafafa" }}>
          {sidebarList.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => {
                const coords = COORDS_BY_LOCATION[item.location_name];
                if (coords) setActiveCoords(coords);
              }}
              style={{ 
                backgroundColor: "#fff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "16px", marginBottom: "12px", 
                cursor: "pointer", transition: "all 0.2s ease" 
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#000")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e5e5")}
            >
              {item.image_path && (
                <img src={item.image_path} alt="" style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "8px", marginBottom: "12px" }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "18px", fontWeight: 700 }}>{formatMoney(item.price)}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#000", background: "#f0f0f0", padding: "2px 8px", borderRadius: "4px" }}>
                  Score: {item.final_score?.toFixed(1)}
                </span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "4px" }}>{item.location_name}</div>
              <div style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>{item.plan_name} • {item.distance_mi} mi</div>
              {item.review_reasoning && (
                <p style={{ fontSize: "12px", color: "#444", marginTop: "12px", lineHeight: "1.5", borderTop: "1px solid #f0f0f0", paddingTop: "8px" }}>
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