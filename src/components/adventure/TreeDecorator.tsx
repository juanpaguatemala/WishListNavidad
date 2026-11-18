"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { COLOR_HEX, COLOR_LABELS, ORNAMENT_LABELS } from "@/lib/labels";
import {
  MAX_ORNAMENTS,
  ORNAMENT_COLORS,
  ORNAMENT_KINDS,
  type Ornament,
  type OrnamentColor,
  type OrnamentKind,
} from "@/lib/validation";
import { clampToTree, OrnamentGlyph, TreeShape } from "../tree/TreeArt";
import { Button } from "../ui";

function newId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

function describe(o: Pick<Ornament, "kind" | "color">) {
  return `${ORNAMENT_LABELS[o.kind]} de color ${COLOR_LABELS[o.color]}`;
}

type Props = {
  initial: Ornament[];
  busy: boolean;
  onSave: (design: Ornament[]) => Promise<boolean>;
  onFinish: (design: Ornament[]) => Promise<boolean>;
};

export function TreeDecorator({ initial, busy, onSave, onFinish }: Props) {
  const [design, setDesign] = useState<Ornament[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [kind, setKind] = useState<OrnamentKind>("esfera");
  const [color, setColor] = useState<OrnamentColor>("rojo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: 50, y: 50 });
  const [focused, setFocused] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; pointerId: number } | null>(null);
  const helpId = useId();

  const selected = design.find((o) => o.id === selectedId) ?? null;

  function update(next: Ornament[], message?: string) {
    setDesign(next);
    setDirty(true);
    setSavedMsg("");
    if (message) setAnnounce(message);
  }

  function place(x: number, y: number) {
    const target = clampToTree(kind, x, y);
    if (Math.hypot(target.x - x, target.y - y) > 9) {
      setAnnounce("Toca dentro del árbol para colocar el adorno");
      return;
    }
    const existingStar = kind === "estrella" ? design.find((o) => o.kind === "estrella") : undefined;
    if (existingStar) {
      update(
        design.map((o) => (o.id === existingStar.id ? { ...o, ...target, color } : o)),
        "Moviste la estrella",
      );
      setSelectedId(existingStar.id);
      return;
    }
    if (design.length >= MAX_ORNAMENTS) {
      setAnnounce(`¡El árbol ya tiene ${MAX_ORNAMENTS} adornos! Quita alguno para poner otro.`);
      return;
    }
    const ornament: Ornament = { id: newId(), kind, color, ...target };
    update([...design, ornament], `Pusiste en el árbol: ${describe(ornament).toLowerCase()}`);
    setSelectedId(null);
  }

  function moveOrnament(id: string, x: number, y: number) {
    setDesign((list) =>
      list.map((o) => (o.id === id ? { ...o, ...clampToTree(o.kind, x, y) } : o)),
    );
    setDirty(true);
    setSavedMsg("");
  }

  function removeSelected() {
    if (!selected) return;
    update(
      design.filter((o) => o.id !== selected.id),
      `Quitaste ${describe(selected).toLowerCase()}`,
    );
    setSelectedId(null);
  }

  function pointToTree(e: PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    const hit = (e.target as Element).closest("[data-ornament-id]");
    const id = hit?.getAttribute("data-ornament-id");
    if (id) {
      e.preventDefault();
      setSelectedId(id);
      drag.current = { id, pointerId: e.pointerId };
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    const p = pointToTree(e);
    place(p.x, p.y);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const p = pointToTree(e);
    moveOrnament(drag.current.id, p.x, p.y);
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === e.pointerId) {
      svgRef.current?.releasePointerCapture(e.pointerId);
      drag.current = null;
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 6 : 2;
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const d = deltas[e.key];
    if (d) {
      e.preventDefault();
      if (selected) moveOrnament(selected.id, selected.x + d[0], selected.y + d[1]);
      else setCursor((c) => clampToTree(kind, c.x + d[0], c.y + d[1]));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (selected) {
        setSelectedId(null);
        setAnnounce("Adorno acomodado");
      } else place(cursor.x, cursor.y);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeSelected();
      return;
    }
    if (e.key === "Escape") {
      setSelectedId(null);
      return;
    }
    if (e.key.toLowerCase() === "n" && design.length) {
      e.preventDefault();
      const idx = selected ? design.findIndex((o) => o.id === selected.id) : -1;
      const next = design[(idx + 1) % design.length];
      setSelectedId(next.id);
      setAnnounce(`Seleccionaste ${describe(next).toLowerCase()}`);
    }
  }

  function pickColor(c: OrnamentColor) {
    setColor(c);
    if (selected) {
      update(design.map((o) => (o.id === selected.id ? { ...o, color: c } : o)), "Cambiaste el color");
    }
  }

  async function save() {
    const ok = await onSave(design);
    if (ok) {
      setDirty(false);
      setSavedMsg("¡Árbol guardado!");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div
          tabIndex={0}
          role="application"
          aria-roledescription="árbol para decorar"
          aria-label={`Árbol de Navidad con ${design.length} adornos`}
          aria-describedby={helpId}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="relative mx-auto aspect-square w-full max-w-[min(100%,560px)] rounded-[2rem] bg-gradient-to-b from-noche-800/80 to-noche-950/80 shadow-inner"
        >
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            className="h-full w-full touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden
          >
            <TreeShape />
            {design.map((o) => (
              <g key={o.id} data-ornament-id={o.id} className="cursor-grab">
                <circle cx={o.x} cy={o.y} r={o.kind === "estrella" ? 7 : 5} fill="transparent" />
                <OrnamentGlyph ornament={o} selected={o.id === selectedId} />
              </g>
            ))}
            {focused && !selected && (
              <g transform={`translate(${cursor.x} ${cursor.y})`} pointerEvents="none">
                <circle r="4.5" fill="none" stroke="#f7dc94" strokeWidth="0.7" strokeDasharray="1.4 1" />
                <path d="M-1.6 0 H1.6 M0 -1.6 V1.6" stroke="#f7dc94" strokeWidth="0.6" />
              </g>
            )}
          </svg>
        </div>
        <p id={helpId} className="mt-3 text-center text-sm text-nieve-200">
          Toca el árbol para colocar el adorno elegido. Arrastra un adorno para moverlo. Con teclado: flechas para
          moverte, Enter para colocar, N para elegir un adorno puesto, Suprimir para quitarlo.
        </p>
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
      </div>

      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 font-semibold text-oro-300">1. Elige un adorno</legend>
          <div className="grid grid-cols-5 gap-2">
            {ORNAMENT_KINDS.map((k) => (
              <label
                key={k}
                className={`flex cursor-pointer flex-col items-center rounded-2xl border p-1.5 text-center text-[11px] leading-tight transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-oro-400 ${
                  kind === k ? "border-oro-400 bg-oro-500/15" : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="radio"
                  name="ornament-kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                <svg viewBox="-8 -8 16 16" className="h-9 w-9" aria-hidden>
                  <OrnamentGlyph ornament={{ id: "prev", kind: k, color, x: 0, y: 0 }} />
                </svg>
                {ORNAMENT_LABELS[k].split(" ")[0]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-semibold text-oro-300">
            2. Elige un color{selected ? " (cambia el adorno seleccionado)" : ""}
          </legend>
          <div className="flex flex-wrap gap-2">
            {ORNAMENT_COLORS.map((c) => (
              <label
                key={c}
                title={COLOR_LABELS[c]}
                className={`relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-oro-400 ${
                  color === c ? "border-nieve" : "border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="ornament-color"
                  value={c}
                  checked={color === c}
                  onChange={() => pickColor(c)}
                  className="sr-only"
                />
                <span className="sr-only">Color {COLOR_LABELS[c]}</span>
                <span aria-hidden className="h-8 w-8 rounded-full" style={{ background: COLOR_HEX[c] }} />
              </label>
            ))}
          </div>
        </fieldset>

        <p className="text-sm text-nieve-200">
          {design.length} de {MAX_ORNAMENTS} adornos
          {selected && <> · Seleccionado: {describe(selected).toLowerCase()}</>}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={removeSelected} disabled={!selected}>
            Quitar adorno
          </Button>
          {confirmReset ? (
            <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar reinicio">
              <span className="text-sm">¿Quitar todos?</span>
              <Button
                variant="danger"
                onClick={() => {
                  update([], "Árbol reiniciado");
                  setSelectedId(null);
                  setConfirmReset(false);
                }}
              >
                Sí, reiniciar
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                No
              </Button>
            </span>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={design.length === 0}>
              Reiniciar árbol
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
          <Button variant="secondary" onClick={save} disabled={busy || !dirty}>
            {busy ? "Guardando…" : "Guardar diseño"}
          </Button>
          <Button onClick={() => onFinish(design)} disabled={busy || design.length === 0}>
            ¡Terminé mi árbol!
          </Button>
          <p role="status" className="min-h-5 text-sm text-pino-500">
            {savedMsg || (dirty ? <span className="text-oro-300">Tienes cambios sin guardar</span> : null)}
          </p>
        </div>
      </div>
    </div>
  );
}
