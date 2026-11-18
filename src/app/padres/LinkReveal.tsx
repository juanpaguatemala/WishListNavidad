"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Muestra el enlace mágico una sola vez (solo se guarda su hash). */
export function LinkReveal({ link, childName }: { link: string; childName?: string }) {
  const [copied, setCopied] = useState<"no" | "si" | "error">("no");

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied("si");
    } catch {
      setCopied("error");
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-oro-500/60 bg-noche-950/60 p-4">
      <p className="text-sm font-semibold text-oro-300">
        Enlace mágico{childName ? ` de ${childName}` : ""}. Cópialo ahora: por seguridad no podremos mostrarlo otra vez.
      </p>
      <label className="sr-only" htmlFor="enlace-magico">
        Enlace mágico
      </label>
      <input
        id="enlace-magico"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full rounded-xl bg-noche-900 px-3 py-2 font-mono text-xs text-nieve"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={copy}>
          Copiar enlace
        </Button>
        <span role="status" className="text-sm text-nieve-200">
          {copied === "si" && "¡Copiado!"}
          {copied === "error" && "No se pudo copiar; selecciona el texto y cópialo manualmente."}
        </span>
      </div>
      <p className="mt-2 text-xs text-nieve-200">
        Compártelo solo con tu hijo o hija. Si se pierde o se comparte por error, genera uno nuevo y el anterior dejará de funcionar.
      </p>
    </div>
  );
}
