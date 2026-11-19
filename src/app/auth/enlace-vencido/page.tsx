import type { Metadata } from "next";
import { Santa } from "@/components/Santa";
import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Enlace vencido · Mi Navidad Mágica" };

export default function EnlaceVencidoPage() {
  return (
    <main id="contenido" className="flex flex-1 items-center justify-center px-5 py-16">
      <Card className="w-full max-w-md text-center">
        <Santa mood="piensa" className="mx-auto h-40 w-36" />
        <h1 className="mt-4 font-display text-2xl text-oro-400">Este enlace ya se usó o venció</h1>
        <p className="mt-3 text-nieve-200">
          Si ya habías confirmado tu correo antes, no te preocupes: tu cuenta está lista. Solo inicia sesión.
        </p>
        <p className="mt-2 text-sm text-nieve-200">
          Si nunca lo confirmaste, vuelve a registrarte con el mismo correo para recibir un enlace nuevo.
        </p>
        <ButtonLink href="/padres/login" className="mt-6 w-full">
          Iniciar sesión
        </ButtonLink>
      </Card>
    </main>
  );
}
