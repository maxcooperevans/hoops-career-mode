import React, { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';

function fmt(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTeam(teamId) {
  const t = TEAM_MAP[teamId];
  return t ? `${t.city} ${t.name}` : teamId ?? '—';
}

export default function MainMenu() {
  const player       = useGameStore(s => s.player);
  const saves        = useGameStore(s => s.saves);
  const goTo         = useGameStore(s => s.goTo);
  const loadFromSlot = useGameStore(s => s.loadFromSlot);
  const importSave   = useGameStore(s => s.importSave);
  const exportSave   = useGameStore(s => s.exportSave);
  const resetGame    = useGameStore(s => s.resetGame);

  const fileRef = useRef();
  const [confirmNew, setConfirmNew] = useState(false);

  // Does an active (not-yet-finished) career exist in memory?
  const hasActiveCareer = !!player && !player.isRetired;

  // Best destination for "Continue"
  function continueScreen() {
    if (!player) return 'SEASON_DASHBOARD';
    if (player.isRetired) return 'RETIREMENT';
    if (!player.team) return 'COLLEGE';
    return 'SEASON_DASHBOARD';
  }

  function handleNewCareer() {
    if (hasActiveCareer) {
      setConfirmNew(true);   // ask for confirmation first
    } else {
      goTo('CHAR_CREATION');
    }
  }

  function handleConfirmNew() {
    resetGame();
    goTo('CHAR_CREATION');
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { importSave(ev.target.result); }
      catch { alert('Invalid save file.'); }
    };
    reader.readAsText(file);
  }

  function handleExport() {
    const json = exportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'hoops-save.json'; a.click();
    URL.revokeObjectURL(url);
  }

  const gp  = player?.careerGames ?? 0;
  const ppg = gp > 0 ? (player.careerPts / gp).toFixed(1) : null;
  const apg = gp > 0 ? (player.careerAst / gp).toFixed(1) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Title */}
        <div className="text-center mb-8">
          <div className="font-mono text-xs tracking-widest text-gray-400 mb-1 uppercase">NBA Career Simulation</div>
          <h1 className="text-5xl font-bold tracking-tight leading-none">HOOPS</h1>
          <div className="text-2xl font-light tracking-[0.3em] mt-1">CAREER MODE</div>
          <hr className="mt-4" />
        </div>

        {/* ── Active career ─────────────────────────────── */}
        {hasActiveCareer && !confirmNew && (
          <div className="mb-6">
            {/* Career card */}
            <div className="border-2 border-black p-4 mb-3">
              <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">Active Career</div>
              <div className="font-bold text-xl">{player.name}</div>
              <div className="font-mono text-sm text-gray-600 mt-0.5">
                {player.position} · {fmtTeam(player.team)} · Age {player.age}
              </div>
              {ppg && (
                <div className="font-mono text-xs mt-2 text-gray-500">
                  {player.nbaSeasonsPlayed} NBA season{player.nbaSeasonsPlayed !== 1 ? 's' : ''}
                  {' · '}{ppg} PPG · {apg} APG career avg
                  {player.championships > 0 && ` · ${player.championships}× Champ`}
                  {player.allStarSelections > 0 && ` · ${player.allStarSelections}× All-Star`}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary w-full py-4 text-lg tracking-widest mb-2"
              onClick={() => goTo(continueScreen())}
            >
              CONTINUE CAREER →
            </button>

            <button
              className="btn w-full py-2 text-xs"
              onClick={handleNewCareer}
            >
              Start a New Career
            </button>
          </div>
        )}

        {/* ── Confirmation: abandon active career ───────── */}
        {confirmNew && (
          <div className="mb-6 border-2 border-black p-5">
            <div className="font-bold mb-2">Abandon {player?.name}'s career?</div>
            <div className="font-mono text-xs text-gray-500 mb-4">
              Your active career will be lost unless it's saved to a slot below.
              This cannot be undone.
            </div>
            <div className="flex gap-2">
              <button className="btn flex-1 py-2 text-xs" onClick={() => setConfirmNew(false)}>
                ← Cancel
              </button>
              <button className="btn btn-primary flex-1 py-2 text-xs" onClick={handleConfirmNew}>
                Yes, Start Fresh
              </button>
            </div>
          </div>
        )}

        {/* ── No active career: show big new-game CTA ───── */}
        {!hasActiveCareer && (
          <button
            className="btn btn-primary w-full text-lg py-4 mb-6 tracking-widest"
            onClick={() => goTo('CHAR_CREATION')}
          >
            NEW CAREER
          </button>
        )}

        {/* ── Save slots ────────────────────────────────── */}
        <div className="mb-5">
          <div className="panel-header">SAVED CAREERS</div>
          {saves.map((save, i) => (
            <div key={i}
              className="border border-t-0 border-black p-3 flex items-center justify-between min-h-[52px]">
              {save ? (
                <>
                  <div>
                    <div className="font-semibold text-sm">{save.playerName || 'Unknown'}</div>
                    <div className="font-mono text-xs text-gray-500 mt-0.5">
                      {fmtTeam(save.teamId)} · Season {save.seasonsPlayed} · {fmt(save.timestamp)}
                    </div>
                  </div>
                  <button className="btn text-xs py-1 px-3 shrink-0" onClick={() => loadFromSlot(i)}>
                    LOAD
                  </button>
                </>
              ) : (
                <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">
                  Empty Slot {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Import / Export ───────────────────────────── */}
        <div className="flex gap-2 mb-6">
          <button className="btn flex-1 text-xs py-2" onClick={handleExport}>Export Save</button>
          <button className="btn flex-1 text-xs py-2" onClick={() => fileRef.current?.click()}>Import Save</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        <p className="text-center font-mono text-xs text-gray-400">
          Saves stay in your browser · No account needed · No data leaves your device
        </p>
      </div>
    </div>
  );
}
