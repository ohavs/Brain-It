/**
 * In-game heads-up display.
 *
 * Layout (portrait mobile):
 *   ┌──────────────────────┐
 *   │  LV 01  ·  Open Field│  ← top bar (pointer-events-none strip)
 *   │                      │
 *   │   <canvas area>      │
 *   │                      │
 *   │  [← Back]  [↺ Reset] │  ← bottom bar (thumb zone)
 *   └──────────────────────┘
 *
 * The HUD sits absolute over the canvas. Only the bottom buttons are
 * pointer-events-auto; the rest is transparent to touch so drawing works.
 */
export default function GameHUD({ level, onBack, onReset }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">

      {/* ── Top strip: level info ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="font-mono text-[11px] text-slate-500 uppercase tracking-widest
                         bg-slate-50/80 backdrop-blur-sm px-2 py-1 rounded-lg
                         border border-slate-200/70">
          LV {String(level.id).padStart(2, '0')}
        </span>
        <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wider
                         bg-slate-50/80 backdrop-blur-sm px-2 py-1 rounded-lg
                         border border-slate-200/70">
          {level.name}
        </span>
      </div>

      {/* ── Bottom bar: thumb controls ── */}
      <div className="pointer-events-auto flex items-center justify-between px-4 pb-8 pt-2
                      bg-gradient-to-t from-slate-50/90 to-transparent">

        {/* Back — bottom-left */}
        <button
          onClick={onBack}
          aria-label="Back to level select"
          className="flex items-center gap-2 bg-white/90 active:bg-slate-100
                     text-slate-700 font-mono text-sm uppercase tracking-widest
                     px-5 py-3.5 rounded-2xl border-2 border-slate-200
                     shadow-sm transition-transform active:scale-95 min-w-[80px]
                     justify-center"
        >
          <span aria-hidden="true">←</span> Back
        </button>

        {/* Hint — centre (non-interactive) */}
        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider
                         text-center leading-tight max-w-[100px] pointer-events-none">
          {level.hint}
        </span>

        {/* Reset — bottom-right */}
        <button
          onClick={onReset}
          aria-label="Reset level"
          className="flex items-center gap-2 bg-slate-800 active:bg-slate-900
                     text-white font-mono text-sm uppercase tracking-widest
                     px-5 py-3.5 rounded-2xl border-2 border-slate-600
                     shadow-sm transition-transform active:scale-95 min-w-[80px]
                     justify-center"
        >
          <span aria-hidden="true">↺</span> Reset
        </button>

      </div>
    </div>
  );
}
