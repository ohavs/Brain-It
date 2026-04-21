/**
 * Win-state overlay.
 * Sits absolute over the game canvas + HUD.
 * Uses backdrop-blur so the settled physics world stays visible behind.
 */
export default function WinOverlay({ levelId, totalLevels, onNext, onBack }) {
  const isLast = levelId >= totalLevels;

  return (
    <div className="absolute inset-0 flex items-center justify-center
                    bg-slate-900/40 backdrop-blur-[3px]">
      <div
        className="animate-slide-up grid-paper mx-5 w-full max-w-sm
                   rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Inner card */}
        <div className="flex flex-col items-center gap-6 px-8 py-10">

          {/* Orange target icon */}
          <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center
                          shadow-lg shadow-orange-300/50">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M7 16.5 L13 22.5 L25 10" stroke="white" strokeWidth="3.5"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="font-mono text-xs text-slate-400 uppercase tracking-[0.2em] mb-1">
              Level {String(levelId).padStart(2, '0')} Complete
            </p>
            <h2 className="font-mono font-black text-slate-800 text-3xl leading-none">
              {isLast ? 'All Done!' : 'Nice Work!'}
            </h2>
            {isLast && (
              <p className="font-mono text-slate-500 text-xs mt-2 tracking-wide">
                You solved every level.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-slate-200" />

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full">
            {!isLast && (
              <button
                onClick={onNext}
                className="w-full bg-slate-800 active:bg-slate-900 text-white
                           font-mono font-bold uppercase tracking-widest text-sm
                           py-4 rounded-2xl border-2 border-slate-600
                           transition-transform active:scale-95"
              >
                Next Level →
              </button>
            )}
            <button
              onClick={onBack}
              className="w-full bg-white active:bg-slate-100 text-slate-700
                         font-mono font-bold uppercase tracking-widest text-sm
                         py-4 rounded-2xl border-2 border-slate-200
                         transition-transform active:scale-95"
            >
              Level Select
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
