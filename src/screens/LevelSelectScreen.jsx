export default function LevelSelectScreen({ levels, completedLevels, onSelect, onBack }) {
  return (
    <div className="grid-paper w-full h-full flex flex-col select-none">

      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 shrink-0">
        <button
          onClick={onBack}
          className="font-mono text-slate-500 text-sm uppercase tracking-widest
                     active:text-slate-800 transition-colors px-2 py-2 -ml-2"
          aria-label="Back to home"
        >
          ← Back
        </button>
        <span className="font-mono text-xs text-slate-400 uppercase tracking-[0.2em]">
          Select Level
        </span>
        {/* spacer */}
        <div className="w-16" />
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-slate-200 shrink-0" />

      {/* 2 × 5 level grid — fills the remaining space with scroll if needed */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {levels.map((level) => {
            const done = completedLevels.includes(level.id);
            return (
              <button
                key={level.id}
                onClick={() => onSelect(level.id)}
                className={[
                  'relative flex flex-col items-start justify-between',
                  'rounded-2xl border-2 p-4 min-h-[96px]',
                  'text-left transition-transform active:scale-95',
                  done
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white/70 border-slate-200 text-slate-800',
                ].join(' ')}
              >
                {/* Level number */}
                <span
                  className={[
                    'font-mono font-black text-3xl leading-none',
                    done ? 'text-slate-300' : 'text-slate-200',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {String(level.id).padStart(2, '0')}
                </span>

                {/* Level name + completion tick */}
                <div className="flex items-end justify-between w-full mt-2 gap-1">
                  <span
                    className={[
                      'font-mono text-xs uppercase tracking-wider leading-tight',
                      done ? 'text-slate-300' : 'text-slate-600',
                    ].join(' ')}
                  >
                    {level.name}
                  </span>
                  {done && (
                    <span
                      className="text-orange-400 text-base leading-none shrink-0"
                      aria-label="Completed"
                    >
                      ✓
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom safe-area spacer */}
      <div className="h-6 shrink-0" />
    </div>
  );
}
