import ResultsClient from "./ResultsClient";
import { motion } from "framer-motion";
export default function ResultsPage() {
  return (
    <main className="relative min-h-screen p-6">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500 to-green-200" />
      {/* Title */}
      <h1 className="text-center text-yellow-300 text-6xl font-bold mb-8">
        Results
      </h1>
      <ResultsClient />
    </main>
  );
}