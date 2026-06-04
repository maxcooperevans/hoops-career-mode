import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAMS, generateRoster } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

export default function LeagueRosters() {
  const player      = useGameStore(s => s.player);
  const league      = useGameStore(s => s.league);
  const goTo        = useGameStore(s => s.goTo);
  const season      = 2025 + player.nbaSeasonsPlayed;

  const [selectedTeam, setSelectedTeam] = useState(player.team ?? TEAMS[0].id);
  const [view, setView] = useState('game'); // 'game' | 'ability'
  const [confFilter, setConfFilter] = useState('all'); // 'all'|'East'|'West'

  const team = TEAMS.find(t => t.id === selectedTeam);
  const isPlayerTeam = selectedTeam === player.team;
  const baseRoster = useMemo(() => generateRoster(team, season), [selectedTeam, season]);

  // Inject the career player into their own team's roster
  const roster = useMemo(() => {
    if (!isPlayerTeam) return baseRoster;
    // Replace the first slot with the career player's stats
    const playerEntry = {
      id: 'career_player',
      name: `★ ${player.name}`,
      pos: player.position,
      age: player.age,
      overall: Math.round(
        baseRoster[0]?.overall
          ? (baseRoster[0].overall + 5)  // slightly better than the slot
          : 70
      ),
      isStarter: true,
      isStar: player.nbaSeasonsPlayed >= 3,
      contract: {
        salary: player.contractSalary,
        years: player.contractYearsLeft,
      },
      isCareerPlayer: true,
    };
    return [playerEntry, ...baseRoster.slice(1)];
  }, [isPlayerTeam, baseRoster, player]);

  // Get game stats for each NPC player from league leaders if available
  const leaguePlayers = (league?.playerStats ?? []).find(e => e.season)?.players ?? [];
  function getGameStats(npcId) {
    if (npcId === 'career_player') {
      const last = player.nbaSeasons[player.nbaSeasons.length - 1];
      return last ? { ppg: last.averages?.pts, rpg: last.averages?.reb, apg: last.averages?.ast, spg: last.averages?.stl, bpg: last.averages?.blk } : null;
    }
    return leaguePlayers.find(p => p.id === npcId) ?? null;
  }

  const confTeams = TEAMS.filter(t =>
    confFilter === 'all' || t.conf === confFilter
  ).sort((a, b) => a.name.localeCompare(b.name));

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
            {confTeams.map(t => {
              const record = league?.standings?.[t.id];
              return (
                <button key={t.id}
                  onClick={() => setSelectedTeam(t.id)}
                  className={`btn w-full text-left py-2 px-3 flex items-center justify-between
                    ${selectedTeam === t.id ? 'btn-primary' : ''}
                    ${t.id === player.team ? 'border-2' : ''}`}>
                  <span className="text-sm font-semibold">{t.city} {t.name}</span>
                  <span className="font-mono text-xs opacity-70">
                    {record ? `${record.wins}W` : `Str:${t.strength}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Roster panel */}
          <div className="md:col-span-2 space-y-3">
            {team && (
              <>
                {/* Team header */}
                <Panel title={`${team.city} ${team.name}`}>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
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
                        const gs = getGameStats(p.id);
                        const isCareerPlayer = p.isCareerPlayer;
                        return (
                          <tr key={i}
                            style={isCareerPlayer ? { background: '#000', color: '#fff', fontWeight: 'bold' } : p.isStar ? { fontWeight: 'bold' } : {}}>
                            <td className="text-left">
                              {p.name}
                              {p.isStar && !isCareerPlayer && <span className="text-gray-400 ml-1 text-xs">(★)</span>}
                            </td>
                            <td>{p.pos}</td>
                            <td>{p.age}</td>
                            {view === 'game' ? (
                              <>
                                <td>{gs?.ppg ?? (p.isStar ? (team.strength / 4).toFixed(1) : (team.strength / 7).toFixed(1))}</td>
                                <td>{gs?.rpg ?? (p.pos === 'C' ? '9.2' : p.pos === 'PF' ? '7.1' : '3.8')}</td>
                                <td>{gs?.apg ?? (p.pos === 'PG' ? '6.2' : '2.1')}</td>
                                <td>{gs?.spg ?? '0.9'}</td>
                                <td>{gs?.bpg ?? (p.pos === 'C' ? '1.2' : '0.4')}</td>
                              </>
                            ) : (
                              <>
                                <td>{p.overall}</td>
                                <td className="text-left font-mono text-xs">
                                  ${(p.contract.salary / 1_000_000).toFixed(1)}M · {p.contract.years}yr
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
          <button className="btn w-full py-2" onClick={() => goTo('SEASON_DASHBOARD')}>← Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}
