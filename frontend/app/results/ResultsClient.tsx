"use client";

import dynamic from "next/dynamic";

const HousingMap = dynamic(() => import("../components/HousingMapClient"), {
  ssr: false,
});

export default function ResultsClient({results} : {results: any}) {
  return (
    <div style={{ marginTop: 40}}>
      <HousingMap results = {results}/>
    </div>
  );
}