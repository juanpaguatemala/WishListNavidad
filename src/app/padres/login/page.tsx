import type { Metadata } from "next";
import Link from "next/link";
import { ConfigPending } from "@/components/ConfigPending";
import { Santa } from "@/components/Santa";
import { Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Acceso para padres · Mi Navidad Mágica" };

export default function LoginPage() {
  return (
    <main id="contenido" className="flex flex-1 items-center justify-center px-5 py-16">
      {isSupabaseConfigured() ? (
        <Card className="w-full max-w-md">
          <div className="mb-4 flex items-center gap-4">
            <Santa mood="feliz" className="h-20 w-20 shrink-0" />
            <div>
              <h1 className="font-display text-2xl text-oro-400">Panel de padres</h1>
              <p className="text-sm text-nieve-200">Un espacio privado para preparar la magia.</p>
            </div>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-oro-300 underline underline-offset-4">
              Volver a la portada
            </Link>
          </p>
        </Card>
      ) : (
        <ConfigPending missing={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]} />
      )}
    </main>
  );
}
