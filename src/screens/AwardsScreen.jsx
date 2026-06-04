import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

// Pick All-NBA team with positional requirements: 2G, 2F, 1C
function selectAllNBATeam(players, exclude = new Set()) {
  const pool  = players.filter(p => !exclude.has(p.id ?? p.name) && (p.gp ?? 0) >= 40);
  const guards = pool.filter(p => p.pos === 'PG' || p.pos === 'SG').sort((a, b) => b.ppg - a.ppg);
  const forwards= pool.filter(p => p.pos === 'SF' || p.pos === 'PF').sort((a, b) => b.ppg - a.ppg);
  const centers = pool.filter(p => p.pos === 'C').sort((a, b) => b.ppg - a.ppg);
  const team = [guards[0], guards[1], forwards[0], forwards[1], centers[0]].filter(Boolean);
  return team;
}

function findWinner(players, compareFn, minGP = 40) {
  return [...players].filter(p => (p.gp ?? 0) >= minGP).sort(compareFn)[0] ?? null;
}

export default function AwardsScreen() {
  const player        = useGameStore(s => s.player);
  const league        = useGameStore(s => s.league);
  const seasonResults = useGameStore(s => s.seasonResults);
  const playoffState  = useGameStore(s => s.playoffState);
  const goTo          = useGameStore(s => s.goTo);

  const season = seasonResults?.season ?? (2025 + player.nbaSeasonsPlayed - 1);
  const ps     = seasonResults?.playerSeason;
  const playerAwards = ps?.awards ?? [];

  const leaguePlayers = (league?.playerStats ?? [])
    .find(e => e.season === season)?.players ?? [];

  function isYou(w) { return w?.isPlayer || w?.name === player.name; }
  function teamStr(w) { return w ? (TEAM_MAP[w.team]?.id ?? w.team) : '—'; }

  const awards = [
    {
      name: 'Most Valuable Player', abbr: 'MVP',
      winner: findWinner(
        leaguePlayers.filter(p => { const t = league?.standings?.[p.team]; return t && t.wins >= 48; }),
        (a, b) => b.ppg - a.ppg
      ),
      stat: p => `${p.ppg} PPG`,
    },
    {
      name: 'Rookie of the Year', abbr: 'ROY',
      winner: (isYou({ name: player.name }) && player.nbaSeasonsPlayed === 1 && playerAwards.includes('ROY'))
        ? { name: player.name, team: player.team, isPlayer: true, pos: player.position, ppg: ps?.averages?.pts ?? 0, gp: ps?.gamesPlayed ?? 0 }
        : findWinner(leaguePlayers.filter(p => p.age <= 22), (a, b) => b.ppg - a.ppg),
      stat: p => `${p.ppg} PPG`,
    },
    {
      name: 'Def. Player of the Year', abbr: 'DPOY',
      winner: findWinner(leaguePlayers, (a, b) => (b.spg + b.bpg) - (a.spg + a.bpg)),
      stat: p => `${p.spg} SPG / ${p.bpg} BPG`,
    },
    {
      name: 'Most Improved Player', abbr: 'MIP',
      winner: findWinner(leaguePlayers.filter(p => p.ppg >= 14 && p.age <= 27), (a, b) => b.ppg - a.ppg),
      stat: p => `${p.ppg} PPG`,
    },
    { name: 'Scoring Champion',  abbr: 'Scoring Title',
      winner: findWinner(leaguePlayers, (a, b) => b.ppg - a.ppg), stat: p => `${p.ppg} PPG` },
    { name: 'Assists Champion',  abbr: 'Assists Title',
      winner: findWinner(leaguePlayers, (a, b) => b.apg - a.apg), stat: p => `${p.apg} APG` },
    { name: 'Rebounds Champion', abbr: 'Rebounds Title',
      winner: findWinner(leaguePlayers, (a, b) => b.rpg - a.rpg), stat: p => `${p.rpg} RPG` },
  ];

  // Finals MVP — champion's best scorer
  const champion = playoffState?.champion;
  const finalsMVP = (() => {
    if (!champion) return null;
    if (champion.id === player.team) {
      return { name: player.name, isPlayer: true, team: player.team, pos: player.position, ppg: ps?.averages?.pts ?? 0 };
    }
    return findWinner(leaguePlayers.filter(p => p.team === champion.id), (a, b) => b.ppg - a.ppg);
  })();

  // All-NBA teams
  const excl1 = new Set();
  const allNBA1 = selectAllNBATeam(leaguePlayers);
  allNBA1.forEach(p => excl1.add(p.id ?? p.name));
  const allNBA2 = selectAllNBATeam(leaguePlayers, excl1);
  allNBA2.forEach(p => excl1.add(p.id ?? p.name));
  const allNBA3 = selectAllNBATeam(leaguePlayers, excl1);

  function AwardRow({ award }) {
    const w = award.winner;
    const you = isYou(w);
    return (
      <div className={`flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0
        ${you ? 'font-bold' : ''}`}
        style={you ? { background: '#000', color: '#fff', padding: '4px 8px', margin: '0 -8px' } : {}}>
        <div>
          <div className="text-sm">{award.name}</div>
          {w && <div className={`font-mono text-xs ${you ? 'opacity-70' : 'text-gray-500'}`}>
            {you ? `★ ${player.name}` : w.name} · {teamStr(w)}
          </div>}
        </div>
        <div className="font-mono text-sm font-bold ml-4 shrink-0">
          {w ? award.stat(w) : '—'}
        </div>
      </div>
    );
  }

  function AllNBATeam({ label, team }) {
    if (!team.length) return null;
    return (
      <div className="mb-3 last:mb-0">
        <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
        {team.map((p, i) => {
          const you = isYou(p);
          const t = TEAM_MAP[p?.team];
          return (
            <div key={i}
              className={`font-mono text-sm flex justify-between items-center py-0.5 ${you ? 'font-bold' : ''}`}
              style={you ? { background: '#000', color: '#fff', padding: '2px 8px', margin: '0 -8px' } : {}}>
              <span>
                {you ? `★ ${player.name}` : (p?.name ?? '—')}
                {' '}<span className={`text-xs ${you ? 'opacity-70' : 'text-gray-400'}`}>
                  {p?.pos} {t ? `· ${t.id}` : ''}
                </span>
              </span>
              <span className="text-xs ml-2">{p?.ppg} PPG</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav links={[{ screen: 'SEASON_DASHBOARD', label: 'Dashboard' }]} />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">{season}–{season + 1} Season</div>
          <h2 className="text-2xl font-bold">END-OF-SEASON AWARDS</h2>
        </div>

        {/* Player's own awards */}
        {playerAwards.length > 0 && (
          <div className="border-2 border-black p-4">
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-2">Your Awards This Season</div>
            {playerAwards.map((a, i) => (
              <div key={i} className="font-bold text-lg font-mono">🏆 {a}</div>
            ))}
          </div>
        )}

        {/* Finals champion + MVP */}
        {champion && (
          <Panel title="NBA CHAMPION">
            <div className="font-mono text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Champion</span>
                <span className="font-bold">{champion.city} {champion.name}</span>
              </div>
              {finalsMVP && finalsMVP.name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Finals MVP</span>
                  <span className="font-bold">
                    {isYou(finalsMVP) ? `★ ${player.name}` : finalsMVP.name}
                    {finalsMVP.ppg != null ? ` · ${finalsMVP.ppg} PPG` : ''}
                  </span>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Individual awards */}
        <Panel title="INDIVIDUAL AWARDS">
          <div className="space-y-2 px-2">
            {awards.map(award => <AwardRow key={award.abbr} award={award} />)}
          </div>
        </Panel>

        {/* All-NBA by position (2G, 2F, 1C) */}
        {allNBA1.length > 0 && (
          <Panel title="ALL-NBA TEAMS (2G · 2F · 1C)">
            <div className="px-2">
              <AllNBATeam label="ALL-NBA FIRST TEAM"  team={allNBA1} />
              <AllNBATeam label="ALL-NBA SECOND TEAM" team={allNBA2} />
              <AllNBATeam label="ALL-NBA THIRD TEAM"  team={allNBA3} />
            </div>
          </Panel>
        )}

        <div className="pb-8">
          <button className="btn btn-primary w-full py-3"
            onClick={() => goTo('SEASON_DASHBOARD')}>← BACK TO DASHBOARD</button>
        </div>
      </div>
    </div>
  );
}
