"use client";

import { useActionState, useState } from "react";
import { TreeView } from "@/components/tree/TreeArt";
import { Button, Card, ErrorNote, inputClass } from "@/components/ui";
import { ASPECT_LABELS, PRIORITY_LABELS, PURCHASE_LABELS, STEP_TITLES } from "@/lib/labels";
import { PURCHASE_STATUSES } from "@/lib/validation";
import { deleteChild, regenerateLink, saveWishStatus, type LinkState, type SimpleState } from "./actions";
import type { ParentChildView, ParentWishView } from "./data";
import { LinkReveal } from "./LinkReveal";

const dateFmt = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

export function ChildCard({ child }: { child: ParentChildView }) {
  const { journey } = child;
  const status = journey.completedAt
    ? { text: `Carta enviada · ${dateFmt.format(new Date(journey.completedAt))}`, cls: "bg-pino-600" }
    : journey.currentStep > 0
      ? { text: `En el capítulo: ${STEP_TITLES[journey.currentStep]}`, cls: "bg-noche-600" }
      : { text: "Aún no empieza", cls: "bg-white/10" };

  return (
    <Card>
      <details className="group" open>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
          <span>
            <span className="font-display text-2xl">{child.displayName}</span>
            {journey.preferredName && journey.preferredName !== child.displayName && (
              <span className="ml-2 text-sm text-nieve-200">(se presentó como “{journey.preferredName}”)</span>
            )}
          </span>
          <span suppressHydrationWarning className={`rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>
            {status.text}
          </span>
        </summary>

        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_200px]">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-nieve-200">Lo que más le gusta:</span>{" "}
              {journey.favoriteChristmasAspect
                ? `${ASPECT_LABELS[journey.favoriteChristmasAspect].emoji} ${ASPECT_LABELS[journey.favoriteChristmasAspect].label}`
                : "—"}
            </p>
            <p className="whitespace-pre-line">
              <span className="text-nieve-200">Lo que hace especial su Navidad:</span> {journey.specialMemory ?? "—"}
            </p>
          </div>
          <TreeView
            design={journey.treeDesign}
            className="mx-auto h-40 w-40 rounded-2xl bg-noche-950/50"
            label={`Árbol de ${child.displayName} con ${journey.treeDesign.length} adornos`}
          />
        </div>

        <h3 className="mt-6 font-semibold text-oro-300">Libro de deseos ({child.wishes.length})</h3>
        {child.wishes.length === 0 ? (
          <p className="mt-2 text-sm text-nieve-200">Todavía no hay deseos.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {child.wishes.map((wish) => (
              <WishRow key={wish.id} wish={wish} />
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
          <RegenerateLink childId={child.id} />
          <DeleteChild childId={child.id} name={child.displayName} />
        </div>
      </details>
    </Card>
  );
}

function WishRow({ wish }: { wish: ParentWishView }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(saveWishStatus, {});
  return (
    <li className="rounded-2xl border border-white/10 bg-noche-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            <span className="text-oro-400" aria-label={PRIORITY_LABELS[wish.priority]?.label}>
              {PRIORITY_LABELS[wish.priority]?.stars}
            </span>{" "}
            {wish.title}
          </p>
          {wish.description && <p className="mt-1 text-sm text-nieve-200">{wish.description}</p>}
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {wish.url && (
              <a href={wish.url} target="_blank" rel="noopener noreferrer nofollow" className="text-oro-300 underline">
                Ver enlace
              </a>
            )}
            {wish.imageUrl && (
              <a href={wish.imageUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-oro-300 underline">
                Ver imagen
              </a>
            )}
          </div>
        </div>
      </div>
      <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
        <input type="hidden" name="wishId" value={wish.id} />
        <div>
          <label htmlFor={`st-${wish.id}`} className="mb-1 block text-xs text-nieve-200">
            Estado de compra (privado)
          </label>
          <select id={`st-${wish.id}`} name="purchaseStatus" defaultValue={wish.purchaseStatus} className={inputClass}>
            {PURCHASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PURCHASE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`nt-${wish.id}`} className="mb-1 block text-xs text-nieve-200">
            Nota privada
          </label>
          <input
            id={`nt-${wish.id}`}
            name="privateNote"
            maxLength={500}
            defaultValue={wish.privateNote ?? ""}
            placeholder="Ej.: comprado en la tienda X, escondido en…"
            className={inputClass}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </form>
      <div className="mt-2 text-xs" aria-live="polite">
        {state.ok && !pending && <span className="text-pino-500">Guardado ✓</span>}
      </div>
      {state.error && <ErrorNote>{state.error}</ErrorNote>}
    </li>
  );
}

function RegenerateLink({ childId }: { childId: string }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(regenerateLink, {});
  return (
    <div className="w-full sm:w-auto">
      <form action={action}>
        <input type="hidden" name="childId" value={childId} />
        <Button type="submit" variant="ghost" disabled={pending}>
          {pending ? "Generando…" : "Generar nuevo enlace"}
        </Button>
      </form>
      {state.error && <ErrorNote>{state.error}</ErrorNote>}
      {state.link && <LinkReveal link={state.link} childName={state.childName} />}
    </div>
  );
}

function DeleteChild({ childId, name }: { childId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<SimpleState, FormData>(deleteChild, {});

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Borrar participante y sus datos
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-3" role="group" aria-label="Confirmar borrado">
      <input type="hidden" name="childId" value={childId} />
      <p className="text-sm">
        ¿Borrar a <strong>{name}</strong> con sus respuestas, árbol, deseos y notas? No se puede deshacer.
      </p>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Borrando…" : "Sí, borrar todo"}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
        Cancelar
      </Button>
      {state.error && <ErrorNote>{state.error}</ErrorNote>}
    </form>
  );
}
