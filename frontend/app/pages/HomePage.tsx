import { motion } from "framer-motion";
import HousingSources from "@/app/components/HousingSources";
import { useEffect, useState } from "react";

export default function HomePage() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayText, setDisplayText] = useState("");

  const sentences = [
    "Find student housing based on what you actually care about.",
    "Discover apartments near UCI that match your lifestyle.",
    "Compare prices, amenities, and commute times effortlessly.",
    "ZOT ZOT ZOT"
  ];

  useEffect(() => {
    let sentenceIndex = 0;
    let charIndex = 0;
    let forward = true;

    const typingSpeed = 150;    // typing speed
    const deletingSpeed = 50;   // faster deletion
    const pauseDuration = 2000; // pause at end of sentence
    let timeout: NodeJS.Timeout;

    const type = () => {
      const currentSentence = sentences[sentenceIndex];

      if (forward) {
        setDisplayText(currentSentence.slice(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentSentence.length) {
          forward = false;
          timeout = setTimeout(type, pauseDuration);
          return;
        }
        timeout = setTimeout(type, typingSpeed);
      } else {
        setDisplayText(currentSentence.slice(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          forward = true;
          sentenceIndex = (sentenceIndex + 1) % sentences.length;
        }
        timeout = setTimeout(type, deletingSpeed);
      }
    };

    type(); // start typing

    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      await fetch(`${BACKEND_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-green-200" />

      <div className="relative z-10 flex flex-col items-center max-w-2xl">
        {/* Title centered */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-9xl font-bold text-neony tracking-tight text-center"
        >
          ZOTNest
        </motion.h1>

        {/* Typing tagline left-aligned */}
        <div className="w-full mt-4">
          <p className="text-base text-lg font-bold text-black min-h-[1.5em] text-left">
            {displayText}
            <span className="animate-pulse">▍</span>
          </p>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-sm text-white font-semibold mt-6 text-left"
        >
          ZOTNest is a smart student housing discovery platform designed specifically
          for students near the University of California, Irvine. Instead of scrolling
          endlessly through listings on platforms like Zillow or browsing corporate
          communities such as American Campus Communities and Irvine Company, ZOTNest
          analyzes what actually matters to students and ranks housing options intelligently.
        </motion.p>

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
            className="w-full bg-black/40 backdrop-blur border border-white/10 rounded-xl px-5 py-4 text-lg text-white font-bold placeholder-gray focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
         <button
  type="submit"
  className="mt-4 w-full bg-gradient-to-r from-blue-500/70 to-green-500/70 text-white py-3 rounded-xl text-lg font-bold transition hover:from-indigo-500/90 hover:to-purple-500/90"
>
  {loading ? "Searching..." : "Search Housing"}
</button>
        </motion.form>

        <HousingSources />
      </div>
    </main>
  );
}