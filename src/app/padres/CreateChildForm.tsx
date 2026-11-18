"use client";

import { useActionState } from "react";
import { Button, ErrorNote, inputClass } from "@/components/ui";
import { createChild, type LinkState } from "./actions";
import { LinkReveal } from "./LinkReveal";

export function CreateChildForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(createChild, {});

  return (
    <div>
      <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <div className="flex-1">
          <label htmlFor="displayName" className="mb-1 block text-sm font-semibold">
            Nombre de pila o apodo
          </label>
          <input
            id="displayName"
            name="displayName"
            maxLength={40}
            required
            autoComplete="off"
            placeholder="Ej.: Sofi"
            className={inputClass}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Crear enlace mágico"}
        </Button>
      </form>
      {state.error && (
        <div className="mt-3">
          <ErrorNote>{state.error}</ErrorNote>
        </div>
      )}
      {state.link && <LinkReveal link={state.link} childName={state.childName} />}
    </div>
  );
}
