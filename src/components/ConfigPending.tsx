import { Card } from "./ui";

/** Se muestra cuando faltan variables de entorno de Supabase. */
export function ConfigPending({ missing }: { missing: string[] }) {
  return (
    <Card className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl text-oro-400">Configuración pendiente</h1>
      <p className="mt-3 text-nieve-200">
        El taller de Santa todavía no está conectado a la base de datos. Agrega estas variables de entorno
        (en <code>.env.local</code> o en Vercel) y vuelve a desplegar:
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-6 font-mono text-sm text-oro-300">
        {missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-nieve-200">Los pasos completos están en el README del proyecto.</p>
    </Card>
  );
}
