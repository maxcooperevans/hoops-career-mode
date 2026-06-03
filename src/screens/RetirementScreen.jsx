import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

export default function RetirementScreen() {
  const player = useGameStore(s => s.player);
  const goTo = useGameStore(s => s.goTo);
  const resetGame = useGameStore(s => s.resetGame);

  const legacy = player.legacy ?? {};
  const { score = 0, notes = [], hofVerdict = '—', obituary = '' } = legacy;
  const team = player.team ? TEAM_MAP[player.team] : null;

  const gp = player.careerGames;
  const ppg = gp > 0 ? (player.careerPts / gp).toFixed(1) : '—';
  const rpg = gp > 0 ? (player.careerReb / gp).toFixed(1) : '—';
  const apg = gp > 0 ? (player.careerAst / gp).toFixed(1) : '—';

  function handleNewGame() {
    resetGame();
    goTo('MAIN_MENU');
  }

  const hofColor = hofVerdict.includes('FIRST BALLOT') || hofVerdict.includes('INDUCTEE') ? '#000' : undefined;

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <div className="mt-4 text-center border-2 border-black p-6">
          <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-2">
            CAREER RETROSPECTIVE
          </div>
          <h1 className="text-4xl font-bold">{player.name}</h1>
          <div className="font-mono text-sm mt-1 text-gray-600">
            {player.position} · {player.archetype} · {player.nbaSeasonsPlayed} Seasons
          </div>
          <div className="font-mono text-xs mt-1 text-gray-400">
            {player.hometown} → {team ? `${team.city} ${team.name}` : '—'} (final team)
          </div>
          <hr />
          <div className="grid grid-cols-3 gap-2 font-mono">
            {[['PPG', ppg],['RPG', rpg],['APG', apg]].map(([l,v]) => (
              <div key={l}>
                <div className="text-3xl font-bold">{v}</div>
                <div className="text-xs text-gray-500">{l} career avg</div>
              </div>
            ))}
          </div>
          <div className="font-mono text-xs text-gray-500 mt-2">
            {gp} games · {player.championships} championship{player.championships !== 1 ? 's' : ''} · {player.allStarSelections} All-Star selection{player.allStarSelections !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Career obituary */}
        {obituary && (
          <Panel title="CAREER RETROSPECTIVE">
            <p className="text-sm leading-relaxed font-serif">{obituary}</p>
          </Panel>
        )}

        {/* Legacy score */}
        <Panel title="LEGACY SCORE">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-5xl font-bold">{score}</div>
              <div className="font-mono text-xs text-gray-400 mt-1">out of 150</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{hofVerdict}</div>
              <div className="font-mono text-xs text-gray-400 mt-1">
                {score >= 75 ? 'Springfield, you better get ready.' :
                  score >= 60 ? 'A Hall of Fame career by any measure.' :
                  score >= 45 ? 'The committee will debate this one.' :
                  'The league will remember you.'}
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="h-3 bg-gray-200 border border-black w-full mb-4">
            <div className="h-full bg-black transition-all" style={{ width: `${Math.min(100, score / 1.5)}%` }} />
          </div>

          {/* Score breakdown */}
          <div className="space-y-1">
            {notes.map((n, i) => (
              <div key={i} className="font-mono text-xs flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-600">{n.replace(/^[+-]\d+: /, '')}</span>
                <span className="font-bold">{n.match(/^([+-]\d+)/)?.[1]}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Awards summary */}
        {player.awards.length > 0 && (
          <Panel title="AWARDS CASE">
            <div className="flex flex-wrap gap-1">
              {[...new Set(player.awards.map(a => a.replace(/\s*\(\d{4}.*\)/, '')))].map(a => (
                <span key={a} className="font-mono text-xs border border-black px-2 py-1">
                  {a} ×{player.awards.filter(x => x.startsWith(a)).length}
                </span>
              ))}
            </div>
          </Panel>
        )}

        <div className="space-y-2 pb-8">
          <button className="btn btn-primary w-full py-4 tracking-widest" onClick={handleNewGame}>
            START A NEW CAREER
          </button>
          <button className="btn w-full py-3" onClick={() => goTo('CAREER')}>
            View Full Career Stats
          </button>
        </div>
      </div>
    </div>
  );
}
