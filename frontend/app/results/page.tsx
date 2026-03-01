'use client';
import ResultsClient from "./ResultsClient";
import { motion } from "framer-motion";
import { useSearch } from "@/app/context/SearchContext";
import Navbar from "@/app/components/NavBar";

export default function ResultsPage() {
  const { results } = useSearch();

  if (!results) {
    return (
      <>
        <Navbar />

        <main className="relative min-h-screen p-6 pt-20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-green-400" />

          <div className="relative z-10 max-w-7xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl font-bold text-yellow-300 mb-8 text-center"
            >
              No results yet. Try searching first.
            </motion.h1>
          </div>
        </main>
      </>
    );
  }

  console.log("Results in ResultsPage:", results);

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen p-6 pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-green-" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold text-yellow-300 mb-8 text-center"
          >
            Results
          </motion.h1>

          <div className="w-full h-[80vh]">
            <ResultsClient results={results} />
          </div>
        </div>
      </main>
    </>
  );
}