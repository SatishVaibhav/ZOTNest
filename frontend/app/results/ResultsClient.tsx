"use client";

import dynamic from "next/dynamic";

const HousingMap = dynamic(() => import("../components/HousingMapClient"), {
  ssr: false,
});

export default function ResultsClient() {
  return (
    <div style={{ marginTop: 16 }}>
      <HousingMap />
    </div>
  );
}