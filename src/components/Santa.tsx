"use client";

import { motion } from "framer-motion";
import { useExperience } from "./Experience";

/**
 * Santa original en SVG, coherente en todas las pantallas.
 * Punto de reemplazo: si más adelante hay ilustraciones con licencia,
 * sustituir el contenido de este componente manteniendo sus props.
 */
export type SantaMood = "saluda" | "feliz" | "lee" | "piensa";

type Props = {
  mood?: SantaMood;
  className?: string;
  /** Texto alternativo; si se omite, la ilustración es decorativa. */
  label?: string;
};

export function Santa({ mood = "feliz", className, label }: Props) {
  const { reduceMotion: reduce } = useExperience();
  const waving = mood === "saluda" && !reduce;
  const decorative = !label;

  return (
    <motion.svg
      viewBox="0 0 200 240"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={label}
      initial={{ y: 6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
    >
      <defs>
        <radialGradient id="santa-face" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fbd9bf" />
          <stop offset="100%" stopColor="#efb894" />
        </radialGradient>
        <linearGradient id="santa-suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d0344f" />
          <stop offset="100%" stopColor="#8e1830" />
        </linearGradient>
        <linearGradient id="santa-hat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d0344f" />
          <stop offset="100%" stopColor="#9c1a35" />
        </linearGradient>
      </defs>

      {/* Cuerpo */}
      <path d="M28 240 C30 186 58 158 100 158 C142 158 170 186 172 240 Z" fill="url(#santa-suit)" />
      <rect x="40" y="206" width="120" height="14" rx="4" fill="#1b1b24" />
      <rect x="88" y="203" width="24" height="20" rx="4" fill="none" stroke="#e8b94a" strokeWidth="4" />
      <rect x="96" y="160" width="8" height="46" fill="#f8f6f0" opacity="0.9" />

      {/* Brazo izquierdo (del espectador) */}
      <path d="M44 182 C30 196 26 214 34 228" stroke="#a51c38" strokeWidth="20" strokeLinecap="round" fill="none" />
      <circle cx="35" cy="229" r="11" fill="#f8f6f0" />

      {/* Libro cuando lee */}
      {mood === "lee" && (
        <g>
          <path d="M62 196 L100 204 L138 196 L138 232 L100 238 L62 232 Z" fill="#164a2e" />
          <path d="M66 198 L100 206 L100 234 L66 228 Z" fill="#fffdf6" />
          <path d="M134 198 L100 206 L100 234 L134 228 Z" fill="#f6efdc" />
          <path d="M100 206 L100 234" stroke="#c99a2e" strokeWidth="2" />
        </g>
      )}

      {/* Cara */}
      <circle cx="100" cy="112" r="36" fill="url(#santa-face)" />
      <circle cx="80" cy="120" r="7" fill="#e86a7a" opacity="0.45" />
      <circle cx="120" cy="120" r="7" fill="#e86a7a" opacity="0.45" />

      {/* Barba */}
      <path
        d="M62 114 C58 140 66 168 82 182 C88 192 96 198 100 198 C104 198 112 192 118 182 C134 168 142 140 138 114 C132 132 120 140 100 140 C80 140 68 132 62 114 Z"
        fill="#f8f6f0"
      />
      <path d="M74 150 C80 158 90 160 96 156 M104 156 C110 160 120 158 126 150" stroke="#e9e5da" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Boca */}
      {mood === "piensa" ? (
        <ellipse cx="100" cy="133" rx="4" ry="3.5" fill="#8e1830" />
      ) : (
        <path d="M91 131 Q100 140 109 131 Z" fill="#8e1830" />
      )}

      {/* Bigote */}
      <path d="M100 124 C92 118 80 120 74 128 C84 132 94 131 100 126 Z" fill="#ffffff" />
      <path d="M100 124 C108 118 120 120 126 128 C116 132 106 131 100 126 Z" fill="#ffffff" />
      <circle cx="100" cy="118" r="6.5" fill="#e8977a" />

      {/* Ojos */}
      {mood === "feliz" || mood === "saluda" ? (
        <g stroke="#2a2230" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M83 106 Q88 100 93 106" />
          <path d="M107 106 Q112 100 117 106" />
        </g>
      ) : (
        <g fill="#2a2230">
          <ellipse cx="88" cy="105" rx="3.6" ry="4.4" />
          <ellipse cx="112" cy="105" rx="3.6" ry="4.4" />
          <circle cx="89.2" cy="103.6" r="1.2" fill="#fff" />
          <circle cx="113.2" cy="103.6" r="1.2" fill="#fff" />
        </g>
      )}
      <path d="M80 96 Q88 90 95 95 M105 95 Q112 90 120 96" stroke="#f8f6f0" strokeWidth="5" strokeLinecap="round" fill="none" />

      {/* Gorro */}
      <path d="M58 84 C62 52 92 30 126 34 C150 37 166 52 172 64 C160 58 146 58 140 64 C142 72 142 78 142 84 Z" fill="url(#santa-hat)" />
      <rect x="52" y="76" width="96" height="20" rx="10" fill="#f8f6f0" />
      <circle cx="172" cy="66" r="12" fill="#f8f6f0" />

      {/* Brazo derecho: saluda */}
      <motion.g
        style={{ transformOrigin: "156px 182px", transformBox: "view-box" }}
        animate={waving ? { rotate: [0, -14, 6, -14, 0] } : undefined}
        transition={waving ? { duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" } : undefined}
      >
        {mood === "saluda" ? (
          <>
            <path d="M156 182 C172 168 180 150 178 132" stroke="#a51c38" strokeWidth="20" strokeLinecap="round" fill="none" />
            <circle cx="178" cy="128" r="12" fill="#f8f6f0" />
          </>
        ) : (
          <>
            <path d="M156 182 C170 196 174 214 166 228" stroke="#a51c38" strokeWidth="20" strokeLinecap="round" fill="none" />
            <circle cx="165" cy="229" r="11" fill="#f8f6f0" />
          </>
        )}
      </motion.g>
    </motion.svg>
  );
}
