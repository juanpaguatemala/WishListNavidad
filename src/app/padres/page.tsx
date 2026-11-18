import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConfigPending } from "@/components/ConfigPending";
import { Santa } from "@/components/Santa";
import { Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { ChildCard } from "./ChildCard";
import { CreateChildForm } from "./CreateChildForm";
import { loadHousehold, type ParentChildView } from "./data";

export const metadata: Metadata = { title: "Panel de padres · Mi Navidad Mágica" };

export default function PadresPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-8 sm:px-6">
      {isSupabaseConfigured() ? (
        <Suspense
          fallback={
            <p className="flex items-center gap-3 text-nieve-200">
              <Spinner label="Cargando panel" /> Abriendo el panel…
            </p>
          }
        >
          <Dashboard />
        </Suspense>
      ) : (
        <ConfigPending missing={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]} />
      )}
    </main>
  );
}

async function Dashboard() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/padres/login");

  let children: ParentChildView[] | null = null;
  const { error: householdError } = await supabase.rpc("ensure_household");
  if (!householdError) {
    try {
      children = await loadHousehold(supabase);
    } catch {
      children = null;
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Santa mood="lee" className="h-16 w-16" />
          <div>
            <h1 className="font-display text-3xl text-oro-400">Panel de padres</h1>
            <p className="text-sm text-nieve-200">
              Sesión: <span className="font-semibold text-nieve">{user.email}</span>. Nada de esto es visible para los niños.
            </p>
          </div>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Cerrar sesión
          </Button>
        </form>
      </header>

      <Card>
        <h2 className="font-display text-xl text-oro-400">Crear una aventura</h2>
        <p className="mt-1 text-sm text-nieve-200">
          Solo el nombre de pila o un apodo. No pedimos correos, fechas de nacimiento, direcciones ni fotos de los niños.
        </p>
        <CreateChildForm />
      </Card>

      {children === null ? (
        <ErrorNote>
          No pudimos cargar tu hogar. Revisa la conexión y que las migraciones de Supabase estén aplicadas, y recarga la página.
        </ErrorNote>
      ) : children.length === 0 ? (
        <Card className="text-center">
          <p className="text-nieve-200">Todavía no hay aventuras. Crea la primera arriba ✨</p>
        </Card>
      ) : (
        <section aria-labelledby="participantes" className="space-y-4">
          <h2 id="participantes" className="font-display text-2xl">
            Participantes
          </h2>
          {children.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}
        </section>
      )}
    </div>
  );
}
