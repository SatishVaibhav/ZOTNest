"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const taglineText =
  "Find student housing based on what you actually care about.";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [loading, setLoading] = useState(false);

  // Typing animation for tagline
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayText(taglineText.slice(0, i + 1));
      i++;
      if (i === taglineText.length) clearInterval(interval);
    }, 35);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      await fetch(`${BACKEND_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({query: query.trim() }),
      });
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      
      {/* Animated dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-indigo-950 animate-gradient" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-6xl font-bold text-white tracking-tight"
        >
          ZotNest
        </motion.h1>

        {/* Typing tagline */}
        <p className="mt-4 text-lg text-gray-300 min-h-[1.5em]">
          {displayText}
          <span className="animate-pulse">▍</span>
        </p>

        {/* Search */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-10 w-full"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. quiet studio near UCI under $1400"
            className="w-full bg-black/40 backdrop-blur border border-white/10 rounded-xl px-5 py-4 text-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-lg font-semibold transition"
          >
            {loading ? "Searching..." : "Search Housing"}
          </button>
        </motion.form>
      </div>
    </main>
  );
}