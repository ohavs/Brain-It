import { useReducer } from 'react';
import { LEVELS } from './data/levels';
import HomeScreen from './screens/HomeScreen';
import LevelSelectScreen from './screens/LevelSelectScreen';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import WinOverlay from './components/WinOverlay';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

const INITIAL = {
  screen: 'home',          // 'home' | 'levelSelect' | 'playing' | 'win'
  levelId: 1,
  completedLevels: [],     // array of completed level ids
  resetKey: 0,             // incrementing remounts <GameCanvas key={resetKey}>
};

function reducer(state, action) {
  switch (action.type) {
    case 'GO_HOME':
      return { ...state, screen: 'home' };

    case 'GO_SELECT':
      return { ...state, screen: 'levelSelect' };

    case 'PLAY':
      return {
        ...state,
        screen: 'playing',
        levelId: action.id,
        resetKey: state.resetKey + 1,
      };

    case 'WIN': {
      const completedLevels = state.completedLevels.includes(state.levelId)
        ? state.completedLevels
        : [...state.completedLevels, state.levelId];
      return { ...state, screen: 'win', completedLevels };
    }

    case 'RESET':
      return { ...state, screen: 'playing', resetKey: state.resetKey + 1 };

    case 'NEXT': {
      const nextId = Math.min(state.levelId + 1, LEVELS.length);
      return {
        ...state,
        screen: 'playing',
        levelId: nextId,
        resetKey: state.resetKey + 1,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const level = LEVELS.find((l) => l.id === state.levelId);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-50">

      {/* ── Home ── */}
      {state.screen === 'home' && (
        <HomeScreen onPlay={() => dispatch({ type: 'GO_SELECT' })} />
      )}

      {/* ── Level select ── */}
      {state.screen === 'levelSelect' && (
        <LevelSelectScreen
          levels={LEVELS}
          completedLevels={state.completedLevels}
          onSelect={(id) => dispatch({ type: 'PLAY', id })}
          onBack={() => dispatch({ type: 'GO_HOME' })}
        />
      )}

      {/* ── Game (playing + win overlay) ── */}
      {(state.screen === 'playing' || state.screen === 'win') && level && (
        <div className="relative w-full h-full">
          {/*
            key={resetKey} — React unmounts/remounts the canvas when the user
            hits Reset or starts a new level, cleanly re-initialising the
            physics engine and all bodies.
          */}
          <GameCanvas
            key={state.resetKey}
            level={level}
            onWin={() => dispatch({ type: 'WIN' })}
          />

          <GameHUD
            level={level}
            onBack={() => dispatch({ type: 'GO_SELECT' })}
            onReset={() => dispatch({ type: 'RESET' })}
          />

          {state.screen === 'win' && (
            <WinOverlay
              levelId={state.levelId}
              totalLevels={LEVELS.length}
              onNext={() => dispatch({ type: 'NEXT' })}
              onBack={() => dispatch({ type: 'GO_SELECT' })}
            />
          )}
        </div>
      )}

    </div>
  );
}
