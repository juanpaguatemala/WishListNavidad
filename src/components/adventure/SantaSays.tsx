"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useExperience } from "../Experience";
import { Santa, type SantaMood } from "../Santa";

/** Santa con su globo de texto: así "habla" (sin voz). */
export function SantaSays({ mood = "feliz", children }: { mood?: SantaMood; children: ReactNode }) {
  const { reduceMotion } = useExperience();
  return (
    <div className="flex items-end gap-3 sm:gap-5">
      <Santa mood={mood} className="h-24 w-20 shrink-0 sm:h-32 sm:w-28" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay: 0.15 }}
        className="relative flex-1 rounded-3xl rounded-bl-md bg-nieve px-5 py-4 text-lg leading-relaxed text-noche-900 shadow-xl"
      >
        {children}
      </motion.div>
    </div>
  );
}
