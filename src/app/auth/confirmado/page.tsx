import type { Metadata } from "next";
import { Santa } from "@/components/Santa";
import { Snowfall } from "@/components/Snowfall";
import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = { title: "¡Cuenta confirmada! · Mi Navidad Mágica" };

export default function ConfirmadoPage() {
  return (
    <main id="contenido" className="relative flex flex-1 items-center justify-center px-5 py-16">
      <Snowfall />
      <Card className="relative w-full max-w-md text-center">
        <Santa mood="saluda" className="mx-auto h-40 w-36" label="Santa celebrando" />
        <h1 className="mt-4 font-display text-3xl text-oro-400">¡Tu cuenta está confirmada!</h1>
        <p className="mt-3 text-nieve-200">
          ¡Jo, jo, jo! Ya formas parte del taller. Desde tu panel privado puedes crear la aventura de cada niño y ver
          sus libros de deseos.
        </p>
        <ButtonLink href="/padres" className="mt-6 w-full text-lg">
          Ir a mi panel de padres
        </ButtonLink>
      </Card>
    </main>
  );
}
