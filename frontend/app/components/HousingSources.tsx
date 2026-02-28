import { motion } from "framer-motion";

export default function HousingSources() {
  const items = [
    "University of California, Irvine",
    "American Campus Communities",
    "Irvine Company Apartments",
    "Zillow",
  ];

  return (
    <div
      className="relative z-10 mt-24 w-full overflow-hidden"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    >
      <motion.div
        className="flex gap-8 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
            duration: 20,
          },
        }}
      >
        {/* Duplicate the cards twice for seamless loop */}
        {[...items, ...items].map((item, index) => (
          <div
            key={index}
            className="min-w-[260px] bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white text-lg font-semibold shadow-lg"
          >
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}