"use client";

import { MotionConfig } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MusicBox } from "./music";

/**
 * Preferencias de experiencia: reducir movimiento y música opcional.
 * La música SIEMPRE empieza apagada y solo suena tras un clic.
 */

type ExperienceContextValue = {
  reduceMotion: boolean;
  toggleReduceMotion: () => void;
};

const ExperienceContext = createContext<ExperienceContextValue>({
  reduceMotion: false,
  toggleReduceMotion: () => undefined,
});

export function useExperience() {
  return useContext(ExperienceContext);
}

const STORAGE_KEY = "mnm-reducir-movimiento";

function readStoredPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSystemMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const systemReduce = useSyncExternalStore(
    subscribeSystemMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [userReduce, setUserReduce] = useState<boolean | null>(null);
  const stored = useSyncExternalStore(
    () => () => undefined,
    readStoredPreference,
    () => false,
  );
  const reduceMotion = userReduce ?? (stored || systemReduce);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? "true" : "false";
  }, [reduceMotion]);

  const toggleReduceMotion = useCallback(() => {
    const next = !reduceMotion;
    setUserReduce(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Almacenamiento no disponible: la preferencia vale solo esta visita.
    }
  }, [reduceMotion]);

  return (
    <ExperienceContext value={{ reduceMotion, toggleReduceMotion }}>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>{children}</MotionConfig>
    </ExperienceContext>
  );
}

/** Controles flotantes: música y movimiento. */
export function ExperienceControls() {
  const { reduceMotion, toggleReduceMotion } = useExperience();
  const box = useRef<MusicBox | null>(null);
  const [music, setMusic] = useState<"off" | "on" | "unavailable">("off");

  useEffect(() => () => box.current?.stop(), []);

  async function toggleMusic() {
    box.current = box.current ?? new MusicBox();
    if (box.current.playing) {
      box.current.stop();
      setMusic("off");
      return;
    }
    const ok = await box.current.start();
    setMusic(ok ? "on" : "unavailable");
  }

  const btn =
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-noche-900/80 px-3 py-2 text-sm text-nieve shadow-lg backdrop-blur hover:bg-noche-800 min-h-11";

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-end gap-2">
      <button type="button" onClick={toggleMusic} aria-pressed={music === "on"} className={btn}>
        <span aria-hidden>{music === "on" ? "🔔" : "🔕"}</span>
        <span className="sr-only sm:not-sr-only">{music === "on" ? "Apagar música" : "Activar música"}</span>
      </button>
      {music === "unavailable" && (
        <p role="status" className="max-w-56 rounded-lg bg-noche-900/90 px-3 py-2 text-xs text-nieve-200">
          Tu navegador no permitió reproducir la música. Puedes seguir la aventura sin sonido.
        </p>
      )}
      <button type="button" onClick={toggleReduceMotion} aria-pressed={reduceMotion} className={btn}>
        <span aria-hidden>{reduceMotion ? "🧊" : "✨"}</span>
        <span className="sr-only sm:not-sr-only">{reduceMotion ? "Activar animaciones" : "Reducir movimiento"}</span>
      </button>
    </div>
  );
}
