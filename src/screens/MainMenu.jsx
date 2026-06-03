import React, { useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';

function fmt(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function MainMenu() {
  const saves = useGameStore(s => s.saves);
  const goTo = useGameStore(s => s.goTo);
  const loadFromSlot = useGameStore(s => s.loadFromSlot);
  const importSave = useGameStore(s => s.importSave);
  const exportSave = useGameStore(s => s.exportSave);
  const fileRef = useRef();

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        importSave(ev.target.result);
      } catch {
        alert('Invalid save file.');
      }
    };
    reader.readAsText(file);
  }

  function handleExport() {
    const json = exportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hoops-save.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="font-mono text-xs tracking-widest text-gray-400 mb-1">NBA CAREER SIMULATION</div>
          <h1 className="text-5xl font-bold tracking-tight leading-none">HOOPS</h1>
          <div className="text-2xl font-light tracking-[0.3em] mt-1">CAREER MODE</div>
          <hr className="mt-4" />
        </div>

        {/* New Game */}
        <button
          className="btn btn-primary w-full text-lg py-4 mb-6 tracking-widest"
          onClick={() => goTo('CHAR_CREATION')}
        >
          NEW CAREER
        </button>

        {/* Save Slots */}
        <div className="mb-6">
          <div className="panel-header mb-0">CONTINUE</div>
          {saves.map((save, i) => (
            <div key={i} className="border border-t-0 border-black p-3 flex items-center justify-between">
              {save ? (
                <>
                  <div>
                    <div className="font-semibold text-sm">{save.playerName}</div>
                    <div className="font-mono text-xs text-gray-600 mt-0.5">
                      {save.teamId ? (TEAM_MAP[save.teamId] ? `${TEAM_MAP[save.teamId].city} ${TEAM_MAP[save.teamId].name}` : save.teamId) : '—'} · Season {save.seasonsPlayed} · {fmt(save.timestamp)}
                    </div>
                  </div>
                  <button
                    className="btn text-xs py-1 px-3"
                    onClick={() => loadFromSlot(i)}
                  >
                    LOAD
                  </button>
                </>
              ) : (
                <span className="text-gray-400 text-xs font-mono uppercase">Empty Slot {i + 1}</span>
              )}
            </div>
          ))}
        </div>

        {/* Import/Export */}
        <div className="flex gap-2">
          <button className="btn flex-1 text-xs" onClick={handleExport}>Export Save</button>
          <button className="btn flex-1 text-xs" onClick={() => fileRef.current?.click()}>Import Save</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        <p className="text-center font-mono text-xs text-gray-400 mt-8">
          Runs entirely in your browser · No data leaves your device
        </p>
      </div>
    </div>
  );
}
