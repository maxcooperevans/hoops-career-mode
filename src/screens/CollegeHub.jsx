import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { COLLEGES } from '../data/constants.js';
import { simCollegeSeason, simCombine } from '../engine/collegeEngine.js';
import { computeDraftStock } from '../engine/playerEngine.js';
import { stockToPickRange } from '../engine/draftEngine.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

export default function CollegeHub() {
  const player = useGameStore(s => s.player);
  const goTo = useGameStore(s => s.goTo);
  const chooseCollege = useGameStore(s => s.chooseCollege);
  const finishCollegeSeason = useGameStore(s => s.finishCollegeSeason);

  const [phase, setPhase] = useState(player.college ? 'season' : 'choose');
  const [lastSeason, setLastSeason] = useState(null);
  const [combineResult, setCombineResult] = useState(null);
  const [stockBonus, setStockBonus] = useState(0);

  const seasonsPlayed = player.collegeStats.length;
  const maxSeasons = 4;
  const canDeclare = seasonsPlayed >= 1;
  const mustDeclare = seasonsPlayed >= maxSeasons;

  function handleChooseCollege(college) {
    chooseCollege(college);
    setPhase('season');
  }

  function handleSimSeason() {
    const result = simCollegeSeason(player, player.college, 2023 + seasonsPlayed);
    finishCollegeSeason(result);
    setLastSeason(result);
    setPhase('result');
  }

  function handleDeclare() {
    const combine = simCombine(player);
    setCombineResult(combine);
    setStockBonus(combine.stockDelta);
    setPhase('combine');
  }

  function handleGoToDraft() {
    goTo('DRAFT');
  }

  const draftStock = (() => {
    const base = computeDraftStock(player) + stockBonus;
    return stockToPickRange(base);
  })();

  if (phase === 'choose') {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="mt-4">
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest">Pre-Draft</div>
            <h2 className="text-2xl font-bold">CHOOSE YOUR COLLEGE</h2>
            <p className="text-sm text-gray-600 mt-1">Each school offers different exposure, playing time, and development.</p>
          </div>
          <div className="space-y-px">
            <div className="grid grid-cols-4 gap-0 panel-header font-mono text-xs">
              <span>SCHOOL</span><span className="text-right">PRESTIGE</span><span className="text-right">PLAYING TIME</span><span className="text-right">DEVELOPMENT</span>
            </div>
            {COLLEGES.map(c => (
              <button key={c.id} onClick={() => handleChooseCollege(c)}
                className="w-full border border-t-0 border-black p-3 flex items-center hover:bg-black hover:text-white transition-colors text-left">
                <div className="flex-1 font-semibold text-sm">{c.name}</div>
                <div className="font-mono text-xs w-16 text-right">{c.prestige}</div>
                <div className="font-mono text-xs w-20 text-right">{c.pt}</div>
                <div className="font-mono text-xs w-20 text-right">{c.dev}</div>
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-gray-400">
            High prestige = more NBA scouts watch · High PT = more minutes/stats · High dev = better attribute growth
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'season') {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="mt-4">
            <div className="font-mono text-xs text-gray-400">
              {player.college?.name ?? 'College'} · Year {seasonsPlayed + 1}
            </div>
            <h2 className="text-2xl font-bold">SEASON {2023 + seasonsPlayed}–{2024 + seasonsPlayed}</h2>
          </div>

          {/* Prior stats */}
          {player.collegeStats.length > 0 && (
            <Panel title="CAREER SO FAR">
              <table className="stat-table">
                <thead>
                  <tr><th className="text-left">Year</th><th>GP</th><th>PPG</th><th>RPG</th><th>APG</th><th>STL</th><th>BLK</th><th>FG%</th></tr>
                </thead>
                <tbody>
                  {player.collegeStats.map((s, i) => (
                    <tr key={i}>
                      <td className="text-left">Yr {i + 1}</td>
                      <td>{s.gamesPlayed}</td>
                      <td>{s.pts}</td><td>{s.reb}</td><td>{s.ast}</td>
                      <td>{s.stl}</td><td>{s.blk}</td>
                      <td>{(s.fgPct * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          <Panel title="DRAFT STOCK PROJECTION">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">Projected Range</span>
              <span className="font-mono font-bold text-lg">{draftStock}</span>
            </div>
          </Panel>

          <div className="space-y-2">
            <button className="btn btn-primary w-full py-3 tracking-widest" onClick={handleSimSeason}>
              SIMULATE {2023 + seasonsPlayed}–{2024 + seasonsPlayed} SEASON
            </button>
            {canDeclare && !mustDeclare && (
              <button className="btn w-full py-3 tracking-widest" onClick={handleDeclare}>
                DECLARE FOR THE NBA DRAFT
              </button>
            )}
            {mustDeclare && (
              <button className="btn w-full py-3 tracking-widest" onClick={handleDeclare}>
                DECLARE FOR THE NBA DRAFT (Final Year)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="mt-4">
            <div className="font-mono text-xs text-gray-400">{player.college?.name} · Year {seasonsPlayed}</div>
            <h2 className="text-2xl font-bold">SEASON COMPLETE</h2>
          </div>

          <Panel title="SEASON STATS">
            <div className="grid grid-cols-4 gap-3 font-mono">
              {[['PPG', lastSeason?.pts],['RPG', lastSeason?.reb],['APG', lastSeason?.ast],['SPG', lastSeason?.stl]].map(([l,v]) => (
                <div key={l} className="text-center">
                  <div className="text-2xl font-bold">{v}</div>
                  <div className="text-xs text-gray-500">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 font-mono text-xs text-gray-500">
              {lastSeason?.gamesPlayed} GP · {(lastSeason?.fgPct * 100).toFixed(1)}% FG · {lastSeason?.mpg} MPG · Team: {lastSeason?.teamRecord}
            </div>
          </Panel>

          {lastSeason?.attrGains && (
            <Panel title="DEVELOPMENT GAINS">
              <div className="font-mono text-xs grid grid-cols-3 gap-1">
                {Object.entries(lastSeason.attrGains).slice(0, 9).map(([attr, gain]) => (
                  <div key={attr} className="flex justify-between border border-gray-200 px-2 py-1">
                    <span className="text-gray-600 truncate">{attr.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-bold ml-1">+{gain}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="DRAFT STOCK">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">Updated Projection</span>
              <span className="font-mono font-bold text-lg">{draftStock}</span>
            </div>
          </Panel>

          <div className="space-y-2">
            {!mustDeclare ? (
              <>
                <button className="btn btn-primary w-full py-3 tracking-widest" onClick={() => setPhase('season')}>
                  RETURN FOR YEAR {seasonsPlayed + 1}
                </button>
                <button className="btn w-full py-3 tracking-widest" onClick={handleDeclare}>
                  DECLARE FOR THE NBA DRAFT
                </button>
              </>
            ) : (
              <button className="btn btn-primary w-full py-3 tracking-widest" onClick={handleDeclare}>
                DECLARE FOR THE NBA DRAFT →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'combine') {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="mt-4">
            <div className="font-mono text-xs text-gray-400">Chicago · June</div>
            <h2 className="text-2xl font-bold">NBA DRAFT COMBINE</h2>
          </div>

          <Panel title="COMBINE RESULTS">
            <div className="space-y-2">
              {combineResult?.results.map((r, i) => (
                <div key={i} className="font-mono text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  {r}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-black flex justify-between font-mono">
              <span className="text-sm">Stock adjustment</span>
              <span className={`font-bold text-lg ${combineResult?.stockDelta >= 0 ? '' : 'text-gray-600'}`}>
                {combineResult?.stockDelta >= 0 ? '+' : ''}{combineResult?.stockDelta}
              </span>
            </div>
          </Panel>

          <Panel title="FINAL DRAFT PROJECTION">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">Projected Draft Range</span>
              <span className="font-mono font-bold text-xl">{draftStock}</span>
            </div>
          </Panel>

          <button className="btn btn-primary w-full py-4 tracking-widest text-lg" onClick={handleGoToDraft}>
            DRAFT NIGHT →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
