"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";

// Fix default marker icons in bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as any).src ?? markerIcon2x,
  iconUrl: (markerIcon as any).src ?? markerIcon,
  shadowUrl: (markerShadow as any).src ?? markerShadow,
});

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
  image_path?: string; // e.g. "/Cornell_Plan_A.jpeg" (must exist in /public)
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
  const resultsArray: ResultRow[] = useMemo(() => {
    if (Array.isArray(results)) return results;
    if (results && typeof results === "object")
      return Object.values(results) as ResultRow[];
    return [];
  }, [results]);

  console.log(
    "Results array In HousingClient:",
    resultsArray,
    "results",
    results,
    "length",
    resultsArray.length,
    "image_path example",
    resultsArray[0]?.image_path
  );

  // ✅ Only show the highest-scoring apartment in each community
  const markers = useMemo(() => {
    const bestByLocation = new Map<string, ResultRow>();

    for (const r of resultsArray) {
      if (!r?.location_name) continue;

      const prev = bestByLocation.get(r.location_name);

      const score = typeof r.final_score === "number" ? r.final_score : -Infinity;
      const prevScore =
        typeof prev?.final_score === "number" ? prev.final_score : -Infinity;

      // Keep the higher score (ties: keep the first one; use >= to keep the last one)
      if (!prev || score > prevScore) {
        bestByLocation.set(r.location_name, r);
      }
    }

    return Array.from(bestByLocation.values())
      .map((r) => {
        const coords = COORDS_BY_LOCATION[r.location_name];
        if (!coords) return null;

        return {
          id: `${r.location_name}-${r.plan_name ?? "best"}`,
          ...coords,
          ...r,
        };
      })
      .filter(Boolean) as Array<ResultRow & { id: string; lat: number; lng: number }>;
  }, [resultsArray]);

  return (
    <MapContainer
      center={[33.6405, -117.8443]}
      zoom={14}
      style={{ height: "70vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]}>
          <Popup>
            <div style={{ maxWidth: 260 }}>
              <div style={{ fontWeight: 800 }}>{m.location_name}</div>

              {m.plan_name && (
                <div style={{ fontWeight: 600, marginTop: 2 }}>{m.plan_name}</div>
              )}

              <div style={{ marginTop: 8 }}>
                <div>
                  <b>Score:</b>{" "}
                  {typeof m.final_score === "number"
                    ? m.final_score.toFixed(1)
                    : "—"}
                </div>
                <div>
                  <b>Price:</b> {formatMoney(m.price)}
                </div>
                <div>
                  <b>Distance:</b>{" "}
                  {typeof m.distance_mi === "number"
                    ? `${m.distance_mi} mi`
                    : "—"}
                </div>
                <div>
                  <b>Shuttle:</b> {m.has_shuttle ? "Yes" : "No"}
                </div>
                <div>
                  <b>Year built:</b> {m.year_built ?? "—"}
                </div>
              </div>

              {m.review_reasoning && (
                <div style={{ marginTop: 10 }}>
                  <b>Why:</b> {m.review_reasoning}
                </div>
              )}

              {m.image_path && (
                <img
                  src={m.image_path}
                  alt={`${m.location_name} plan`}
                  style={{ width: "50%", borderRadius: 10, marginTop: 10 }}
                />
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}