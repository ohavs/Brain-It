export default function HomeScreen({ onPlay }) {
  return (
    <div className="grid-paper w-full h-full flex flex-col items-center justify-between py-16 px-6 select-none">

      {/* Top stamp */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-xs text-slate-400 uppercase tracking-[0.25em]">
          Blueprint Series · Vol. I
        </span>
        <div className="w-16 h-px bg-slate-300 mt-1" />
      </div>

      {/* Centre: title + illustration */}
      <div className="flex flex-col items-center gap-8">
        {/* Schematic illustration */}
        <svg
          width="220" height="160"
          viewBox="0 0 220 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Grid dots */}
          {[30, 70, 110, 150, 190].map(x =>
            [30, 80, 130].map(y => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="#cbd5e1" />
            ))
          )}
          {/* Platform / ramp */}
          <rect x="18" y="112" width="90" height="10" rx="2" fill="#334155" />
          <rect x="112" y="82" width="90" height="10" rx="2"
                transform="rotate(-12 112 82)" fill="#334155" />
          {/* Target ring */}
          <circle cx="178" cy="128" r="18" fill="#fed7aa" stroke="#f97316" strokeWidth="2.5" />
          <circle cx="178" cy="128" r="8" fill="#f97316" />
          {/* Ball */}
          <circle cx="32" cy="96" r="12" fill="#3b82f6" />
          <circle cx="28" cy="92" r="4.5" fill="rgba(255,255,255,0.4)" />
          {/* Arrow hint */}
          <path d="M52 90 Q95 55 148 100" stroke="#94a3b8" strokeWidth="1.5"
                strokeDasharray="4 3" fill="none" markerEnd="url(#arr)" />
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6"
                    refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="font-mono font-black text-slate-800 leading-none tracking-tight"
            style={{ fontSize: 'clamp(3rem, 14vw, 5rem)' }}
          >
            BRAIN·IT
          </h1>
          <p className="font-mono text-slate-500 text-sm tracking-widest uppercase">
            Draw · Physics · Solve
          </p>
        </div>
      </div>

      {/* Bottom: CTA */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <button
          onClick={onPlay}
          className="w-full bg-slate-800 active:bg-slate-900 text-white font-mono font-bold
                     uppercase tracking-widest text-base py-5 rounded-2xl
                     border-2 border-slate-600 shadow-lg
                     transition-transform active:scale-95"
        >
          Play
        </button>
        <p className="font-mono text-slate-400 text-xs text-center leading-relaxed px-2">
          Draw platforms and ramps to guide the ball to the&nbsp;orange&nbsp;target.
        </p>
      </div>

    </div>
  );
}
