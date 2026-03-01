"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  iconUrl: markerIcon.src ?? markerIcon,
  shadowUrl: markerShadow.src ?? markerShadow,
});

export default function HousingMapClient({results} : {results: any}) {
  return (
    <MapContainer
      center={[33.6405, -117.8443]} // UCI-ish
      zoom={14}
      style={{ height: "70vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    
      <Marker position={[33.6461, -117.8427]}>
        <Popup><b>Aldrich</b></Popup>
      </Marker>
      <Marker position={[33.647992890412965, -117.82901779024394]}>
        <Popup><b>Plaza Verde</b></Popup>
      </Marker>
      <Marker position={[33.64693005928019, -117.82366410112326]}>
        <Popup><b>Vista Del Campo Norte</b></Popup>
      </Marker>
      <Marker position={[33.644715041285316, -117.82489791720157]}>
        <Popup><b>Camino Del Sol</b></Popup>
      </Marker>
      <Marker position={[33.64034735896951, -117.8240181526251]}>
        <Popup><b>Vista Del Campo</b></Popup>
      </Marker>
      <Marker position={[33.64821720903248, -117.83215642142689]}>
        <Popup><b>Puerta Del Sol</b></Popup>
      </Marker>
    </MapContainer>
  );
}