import { Santa } from "@/components/Santa";
import { Snowfall } from "@/components/Snowfall";
import { HeroIntro } from "./HeroIntro";

export default function Home() {
  return (
    <main id="contenido" className="relative flex flex-1 flex-col overflow-hidden">
      <Snowfall />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 flex justify-around">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-oro-300 animate-twinkle"
            style={{ animationDelay: `${i * 0.37}s`, marginTop: `${(i * 23) % 60}px` }}
          />
        ))}
      </div>

      <section className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-5 pb-28 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <HeroIntro />
        <div className="relative mx-auto w-64 sm:w-80 md:w-full md:max-w-md">
          <div aria-hidden className="absolute inset-6 rounded-full bg-oro-500/20 blur-3xl" />
          <Santa mood="saluda" className="relative w-full drop-shadow-2xl" label="Santa Claus saludando" />
        </div>
      </section>

      <section aria-labelledby="como-funciona" className="relative mx-auto w-full max-w-6xl px-5 pb-32">
        <h2 id="como-funciona" className="font-display text-2xl text-oro-400">
          ¿Cómo funciona?
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["1", "Mamá o papá crea la aventura", "Desde el panel privado, con solo el nombre de pila o un apodo."],
            ["2", "Comparte el enlace mágico", "Un enlace privado e irrepetible para cada niño o niña."],
            ["3", "¡Comienza el cuento!", "Responde a Santa, decora el árbol y escribe el libro de deseos."],
          ].map(([n, title, body]) => (
            <li key={n} className="rounded-3xl border border-white/10 bg-noche-800/60 p-5">
              <span className="font-display text-3xl text-oro-400">{n}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-nieve-200">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
