import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Adventure } from "@/components/adventure/Adventure";
import { ConfigPending } from "@/components/ConfigPending";
import { Santa } from "@/components/Santa";
import { ButtonLink, Card, Spinner } from "@/components/ui";
import { AdventureError, loadAdventureState, resolveChildByToken } from "@/lib/adventure/server";
import type { AdventureState } from "@/lib/adventure/types";
import { isChildAccessConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Tu aventura con Santa · Mi Navidad Mágica",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdventurePage({ params }: PageProps<"/aventura/[token]">) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <Santa mood="lee" className="h-36 w-32" />
            <p className="flex items-center gap-3 text-lg">
              <Spinner label="Cargando aventura" /> Santa está buscando tu libro mágico…
            </p>
          </div>
        }
      >
        <AdventureLoader params={params} />
      </Suspense>
    </main>
  );
}

async function AdventureLoader({ params }: { params: PageProps<"/aventura/[token]">["params"] }) {
  const { token } = await params;

  if (!isChildAccessConfigured()) {
    return (
      <div className="p-6">
        <ConfigPending
          missing={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]}
        />
      </div>
    );
  }

  let state: AdventureState | null = null;
  let failure: "invalid" | "error" | null = null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "desconocida";
  if (!rateLimit(`page:${ip}`, 60, 60_000).ok) {
    failure = "error";
  } else try {
    const child = await resolveChildByToken(token);
    if (!child) failure = "invalid";
    else state = await loadAdventureState(child);
  } catch (error) {
    failure = "error";
    if (!(error instanceof AdventureError)) console.error("[aventura] fallo al cargar", error);
  }

  if (failure === "invalid" || !state) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <Santa mood="piensa" className="mx-auto h-36 w-32" />
          {failure === "invalid" ? (
            <>
              <h1 className="mt-4 font-display text-2xl text-oro-400">Este enlace mágico no funciona</h1>
              <p className="mt-2 text-nieve-200">
                Puede que esté incompleto o que tus papás hayan creado uno nuevo. Pídeles el enlace correcto.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-4 font-display text-2xl text-oro-400">El trineo tuvo un problemita</h1>
              <p className="mt-2 text-nieve-200">No pudimos abrir tu libro mágico. Revisa tu conexión e inténtalo de nuevo.</p>
            </>
          )}
          <ButtonLink href="/" variant="ghost" className="mt-6">
            Ir a la portada
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return <Adventure token={token} initialState={state} />;
}
