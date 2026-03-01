'use client';
import ResultsClient from "./ResultsClient";
import { motion } from "framer-motion";
import { useSearch } from "@/app/context/SearchContext";

export default function ResultsPage() {
    const { results } = useSearch();
    if (!results) {
        return <p>No results yet. Try searching first.</p>;
    }
    console.log("Results in ResultsPage:", results);

    return (
        <main className="relative min-h-screen p-6">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500 to-green-200" />
        {/* Title */}
        <h1 className="text-center text-yellow-300 text-6xl font-bold mb-8">
            Results
        </h1>
        <ResultsClient results={results} />
        </main>
    );
}