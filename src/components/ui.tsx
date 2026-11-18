import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-arandano-600 text-nieve hover:bg-arandano-500 shadow-[0_10px_30px_-10px_rgba(208,52,79,0.8)] border border-arandano-500",
  secondary: "bg-pino-600 text-nieve hover:bg-pino-500 border border-pino-500",
  ghost: "bg-white/5 text-nieve hover:bg-white/10 border border-white/15",
  danger: "bg-transparent text-arandano-500 hover:bg-arandano-600/10 border border-arandano-600/60",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" {...props} className={buttonClass(variant, className)} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-noche-800/70 p-5 shadow-2xl backdrop-blur sm:p-7 ${className}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = "Cargando" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-oro-400 border-t-transparent" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-arandano-500/60 bg-arandano-800/40 px-4 py-3 text-sm text-nieve">
      {children}
    </p>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-white/20 bg-noche-950/60 px-4 py-3 text-base text-nieve placeholder:text-nieve-200/50 focus:border-oro-400 focus:outline-none";
