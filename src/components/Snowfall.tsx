/**
 * Nieve decorativa con CSS. Posiciones deterministas (sin Math.random)
 * para evitar diferencias entre servidor y cliente. Se oculta con
 * "reducir movimiento".
 */
const FLAKES = Array.from({ length: 36 }, (_, i) => {
  const seed = (i * 37) % 100;
  return {
    left: `${(i * 53) % 100}%`,
    size: 2 + (seed % 4),
    duration: 9 + (seed % 9),
    delay: -((i * 7) % 17),
    drift: `${((i % 5) - 2) * 18}px`,
    opacity: 0.35 + (seed % 5) / 10,
  };
});

export function Snowfall() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={
            {
              left: f.left,
              width: f.size,
              height: f.size,
              opacity: f.opacity,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              "--drift": f.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
