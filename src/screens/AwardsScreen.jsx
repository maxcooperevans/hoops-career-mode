import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

function findWinner(players, compareFn, minGP = 40) {
  return [...players]
    .filter(p => (p.gp ?? 0) >= minGP)
    .sort(compareFn)[0] ?? null;
}

export default function AwardsScreen() {
  const player       = useGameStore(s => s.player);
  const league       = useGameStore(s => s.league);
  const seasonResults= useGameStore(s => s.seasonResults);
  const goTo         = useGameStore(s => s.goTo);

  const season = seasonResults?.season ?? (2025 + player.nbaSeasonsPlayed - 1);
  const ps     = seasonResults?.playerSeason;
  const playerAwards = ps?.awards ?? [];

  // Get this season's league stats
  const leaguePlayers = (league?.playerStats ?? [])
    .find(e => e.season === season)?.players ?? [];

  const awards = [
    {
      name: 'Most Valuable Player',
      abbr: 'MVP',
      winner: findWinner(leaguePlayers.filter(p => {
        const t = league?.standings?.[p.team];
        return t && t.wins >= 48;
      }), (a, b) => b.ppg - a.ppg),
      stat: p => `${p.ppg} PPG`,
    },
    {
      name: 'Rookie of the Year',
      abbr: 'ROY',
      winner: leaguePlayers.find(p => p.isPlayer && player.nbaSeasonsPlayed === 1) ??
        findWinner(leaguePlayers.filter(p => p.age <= 22), (a, b) => b.ppg - a.ppg),
      stat: p => `${p.ppg} PPG`,
    },
    {
      name: 'Defensive Player of the Year',
      abbr: 'DPOY',
      winner: findWinner(leaguePlayers, (a, b) => (b.spg + b.bpg) - (a.spg + a.bpg)),
      stat: p => `${p.spg} SPG / ${p.bpg} BPG`,
    },
    {
      name: 'Most Improved Player',
      abbr: 'MIP',
      winner: findWinner(leaguePlayers.filter(p => p.ppg >= 14 && p.age <= 26),
        (a, b) => b.ppg - a.ppg),
      stat: p => `${p.ppg} PPG`,
    },
    {
      name: 'Scoring Champion',
      abbr: 'Scoring Title',
      winner: findWinner(leaguePlayers, (a, b) => b.ppg - a.ppg),
      stat: p => `${p.ppg} PPG`,
    },
    {
      name: 'Assists Champion',
      abbr: 'Assists Title',
      winner: findWinner(leaguePlayers, (a, b) => b.apg - a.apg),
      stat: p => `${p.apg} APG`,
    },
    {
      name: 'Rebounds Champion',
      abbr: 'Rebounds Title',
      winner: findWinner(leaguePlayers, (a, b) => b.rpg - a.rpg),
      stat: p => `${p.rpg} RPG`,
    },
  ];

  // All-NBA teams (top 10 scorers, roughly)
  const allNBA1 = [...leaguePlayers].sort((a, b) => b.ppg - a.ppg).slice(0, 5);
  const allNBA2 = [...leaguePlayers].sort((a, b) => b.ppg - a.ppg).slice(5, 10);
  const allNBA3 = [...leaguePlayers].sort((a, b) => b.ppg - a.ppg).slice(10, 15);

  function isYou(w) {
    return w?.isPlayer || w?.name === player.name;
  }

  return (
    <div className="min-h-screen">
      <TopNav links={[{ screen: 'SEASON_DASHBOARD', label: 'Dashboard' }]} />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">{season}–{season+1} Season</div>
          <h2 className="text-2xl font-bold">END-OF-SEASON AWARDS</h2>
        </div>

        {/* Player's own awards */}
        {playerAwards.length > 0 && (
          <div className="border-2 border-black p-4">
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-2">Your Awards</div>
            <div className="space-y-1">
              {playerAwards.map((a, i) => (
                <div key={i} className="font-bold text-lg font-mono">🏆 {a}</div>
              ))}
            </div>
          </div>
        )}

        {/* Individual awards */}
        <Panel title="INDIVIDUAL AWARDS">
          <div className="space-y-2">
            {awards.map(award => {
              const w = award.winner;
              const you = isYou(w);
              const teamObj = w ? TEAM_MAP[w.team] : null;
              return (
                <div key={award.abbr}
                  className={`flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 ${you ? 'font-bold' : ''}`}
                  style={you ? { background: '#000', color: '#fff', padding: '4px 6px', margin: '0 -6px' } : {}}>
                  <div>
                    <div className="text-sm">{award.name}</div>
                    {w && <div className={`font-mono text-xs ${you ? 'opacity-80' : 'text-gray-500'}`}>
                      {you ? `★ ${player.name}` : w.name}
                      {teamObj ? ` · ${teamObj.id}` : ''}
                    </div>}
                  </div>
                  <div className="font-mono text-sm font-bold">
                    {w ? award.stat(w) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* All-NBA teams */}
        {allNBA1.length > 0 && (
          <Panel title="ALL-NBA TEAMS">
            {[['ALL-NBA FIRST TEAM', allNBA1], ['ALL-NBA SECOND TEAM', allNBA2], ['ALL-NBA THIRD TEAM', allNBA3]].map(([label, team]) => (
              <div key={label} className="mb-3 last:mb-0">
                <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
                <div className="space-y-0.5">
                  {team.map((p, i) => {
                    const you = isYou(p);
                    const t = TEAM_MAP[p.team];
                    return (
                      <div key={i}
                        className={`font-mono text-sm flex justify-between items-center py-0.5 ${you ? 'font-bold' : ''}`}
                        style={you ? { background: '#000', color: '#fff', padding: '2px 6px', margin: '0 -6px' } : {}}>
                        <span>{you ? `★ ${player.name}` : p.name} <span className={`text-xs ${you ? 'opacity-70' : 'text-gray-400'}`}>{p.pos} {t ? `· ${t.id}` : ''}</span></span>
                        <span className="text-xs">{p.ppg} PPG</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Panel>
        )}

        <button className="btn btn-primary w-full py-3 tracking-widest pb-8"
          onClick={() => goTo('SEASON_DASHBOARD')}>
          ← BACK TO DASHBOARD
        </button>
      </div>
    </div>
  );
}
