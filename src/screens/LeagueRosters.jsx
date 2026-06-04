import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAMS, generateRoster } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

// ── Deterministic varied stats per NPC player ──────────────────────────────
// Uses a stable hash of the player's seed-based ID so the same player always
// shows the same stats (consistent across navigations) but different players
// genuinely differ. No ID lookup needed — stats derived from overall+position.

function stableRnd(id, n) {
  // djb2-style hash of id string, then nudge by n
  let h = 5381;
  const s = String(id ?? 'x') + String(n);
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return (h % 10000) / 10000; // 0–1
}

function computeNPCStats(p) {
  const ovr      = p.overall ?? 60;
  const isStar   = p.isStar ?? false;
  const isStart  = (p.isStarter ?? false) || isStar;
  const pos      = p.pos ?? 'SF';
  const id       = p.id ?? p.name ?? 'x';

  // PPG: star 14-28, starter 7-18, bench 2-8
  const ppgBase  = isStar   ? 16 + (ovr - 75) * 0.45
                 : isStart  ?  9 + (ovr - 65) * 0.28
                 :              4 + (ovr - 55) * 0.12;
  const ppgVar   = (stableRnd(id, 1) - 0.5) * 6;
  const ppg      = Math.max(1.0, Math.round((ppgBase + ppgVar) * 10) / 10);

  // RPG: bigs rebound more
  const rebBase  = { PG: 2.5, SG: 3.4, SF: 5.2, PF: 7.4, C: 9.8 }[pos] ?? 4.5;
  const rebScale = isStar ? 1.25 : isStart ? 1.0 : 0.65;
  const rpg      = Math.max(0.5, Math.round((rebBase * rebScale + (stableRnd(id, 2) - 0.5) * 2.8) * 10) / 10);

  // APG: PGs lead, bigs trail
  const astBase  = { PG: 5.8, SG: 2.9, SF: 2.3, PF: 1.9, C: 1.5 }[pos] ?? 2.0;
  const astScale = isStar ? 1.3 : isStart ? 1.0 : 0.55;
  const apg      = Math.max(0.2, Math.round((astBase * astScale + (stableRnd(id, 3) - 0.5) * 1.8) * 10) / 10);

  // SPG: guards steal more
  const spgBase  = pos === 'PG' ? 1.2 : pos === 'SG' ? 1.0 : 0.8;
  const spg      = Math.max(0.1, Math.round((spgBase * (isStar ? 1.2 : 1.0) + (stableRnd(id, 4) - 0.5) * 0.8) * 10) / 10);

  // BPG: bigs block more
  const bpgBase  = { PG: 0.2, SG: 0.3, SF: 0.5, PF: 0.9, C: 1.8 }[pos] ?? 0.5;
  const bpg      = Math.max(0.0, Math.round((bpgBase * (isStar ? 1.3 : 1.0) + stableRnd(id, 5) * 0.5) * 10) / 10);

  return { ppg, rpg, apg, spg, bpg };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LeagueRosters() {
  const player      = useGameStore(s => s.player);
  const goTo        = useGameStore(s => s.goTo);
  // Use the stored season from last completed season for roster seed consistency
  const season      = 2025 + Math.max(0, player.nbaSeasonsPlayed - 1);

  const [selectedTeam, setSelectedTeam] = useState(player.team ?? TEAMS[0].id);
  const [view, setView]       = useState('game');  // 'game' | 'ability'
  const [confFilter, setConfFilter] = useState('all');

  const team = TEAMS.find(t => t.id === selectedTeam);
  const isPlayerTeam = selectedTeam === player.team;

  const baseRoster = useMemo(() => generateRoster(team, season), [selectedTeam, season]);

  // Inject career player into their own team's roster
  const roster = useMemo(() => {
    if (!isPlayerTeam) return baseRoster;
    const playerEntry = {
      id: 'career_player',
      name: `★ ${player.name}`,
      pos: player.position,
      age: player.age,
      overall: Math.round(baseRoster[0]?.overall ? baseRoster[0].overall + 4 : 70),
      isStarter: true,
      isStar: player.nbaSeasonsPlayed >= 2,
      contract: { salary: player.contractSalary, years: player.contractYearsLeft },
      isCareerPlayer: true,
    };
    return [playerEntry, ...baseRoster.slice(1)];
  }, [isPlayerTeam, baseRoster, player]);

  const confTeams = TEAMS
    .filter(t => confFilter === 'all' || t.conf === confFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen">
      <TopNav links={[{ screen: 'SEASON_DASHBOARD', label: 'Dashboard' }]} />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">NBA League · {season}–{season + 1}</div>
          <h2 className="text-2xl font-bold">LEAGUE ROSTERS</h2>
        </div>

        {/* Conference filter */}
        <div className="flex gap-1">
          {['all', 'East', 'West'].map(c => (
            <button key={c} onClick={() => setConfFilter(c)}
              className={`btn text-xs py-1 px-3 ${confFilter === c ? 'btn-primary' : ''}`}>
              {c === 'all' ? 'All Teams' : c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Team list */}
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto">
            {confTeams.map(t => (
              <button key={t.id} onClick={() => setSelectedTeam(t.id)}
                className={`btn w-full text-left py-2 px-3 flex items-center justify-between
                  ${selectedTeam === t.id ? 'btn-primary' : ''}
                  ${t.id === player.team ? 'border-2' : ''}`}>
                <span className="text-sm font-semibold">{t.city} {t.name}</span>
                <span className="font-mono text-xs opacity-60">Str: {t.strength}</span>
              </button>
            ))}
          </div>

          {/* Roster panel */}
          <div className="md:col-span-2 space-y-3">
            {team && (
              <>
                <Panel title={`${team.city} ${team.name}`}>
                  <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                    {[['Conference', team.conf], ['Division', team.div],
                      ['Strength', `${team.strength}/100`], ['Market', `${team.market}/100`],
                      ['Culture', `${team.culture}/100`], ['Arena', team.arena]].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-gray-500">{l}</span><span>{v}</span>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* View toggle */}
                <div className="flex border border-black">
                  {[['game', 'Game Stats'], ['ability', 'Ability Stats']].map(([v, label]) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`flex-1 py-1.5 text-xs font-bold border-r last:border-r-0 border-black
                        ${view === v ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Roster table */}
                <div className="overflow-x-auto">
                  <table className="stat-table">
                    <thead>
                      {view === 'game' ? (
                        <tr>
                          <th className="text-left">Player</th><th>Pos</th><th>Age</th>
                          <th>PPG</th><th>RPG</th><th>APG</th><th>SPG</th><th>BPG</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="text-left">Player</th><th>Pos</th><th>Age</th>
                          <th>OVR</th><th>Contract</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {roster.map((p, i) => {
                        const isCP = p.isCareerPlayer;
                        const gs   = isCP ? null : computeNPCStats(p);
                        const style = isCP
                          ? { background: '#000', color: '#fff', fontWeight: 'bold' }
                          : p.isStar ? { fontWeight: 'bold' } : {};

                        // Career player game stats from last season
                        const cpLast = isCP
                          ? player.nbaSeasons[player.nbaSeasons.length - 1]?.averages
                          : null;

                        return (
                          <tr key={i} style={style}>
                            <td className="text-left">{p.name}</td>
                            <td>{p.pos}</td>
                            <td>{p.age}</td>
                            {view === 'game' ? (
                              <>
                                <td>{isCP ? (cpLast?.pts ?? '—') : gs.ppg}</td>
                                <td>{isCP ? (cpLast?.reb ?? '—') : gs.rpg}</td>
                                <td>{isCP ? (cpLast?.ast ?? '—') : gs.apg}</td>
                                <td>{isCP ? (cpLast?.stl ?? '—') : gs.spg}</td>
                                <td>{isCP ? (cpLast?.blk ?? '—') : gs.bpg}</td>
                              </>
                            ) : (
                              <>
                                <td>{p.overall}</td>
                                <td className="text-left font-mono text-xs">
                                  {isCP
                                    ? `$${(p.contract.salary / 1_000_000).toFixed(1)}M · ${p.contract.years}yr`
                                    : `$${(p.contract.salary / 1_000_000).toFixed(1)}M · ${p.contract.years}yr`}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pb-8">
          <button className="btn w-full py-2" onClick={() => goTo('SEASON_DASHBOARD')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
