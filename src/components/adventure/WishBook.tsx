"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useState, type FormEvent } from "react";
import type { AdventureState, ChildWish } from "@/lib/adventure/types";
import { PRIORITY_LABELS } from "@/lib/labels";
import { MAX_WISHES, wishInputSchema, type WishFormValues } from "@/lib/validation";
import { Button } from "../ui";
import { callAdventure } from "./api";

type Props = {
  token: string;
  wishes: ChildWish[];
  busy: boolean;
  run: (op: () => Promise<AdventureState>) => Promise<boolean>;
};

const EMPTY: WishFormValues = { title: "", description: "", url: "", imageUrl: "", priority: 2 };

export function WishBook({ token, wishes, busy, run }: Props) {
  const [editing, setEditing] = useState<string | "nuevo" | null>(wishes.length === 0 ? "nuevo" : null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function move(index: number, dir: -1 | 1) {
    const ids = wishes.map((w) => w.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => callAdventure(token, "PUT", "/wishes", { ids }));
  }

  async function remove(id: string) {
    const ok = await run(() => callAdventure(token, "DELETE", `/wishes/${id}`));
    if (ok) setConfirmDelete(null);
  }

  return (
    <div className="space-y-5">
      {wishes.length === 0 && editing !== "nuevo" && (
        <p className="rounded-3xl border border-dashed border-white/20 p-6 text-center text-nieve-200">
          Tu libro de deseos está vacío. ¡Escribe tu primer deseo!
        </p>
      )}

      <ol className="space-y-3" aria-label="Mis deseos">
        <AnimatePresence initial={false}>
          {wishes.map((wish, i) => (
            <motion.li
              key={wish.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="paper rounded-3xl p-4 shadow-lg"
            >
              {editing === wish.id ? (
                <WishForm
                  initial={{
                    title: wish.title,
                    description: wish.description ?? "",
                    url: wish.url ?? "",
                    imageUrl: wish.imageUrl ?? "",
                    priority: wish.priority,
                  }}
                  busy={busy}
                  submitLabel="Guardar cambios"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (data) => {
                    const ok = await run(() => callAdventure(token, "PATCH", `/wishes/${wish.id}`, data));
                    if (ok) setEditing(null);
                    return ok;
                  }}
                />
              ) : (
                <WishView
                  wish={wish}
                  index={i}
                  total={wishes.length}
                  busy={busy}
                  confirming={confirmDelete === wish.id}
                  onEdit={() => setEditing(wish.id)}
                  onMove={(dir) => move(i, dir)}
                  onAskDelete={() => setConfirmDelete(wish.id)}
                  onCancelDelete={() => setConfirmDelete(null)}
                  onDelete={() => remove(wish.id)}
                />
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {editing === "nuevo" ? (
        <div className="paper rounded-3xl p-4 shadow-lg">
          <WishForm
            initial={EMPTY}
            busy={busy}
            submitLabel="Agregar a mi libro"
            onCancel={wishes.length ? () => setEditing(null) : undefined}
            onSubmit={async (data) => {
              const ok = await run(() => callAdventure(token, "POST", "/wishes", data));
              if (ok) setEditing(null);
              return ok;
            }}
          />
        </div>
      ) : wishes.length < MAX_WISHES ? (
        <Button variant="secondary" onClick={() => setEditing("nuevo")} disabled={busy || editing !== null}>
          ✍️ Escribir otro deseo
        </Button>
      ) : (
        <p className="text-sm text-nieve-200">Tu libro ya tiene {MAX_WISHES} deseos. ¡Está lleno de magia!</p>
      )}
    </div>
  );
}

function WishView(props: {
  wish: ChildWish;
  index: number;
  total: number;
  busy: boolean;
  confirming: boolean;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const { wish, index, total, busy, confirming } = props;
  const [imageOk, setImageOk] = useState(true);
  const small =
    "min-h-11 rounded-full border border-noche-700/30 px-3 text-sm font-semibold text-noche-800 hover:bg-noche-900/10 disabled:opacity-40";

  return (
    <div className="flex gap-4">
      {wish.imageUrl && imageOk && (
        // Imagen elegida por el niño: sin optimizador remoto ni referrer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={wish.imageUrl}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImageOk(false)}
          className="h-20 w-20 shrink-0 rounded-2xl object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-arandano-700">
          <span aria-hidden>{PRIORITY_LABELS[wish.priority]?.stars} </span>
          {PRIORITY_LABELS[wish.priority]?.label}
        </p>
        <h3 className="break-words font-display text-xl">{wish.title}</h3>
        {wish.description && <p className="mt-1 break-words text-noche-800">{wish.description}</p>}
        {wish.url && (
          <a
            href={wish.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-1 inline-block text-sm font-semibold text-pino-700 underline"
          >
            Ver dónde está este regalo
          </a>
        )}
        {confirming ? (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar borrado">
            <span className="text-sm font-semibold">¿Borrar este deseo?</span>
            <button type="button" className={small} onClick={props.onDelete} disabled={busy}>
              Sí, borrar
            </button>
            <button type="button" className={small} onClick={props.onCancelDelete} disabled={busy}>
              No
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={small}
              onClick={() => props.onMove(-1)}
              disabled={busy || index === 0}
              aria-label={`Subir “${wish.title}”`}
            >
              ↑ Subir
            </button>
            <button
              type="button"
              className={small}
              onClick={() => props.onMove(1)}
              disabled={busy || index === total - 1}
              aria-label={`Bajar “${wish.title}”`}
            >
              ↓ Bajar
            </button>
            <button type="button" className={small} onClick={props.onEdit} disabled={busy}>
              Editar
            </button>
            <button type="button" className={small} onClick={props.onAskDelete} disabled={busy}>
              Borrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type FieldErrors = Partial<Record<keyof WishFormValues, string>>;

function WishForm(props: {
  initial: WishFormValues;
  busy: boolean;
  submitLabel: string;
  onSubmit: (data: ReturnType<typeof wishInputSchema.parse>) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<WishFormValues>(props.initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showExtras, setShowExtras] = useState(Boolean(props.initial.url || props.initial.imageUrl));
  const id = useId();

  const field =
    "w-full rounded-2xl border border-noche-700/30 bg-white/80 px-4 py-3 text-base text-noche-900 placeholder:text-noche-700/50 focus:border-arandano-600 focus:outline-none";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = wishInputSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof WishFormValues;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      if (next.url || next.imageUrl) setShowExtras(true);
      return;
    }
    setErrors({});
    await props.onSubmit(parsed.data);
  }

  const set = (key: keyof WishFormValues) => (v: string | number) => setValues((s) => ({ ...s, [key]: v }));

  return (
    <form onSubmit={submit} noValidate className="space-y-3 text-noche-900">
      <div>
        <label htmlFor={`${id}-t`} className="mb-1 block font-semibold">
          ¿Qué regalo deseas? <span aria-hidden>*</span>
        </label>
        <input
          id={`${id}-t`}
          value={values.title}
          onChange={(e) => set("title")(e.target.value)}
          maxLength={80}
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? `${id}-te` : undefined}
          placeholder="Ej.: Un libro de dinosaurios"
          className={field}
        />
        {errors.title && (
          <p id={`${id}-te`} className="mt-1 text-sm font-semibold text-arandano-700">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-d`} className="mb-1 block font-semibold">
          Cuéntale más a Santa (opcional)
        </label>
        <textarea
          id={`${id}-d`}
          value={values.description ?? ""}
          onChange={(e) => set("description")(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Color, tamaño, por qué te gustaría…"
          className={field}
        />
        {errors.description && <p className="mt-1 text-sm font-semibold text-arandano-700">{errors.description}</p>}
      </div>

      <fieldset>
        <legend className="mb-1 font-semibold">¿Cuánto lo deseas?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((p) => (
            <label
              key={p}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-oro-500 ${
                values.priority === p ? "border-arandano-600 bg-arandano-600/10" : "border-noche-700/30"
              }`}
            >
              <input
                type="radio"
                name={`${id}-p`}
                checked={values.priority === p}
                onChange={() => set("priority")(p)}
                className="accent-arandano-600"
              />
              <span className="text-oro-600" aria-hidden>
                {PRIORITY_LABELS[p].stars}
              </span>
              <span className="text-sm">{PRIORITY_LABELS[p].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {showExtras ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-u`} className="mb-1 block text-sm font-semibold">
              Enlace del regalo (opcional)
            </label>
            <input
              id={`${id}-u`}
              type="url"
              inputMode="url"
              value={values.url ?? ""}
              onChange={(e) => set("url")(e.target.value)}
              placeholder="https://…"
              aria-invalid={Boolean(errors.url)}
              className={field}
            />
            {errors.url && <p className="mt-1 text-sm font-semibold text-arandano-700">{errors.url}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-i`} className="mb-1 block text-sm font-semibold">
              Enlace de una imagen (opcional)
            </label>
            <input
              id={`${id}-i`}
              type="url"
              inputMode="url"
              value={values.imageUrl ?? ""}
              onChange={(e) => set("imageUrl")(e.target.value)}
              placeholder="https://…"
              aria-invalid={Boolean(errors.imageUrl)}
              className={field}
            />
            {errors.imageUrl && <p className="mt-1 text-sm font-semibold text-arandano-700">{errors.imageUrl}</p>}
          </div>
          <p className="text-xs text-noche-700 sm:col-span-2">Pide ayuda a un adulto para copiar enlaces.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowExtras(true)}
          className="text-sm font-semibold text-pino-700 underline"
        >
          + Agregar enlace o imagen (con ayuda de un adulto)
        </button>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={props.busy}
          className="min-h-11 rounded-full bg-arandano-600 px-5 font-semibold text-nieve hover:bg-arandano-500 disabled:opacity-50"
        >
          {props.busy ? "Guardando…" : props.submitLabel}
        </button>
        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            disabled={props.busy}
            className="min-h-11 rounded-full border border-noche-700/30 px-5 font-semibold"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

