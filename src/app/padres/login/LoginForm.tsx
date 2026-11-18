"use client";

import { useActionState, useState } from "react";
import { Button, ErrorNote, inputClass } from "@/components/ui";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"entrar" | "crear">("entrar");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "entrar" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <div>
      <div role="group" aria-label="Tipo de acceso" className="mb-6 grid grid-cols-2 rounded-full bg-noche-950/60 p-1">
        {(["entrar", "crear"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-full text-sm font-semibold transition ${
              mode === m ? "bg-oro-500 text-noche-950" : "text-nieve-200 hover:text-nieve"
            }`}
          >
            {m === "entrar" ? "Ya tengo cuenta" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form action={mode === "entrar" ? signInAction : signUpAction} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Correo electrónico
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            required
            className={inputClass}
          />
          {mode === "crear" && <p className="mt-1 text-xs text-nieve-200">Mínimo 8 caracteres.</p>}
        </div>

        {state.error && <ErrorNote>{state.error}</ErrorNote>}
        {state.info && (
          <p role="status" className="rounded-2xl border border-pino-500 bg-pino-700/40 px-4 py-3 text-sm">
            {state.info}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Un momento…" : mode === "entrar" ? "Entrar al panel" : "Crear mi cuenta"}
        </Button>
      </form>
    </div>
  );
}
