import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { generateDraftClass, runDraftSimulation } from '../engine/draftEngine.js';
import { computeDraftStock } from '../engine/playerEngine.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

function fmtSalary(n) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

export default function DraftNight() {
  const player = useGameStore(s => s.player);
  const setDraftResult = useGameStore(s => s.setDraftResult);
  const goTo = useGameStore(s => s.goTo);

  const [phase, setPhase] = useState('board'); // board | reveal | signed
  const [draftClass, setDraftClass] = useState(null);
  const [result, setResult] = useState(null);
  const [pickingIdx, setPickingIdx] = useState(0);
  const [isSimming, setIsSimming] = useState(false);

  useEffect(() => {
    const stock = computeDraftStock(player);
    const dc = generateDraftClass(2025, stock);
    setDraftClass(dc);
  }, []);

  const playerEntry = draftClass?.find(p => p.isPlayer);
  const playerPick = playerEntry?.pick ?? 60;

  function revealDraft() {
    const res = runDraftSimulation(draftClass, null);
    setResult(res);
    setDraftResult(res.pick, res.team.id, res.salary);
    setPickingIdx(Math.min(playerPick, 30));
    setPhase('reveal');
    setIsSimming(false);
  }

  async function handleRunDraft() {
    setIsSimming(true);
    setPhase('simming');

    // Animate picks — throttle-safe: 80ms steps (fast enough for active tabs)
    const total = Math.min(playerPick, 30);
    for (let i = 0; i < total; i++) {
      const delay = i >= total - 3 ? 350 : 80;
      await new Promise(r => setTimeout(r, delay));
      setPickingIdx(i + 1);
    }

    revealDraft();
  }

  function handleStartCareer() {
    goTo('SEASON_DASHBOARD');
  }

  if (!draftClass) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-sm">Generating draft class...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">Barclays Center, Brooklyn · June 26, 2025</div>
          <h2 className="text-2xl font-bold">2025 NBA DRAFT</h2>
        </div>

        {phase === 'board' && (
          <>
            <Panel title="MOCK DRAFT BOARD">
              <div className="overflow-x-auto">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th className="text-left w-8">Pick</th>
                      <th className="text-left">Name</th>
                      <th>Pos</th>
                      <th>Age</th>
                      <th className="text-left">Archetype</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftClass.slice(0, 30).map(p => (
                      <tr key={p.id}
                        style={p.isPlayer ? { background: '#000', color: '#fff' } : {}}>
                        <td>{p.pick}</td>
                        <td className="text-left font-semibold">{p.isPlayer ? `★ ${player.name}` : p.name}</td>
                        <td>{p.isPlayer ? player.position : p.position}</td>
                        <td>{p.isPlayer ? player.age : p.age}</td>
                        <td className="text-left">{p.isPlayer ? player.archetype : p.archetype}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 font-mono text-xs text-gray-500">
                ★ = you · Projected: Pick {playerPick}
              </div>
            </Panel>

            <button
              className="btn btn-primary w-full py-4 tracking-widest text-lg"
              onClick={handleRunDraft}
            >
              START DRAFT NIGHT →
            </button>
          </>
        )}

        {phase === 'simming' && (
          <Panel title="DRAFT NIGHT — LIVE">
            <div className="space-y-1">
              {draftClass.slice(0, Math.min(pickingIdx, 30)).map(p => (
                <div key={p.id}
                  className={`font-mono text-sm flex gap-4 py-1 border-b border-gray-100 ${p.isPlayer ? 'font-bold' : ''}`}>
                  <span className="w-8 text-right shrink-0">#{p.pick}</span>
                  <span className="flex-1">{p.isPlayer ? `★ ${player.name}` : p.name}</span>
                  <span className="text-gray-500">{p.isPlayer ? player.position : p.position}</span>
                </div>
              ))}
              {pickingIdx < playerPick && (
                <div className="font-mono text-xs text-gray-400 animate-pulse pt-2">
                  On the clock... ({playerPick - pickingIdx} picks until yours)
                </div>
              )}
            </div>
            <button className="btn w-full mt-3 text-xs py-2" onClick={revealDraft}>
              Skip to result →
            </button>
          </Panel>
        )}

        {phase === 'reveal' && result && (
          <>
            <div className="border-2 border-black p-6 text-center">
              <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-2">
                2025 NBA Draft · Pick #{result.pick}
              </div>
              <div className="text-4xl font-bold mb-1">{player.name}</div>
              <div className="font-mono text-lg">
                {result.team.city} {result.team.name}
              </div>
              <div className="font-mono text-sm text-gray-500 mt-1">{result.team.arena}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Panel title="TEAM">
                <div className="space-y-1 font-mono text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Conference</span><span>{result.team.conf}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Market</span><span>{result.team.market}/100</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Strength</span><span>{result.team.strength}/100</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Culture</span><span>{result.team.culture}/100</span></div>
                </div>
              </Panel>
              <Panel title="ROOKIE CONTRACT">
                <div className="space-y-1 font-mono text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Pick</span><span>#{result.pick} ({result.pick <= 14 ? 'Lottery' : result.pick <= 30 ? '1st Round' : '2nd Round'})</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Salary (Yr 1)</span><span>{fmtSalary(result.salary)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Length</span><span>{result.pick <= 30 ? '4 years' : '2 years'}</span></div>
                </div>
              </Panel>
            </div>

            <div className="panel">
              <div className="panel-body font-mono text-sm text-gray-600">
                {result.team.strength >= 80 ? '⚠️ Strong roster — expect limited minutes early. Win or develop?' :
                  result.team.strength >= 65 ? 'Solid team. You\'ll compete for a starting spot.' :
                  '★ Rebuilding team — minutes on the table from day one.'}
              </div>
            </div>

            <button
              className="btn btn-primary w-full py-4 tracking-widest text-lg"
              onClick={handleStartCareer}
            >
              BEGIN NBA CAREER →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
