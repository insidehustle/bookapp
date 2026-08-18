/**
 * A glowing gradient-ring spinner matching the app's accent/accent-2 brand
 * glow (see the header dot and hero title gradient) - a soft pulsing halo
 * behind a spinning conic-gradient ring, rather than a flat single-color
 * stroke.
 */
export function Spinner({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 animate-pulse rounded-full bg-accent/25 blur-lg" />
      <div
        className="absolute inset-0 animate-spin rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, var(--accent-2) 35%, var(--accent) 75%, transparent 100%)",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
        }}
      />
    </div>
  );
}
