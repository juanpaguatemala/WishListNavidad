"use client";

import { motion } from "framer-motion";
import { useExperience } from "@/components/Experience";
import { ButtonLink } from "@/components/ui";

export function HeroIntro() {
  const { reduceMotion } = useExperience();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
      className="text-center md:text-left"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-oro-400">Un cuento para ti</p>
      <h1 className="mt-3 font-display text-5xl leading-tight sm:text-6xl">
        Mi Navidad <span className="text-oro-400">Mágica</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-nieve-200 md:mx-0">
        Santa te espera en su taller para conocerte, decorar juntos un árbol brillante y abrir tu libro de deseos.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
        <ButtonLink href="/padres" className="text-lg">
          Soy mamá o papá: crear aventura
        </ButtonLink>
      </div>
      <p className="mt-4 text-sm text-nieve-200/80">
        ¿Eres un niño o niña? Abre el enlace mágico que te compartieron tus papás.
      </p>
    </motion.div>
  );
}
