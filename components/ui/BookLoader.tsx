/**
 * Branded loading indicator: an open book with a pencil writing lines of
 * "text" across the right-hand page on a repeating loop. Positions/lengths
 * are animated with SMIL (<animate>/<animateTransform>) rather than CSS
 * transforms so they stay correct in the SVG's own coordinate space no
 * matter what pixel size the component is rendered at.
 */
export function BookLoader({ className = "h-20 w-20" }: { className?: string }) {
  const DUR = "3.3s";

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 animate-pulse rounded-full bg-accent/20 blur-xl" />
      <svg viewBox="0 0 100 70" className="relative h-full w-full" fill="none" aria-hidden="true">
        {/* pages */}
        <path
          d="M50 18 C40 10 20 10 12 14 V56 C20 52 40 52 50 58 Z"
          fill="var(--surface-2)"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M50 18 C60 10 80 10 88 14 V56 C80 52 60 52 50 58 Z"
          fill="var(--surface-2)"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M50 18 V58" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />

        {/* written lines, drawn in and erased on a loop */}
        <path
          d="M58 24 H78"
          stroke="var(--accent-2)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="20"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="20;20;0;0;20;20"
            keyTimes="0;0.05;0.22;0.85;0.95;1"
            dur={DUR}
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M58 33 H74"
          stroke="var(--accent-2)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="16"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="16;16;0;0;16;16"
            keyTimes="0;0.3;0.47;0.85;0.95;1"
            dur={DUR}
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M58 42 H70"
          stroke="var(--accent-2)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="12"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="12;12;0;0;12;12"
            keyTimes="0;0.6;0.77;0.85;0.95;1"
            dur={DUR}
            repeatCount="indefinite"
          />
        </path>

        {/* pencil - tip tracks the point currently being "written" */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="58,16; 58,24; 78,24; 58,33; 74,33; 58,42; 70,42; 70,42; 58,16; 58,16"
            keyTimes="0;0.05;0.22;0.3;0.47;0.6;0.77;0.85;0.95;1"
            dur={DUR}
            repeatCount="indefinite"
          />
          <g transform="rotate(-50)">
            <rect x="-1.8" y="-18.5" width="3.6" height="3" rx="1" fill="var(--danger)" opacity="0.85" />
            <rect x="-1.5" y="-16" width="3" height="13" rx="1" fill="var(--accent)" />
            <polygon points="-1.5,-3 1.5,-3 0,0.5" fill="#e8b04b" />
            <polygon points="-0.6,-1.2 0.6,-1.2 0,0.5" fill="#3a3a3a" />
          </g>
        </g>
      </svg>
    </div>
  );
}
