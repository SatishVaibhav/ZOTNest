
import { motion } from "framer-motion";

export default function HousingSources() {
    return (
        <>
        {/* Sliding Housing Sources */}
            <div className="relative z-10 mt-24 w-full overflow-hidden">
            <motion.div
                className="flex gap-8"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                repeat: Infinity,
                repeatType: "loop",
                duration: 18,
                ease: "linear",
                }}
            >
                {[
                "University of California, Irvine",
                "American Campus Communities",
                "Irvine Company Apartments",
                "Zillow",
                ].map((item, index) => (
                <div
                    key={index}
                    className="min-w-[260px] bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white text-lg font-semibold shadow-lg"
                >
                    {item}
                </div>
                ))}
            </motion.div>
            </div>
        </>
    )
}