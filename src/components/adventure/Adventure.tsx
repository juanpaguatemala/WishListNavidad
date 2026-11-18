"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { AdventureState } from "@/lib/adventure/types";
import { ASPECT_LABELS, PRIORITY_LABELS, STEP_TITLES } from "@/lib/labels";
import {
  CHRISTMAS_ASPECTS,
  childNameSchema,
  firstIssue,
  type ChristmasAspect,
  type JourneyPatch,
  type Ornament,
} from "@/lib/validation";
import { useExperience } from "../Experience";
import { Snowfall } from "../Snowfall";
import { TreeView } from "../tree/TreeArt";
import { Button, ErrorNote, inputClass } from "../ui";
import { callAdventure } from "./api";
import { SantaSays } from "./SantaSays";
import { TreeDecorator } from "./TreeDecorator";
import { WishBook } from "./WishBook";

const FINAL_STEP = 6;

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function Adventure({ token, initialState }: { token: string; initialState: AdventureState }) {
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(() =>
    initialState.journey.completedAt ? FINAL_STEP : Math.min(initialState.journey.currentStep, 5),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);
  const { reduceMotion } = useExperience();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const name = state.journey.preferredName ?? state.displayName;
  const maxReached = Math.max(state.journey.currentStep, step);

  // Al cambiar de capítulo, lleva el foco al título (lectores de pantalla y teclado).
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  /** Ejecuta una operación y solo actualiza la UI con el estado confirmado por el servidor. */
  async function run(op: () => Promise<AdventureState>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      setState(await op());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal. Inténtalo otra vez.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function advance(patch: JourneyPatch, next: number) {
    const ok = await run(() =>
      callAdventure(token, "PATCH", "/journey", {
        ...patch,
        currentStep: Math.max(Math.min(next, 5), state.journey.currentStep),
      }),
    );
    if (ok) setStep(next);
    return ok;
  }

  function go(next: number) {
    setError(null);
    setStep(next);
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <Snowfall />
      <div className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-36 pt-6 sm:px-6">
        <ChapterNav step={step} maxReached={maxReached} completed={Boolean(state.journey.completedAt)} onGo={go} disabled={busy} />

        {!online && (
          <p role="status" className="mt-4 rounded-2xl bg-oro-500/20 px-4 py-2 text-sm text-oro-300">
            Sin conexión. Cuando vuelva el internet podrás seguir guardando tu aventura.
          </p>
        )}

        <h1 ref={headingRef} tabIndex={-1} className="mt-6 font-display text-3xl text-oro-400 focus:outline-none sm:text-4xl">
          {STEP_TITLES[step]}
        </h1>

        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
            className="mt-5 space-y-6"
          >
            {step === 0 && <WelcomeStep busy={busy} onStart={() => advance({}, 1)} />}
            {step === 1 && <NameStep initial={name} busy={busy} onSubmit={(n) => advance({ preferredName: n }, 2)} />}
            {step === 2 && (
              <QuestionsStep
                name={name}
                initialAspect={state.journey.favoriteChristmasAspect}
                initialMemory={state.journey.specialMemory ?? ""}
                busy={busy}
                onSubmit={(aspect, memory) =>
                  advance({ favoriteChristmasAspect: aspect, specialMemory: memory }, 3)
                }
              />
            )}
            {step === 3 && (
              <>
                <SantaSays mood="feliz">
                  ¡Mi árbol está esperando sus adornos, {name}! Elige esferas, luces, lazos, bastones y una estrella para la punta.
                </SantaSays>
                <TreeDecorator
                  initial={state.journey.treeDesign}
                  busy={busy}
                  onSave={(design: Ornament[]) => run(() => callAdventure(token, "PATCH", "/journey", { treeDesign: design }))}
                  onFinish={(design: Ornament[]) => advance({ treeDesign: design }, 4)}
                />
              </>
            )}
            {step === 4 && (
              <>
                <SantaSays mood="lee">
                  Este es tu libro de deseos. Escribe los regalos que sueñas y ordénalos como quieras. Lo leeré con mucho
                  cariño.
                </SantaSays>
                <WishBook token={token} wishes={state.wishes} busy={busy} run={run} />
                <div className="flex flex-wrap justify-end gap-3">
                  <Button onClick={() => advance({}, 5)} disabled={busy || state.wishes.length === 0}>
                    Escribir mi carta →
                  </Button>
                </div>
              </>
            )}
            {step === 5 && (
              <LetterStep
                state={state}
                name={name}
                busy={busy}
                onEdit={go}
                onSend={async () => {
                  const ok = await run(() => callAdventure(token, "POST", "/complete"));
                  if (ok) setStep(FINAL_STEP);
                }}
              />
            )}
            {step === FINAL_STEP && state.journey.completedAt && <FinalStep name={name} onEdit={go} />}
          </motion.section>
        </AnimatePresence>

        {error && (
          <div className="mt-6">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
      </div>
    </div>
  );
}

function ChapterNav(props: {
  step: number;
  maxReached: number;
  completed: boolean;
  disabled: boolean;
  onGo: (step: number) => void;
}) {
  return (
    <nav aria-label="Capítulos de la aventura">
      <p className="text-sm text-nieve-200">
        Capítulo {props.step + 1} de {STEP_TITLES.length}
      </p>
      <ol className="mt-2 flex gap-1.5">
        {STEP_TITLES.map((title, i) => {
          const reachable = i === 6 ? props.completed : i <= props.maxReached;
          const current = i === props.step;
          return (
            <li key={title} className="flex-1">
              <button
                type="button"
                onClick={() => props.onGo(i)}
                disabled={!reachable || props.disabled || current}
                aria-current={current ? "step" : undefined}
                aria-label={`Capítulo ${i + 1}: ${title}${reachable ? "" : " (aún no disponible)"}`}
                className="group block w-full py-2"
              >
                <span
                  className={`block h-2 rounded-full transition ${
                    current ? "bg-oro-400" : reachable ? "bg-pino-500 group-hover:bg-pino-500/70" : "bg-white/15"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function WelcomeStep({ busy, onStart }: { busy: boolean; onStart: () => void }) {
  return (
    <div className="grid items-center gap-6">
      <SantaSays mood="saluda">
        <p>
          ¡Jo, jo, jo! Te doy la bienvenida a mi taller del Polo Norte. Esta noche las estrellas me susurraron que alguien muy
          especial abriría este libro mágico…
        </p>
        <p className="mt-2">¿Me acompañas en una pequeña aventura?</p>
      </SantaSays>
      <div className="flex justify-end">
        <Button onClick={onStart} disabled={busy} className="text-lg">
          {busy ? "Abriendo el libro…" : "¡Sí, empecemos! ✨"}
        </Button>
      </div>
    </div>
  );
}

function NameStep({ initial, busy, onSubmit }: { initial: string; busy: boolean; onSubmit: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = childNameSchema.safeParse(value);
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <>
      <SantaSays mood="piensa">Antes de seguir… ¿cómo te gusta que te llamen? Puede ser tu nombre o tu apodo.</SantaSays>
      <form onSubmit={submit} noValidate className="mx-auto max-w-md space-y-3">
        <label htmlFor="nombre" className="block font-semibold">
          Me llamo…
        </label>
        <input
          id="nombre"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={40}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby="nombre-ayuda"
          className={`${inputClass} text-xl`}
        />
        <p id="nombre-ayuda" className="text-sm text-nieve-200">
          {error ?? "Solo tu nombre o apodo, nada más."}
        </p>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Guardando…" : "¡Ese soy yo!"}
        </Button>
      </form>
    </>
  );
}

function QuestionsStep(props: {
  name: string;
  initialAspect: ChristmasAspect | null;
  initialMemory: string;
  busy: boolean;
  onSubmit: (aspect: ChristmasAspect, memory: string | null) => void;
}) {
  const [aspect, setAspect] = useState<ChristmasAspect | null>(props.initialAspect);
  const [memory, setMemory] = useState(props.initialMemory);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!aspect) {
      setError("Elige lo que más te gusta de la Navidad");
      return;
    }
    setError(null);
    props.onSubmit(aspect, memory.trim() || null);
  }

  return (
    <>
      <SantaSays mood="feliz">
        ¡Qué gusto conocerte, <strong>{props.name}</strong>! Cuéntame… ¿qué es lo que más te gusta de la Navidad?
      </SantaSays>
      <form onSubmit={submit} noValidate className="space-y-6">
        <fieldset>
          <legend className="sr-only">Lo que más me gusta de la Navidad</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CHRISTMAS_ASPECTS.map((a) => (
              <label
                key={a}
                className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-3xl border-2 p-3 text-center transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-oro-400 ${
                  aspect === a ? "border-oro-400 bg-oro-500/15" : "border-white/10 bg-noche-800/60 hover:bg-noche-700/60"
                }`}
              >
                <input
                  type="radio"
                  name="aspect"
                  value={a}
                  checked={aspect === a}
                  onChange={() => setAspect(a)}
                  className="sr-only"
                />
                <span aria-hidden className="text-3xl">
                  {ASPECT_LABELS[a].emoji}
                </span>
                <span className="font-semibold">{ASPECT_LABELS[a].label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="especial" className="mb-1 block font-semibold">
            ¿Qué hace especial tu Navidad? <span className="font-normal text-nieve-200">(si quieres contarme)</span>
          </label>
          <textarea
            id="especial"
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            maxLength={500}
            rows={3}
            className={inputClass}
            placeholder="Por ejemplo: cuando hacemos galletas con la abuela…"
          />
          <p className="mt-1 text-right text-xs text-nieve-200">{memory.length}/500</p>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end">
          <Button type="submit" disabled={props.busy}>
            {props.busy ? "Guardando…" : "Contarle a Santa →"}
          </Button>
        </div>
      </form>
    </>
  );
}

function LetterStep(props: {
  state: AdventureState;
  name: string;
  busy: boolean;
  onEdit: (step: number) => void;
  onSend: () => void;
}) {
  const { journey, wishes } = props.state;
  const aspect = journey.favoriteChristmasAspect ? ASPECT_LABELS[journey.favoriteChristmasAspect] : null;
  return (
    <>
      <SantaSays mood="lee">Revisa tu carta. Si todo está como quieres, envíamela con un poquito de magia.</SantaSays>
      <article className="paper mx-auto max-w-2xl rounded-[2rem] p-6 font-display text-lg leading-8 shadow-2xl sm:p-10">
        <p>Querido Santa:</p>
        <p className="mt-3">
          Me llamo <strong>{props.name}</strong>.
          {aspect && <> Lo que más me gusta de la Navidad es {aspect.phrase}.</>}
        </p>
        {journey.specialMemory && (
          <p className="mt-3 whitespace-pre-line">Mi Navidad es especial porque {journey.specialMemory}</p>
        )}
        <div className="mt-3 flex items-center gap-4">
          <TreeView
            design={journey.treeDesign}
            className="h-24 w-24 shrink-0"
            label={`Mi árbol con ${journey.treeDesign.length} adornos`}
          />
          <p>Decoré mi árbol con {journey.treeDesign.length} adornos.</p>
        </div>
        <p className="mt-3">Estos son mis deseos:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-6">
          {wishes.map((w) => (
            <li key={w.id}>
              {w.title}{" "}
              <span className="text-oro-600" aria-label={PRIORITY_LABELS[w.priority]?.label}>
                {PRIORITY_LABELS[w.priority]?.stars}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5">Con cariño,</p>
        <p className="font-semibold">{props.name}</p>
      </article>

      {journey.completedAt && (
        <p className="text-center text-sm text-nieve-200">
          Ya enviaste tu carta antes. Si cambiaste algo, envíala otra vez para que Santa tenga la versión más nueva.
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => props.onEdit(4)} disabled={props.busy}>
            Cambiar deseos
          </Button>
          <Button variant="ghost" onClick={() => props.onEdit(3)} disabled={props.busy}>
            Cambiar árbol
          </Button>
          <Button variant="ghost" onClick={() => props.onEdit(2)} disabled={props.busy}>
            Cambiar respuestas
          </Button>
        </div>
        <Button onClick={props.onSend} disabled={props.busy || wishes.length === 0} className="text-lg">
          {props.busy ? "Enviando al Polo Norte…" : "Enviar mi carta a Santa ✉️"}
        </Button>
      </div>
    </>
  );
}

function FinalStep({ name, onEdit }: { name: string; onEdit: (step: number) => void }) {
  return (
    <>
      <SantaSays mood="saluda">
        <p>
          ¡Jo, jo, jo! Tu carta llegó al Polo Norte, <strong>{name}</strong>. La leeré con calma junto a la chimenea.
        </p>
        <p className="mt-2">
          Recuerda que la magia más grande de la Navidad está en compartir, abrazar y dar gracias. ¡Feliz Navidad!
        </p>
      </SantaSays>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="ghost" onClick={() => onEdit(4)}>
          Volver a mis deseos
        </Button>
        <Button variant="ghost" onClick={() => onEdit(3)}>
          Ver mi árbol
        </Button>
      </div>
    </>
  );
}
