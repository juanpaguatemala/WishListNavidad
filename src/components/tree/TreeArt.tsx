import { COLOR_HEX } from "@/lib/labels";
import type { Ornament } from "@/lib/validation";

/**
 * Geometría del árbol en coordenadas 0–100 (viewBox 0 0 100 100).
 * Los adornos guardan x/y en esas mismas coordenadas.
 */
export const TREE = { apexY: 4, baseY: 88, halfBase: 42, centerX: 50 };

export function clampToTree(kind: Ornament["kind"], x: number, y: number) {
  const minY = kind === "estrella" ? 6 : 14;
  const cy = Math.min(TREE.baseY - 3, Math.max(minY, y));
  const half = Math.max(0, ((cy - TREE.apexY) / (TREE.baseY - TREE.apexY)) * TREE.halfBase - 3);
  const cx = Math.min(TREE.centerX + half, Math.max(TREE.centerX - half, x));
  return { x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10 };
}

export function isInsideTree(x: number, y: number) {
  if (y < TREE.apexY || y > TREE.baseY) return false;
  const half = ((y - TREE.apexY) / (TREE.baseY - TREE.apexY)) * TREE.halfBase;
  return Math.abs(x - TREE.centerX) <= half;
}

/** Fondo del árbol (sin adornos). */
export function TreeShape() {
  return (
    <g>
      <defs>
        <linearGradient id="tree-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f7d52" />
          <stop offset="100%" stopColor="#0f3a22" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="97" rx="34" ry="2.6" fill="#ffffff" opacity="0.18" />
      <rect x="44.5" y="86" width="11" height="11" rx="1.5" fill="#6b3f22" />
      <path d="M50 4 L74 34 L64 34 L84 60 L72 60 L92 88 L8 88 L28 60 L16 60 L36 34 L26 34 Z" fill="url(#tree-green)" />
      <path d="M50 4 L62 19 L38 19 Z M30 60 L70 60 L76 66 L24 66 Z" fill="#ffffff" opacity="0.06" />
    </g>
  );
}

export function OrnamentGlyph({ ornament, selected = false }: { ornament: Ornament; selected?: boolean }) {
  const { kind, x, y } = ornament;
  const color = COLOR_HEX[ornament.color];
  return (
    <g transform={`translate(${x} ${y})`}>
      {selected && (
        <circle r={kind === "estrella" ? 8 : 6} fill="none" stroke="#f7dc94" strokeWidth="0.8" strokeDasharray="1.6 1.2" />
      )}
      {kind === "esfera" && (
        <g>
          <rect x="-0.9" y="-4.4" width="1.8" height="1.4" rx="0.3" fill="#c99a2e" />
          <circle r="3.2" fill={color} />
          <circle cx="-1.1" cy="-1.1" r="0.9" fill="#fff" opacity="0.7" />
        </g>
      )}
      {kind === "luz" && (
        <g>
          <circle r="3.4" fill={color} opacity="0.25" />
          <ellipse rx="1.4" ry="2" fill={color} />
          <rect x="-0.8" y="-2.9" width="1.6" height="1" fill="#2a2230" />
        </g>
      )}
      {kind === "lazo" && (
        <g fill={color}>
          <path d="M0 0 L-3.6 -2.2 L-3.6 2.2 Z" />
          <path d="M0 0 L3.6 -2.2 L3.6 2.2 Z" />
          <path d="M-0.4 0.4 L-1.8 3.6 L-0.6 3.4 Z M0.4 0.4 L1.8 3.6 L0.6 3.4 Z" />
          <circle r="0.9" fill="#fff" opacity="0.8" />
        </g>
      )}
      {kind === "baston" && (
        <g fill="none" strokeLinecap="round">
          <path d="M0.8 3.8 L0.8 -1.6 A1.6 1.6 0 0 0 -2.4 -1.6" stroke="#fffdf6" strokeWidth="1.3" />
          <path d="M0.8 3.8 L0.8 -1.6 A1.6 1.6 0 0 0 -2.4 -1.6" stroke={color} strokeWidth="1.3" strokeDasharray="0.8 0.8" />
        </g>
      )}
      {kind === "estrella" && (
        <g>
          <circle r="7" fill={color} opacity="0.2" />
          <path
            d="M0 -6 L1.6 -1.9 L5.7 -1.9 L2.4 0.8 L3.6 5 L0 2.5 L-3.6 5 L-2.4 0.8 L-5.7 -1.9 L-1.6 -1.9 Z"
            fill={color}
            stroke="#fff6d8"
            strokeWidth="0.4"
          />
        </g>
      )}
    </g>
  );
}

/** Vista de solo lectura (panel de padres, carta). */
export function TreeView({ design, className, label }: { design: Ornament[]; className?: string; label: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={label}>
      <TreeShape />
      {design.map((o) => (
        <OrnamentGlyph key={o.id} ornament={o} />
      ))}
    </svg>
  );
}
