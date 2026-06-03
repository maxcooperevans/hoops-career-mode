import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import {
  simPlayerSeason, simLeagueStandings, determineAwards,
  buildSeasonNews, simLeaguePlayerStats,
} from '../engine/seasonEngine.js';
import { buildPlayoffBracket } from '../engine/playoffEngine.js';
import { generateSchedule } from '../engine/gameEngine.js';
import { pickEvents } from '../data/events.js';
import { TEAM_MAP, TEAMS } from '../data/teams.js';
import { computeOverall, shouldRetire } from '../engine/playerEngine.js';
import { computeLegacyScore, generateCareerObituary } from '../engine/legacyEngine.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';
import StatTable from '../components/StatTable.jsx';

function fmtSalary(n) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}
function fmtMoney(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

// ── League Leaderboards Component ───────────────────────────────────────────
const LEAD_CATS = [
  { key: 'ppg', label: 'PPG', title: 'Points Per Game' },
  { key: 'rpg', label: 'RPG', title: 'Rebounds Per Game' },
  { key: 'apg', label: 'APG', title: 'Assists Per Game' },
  { key: 'spg', label: 'SPG', title: 'Steals Per Game' },
  { key: 'bpg', label: 'BPG', title: 'Blocks Per Game' },
];

function LeagueLeaderboards({ league, playerName, season }) {
  const [cat, setCat] = React.useState('ppg');
  const seasonEntry = league?.playerStats?.find(e => e.season === season);
  if (!seasonEntry?.players?.length) return null;

  const sorted = [...seasonEntry.players]
    .filter(p => p.gp >= 40)
    .sort((a, b) => (b[cat] ?? 0) - (a[cat] ?? 0))
    .slice(0, 15);

  const max = sorted[0]?.[cat] ?? 1;

  return (
    <Panel title={`${season}–${season + 1} LEAGUE LEADERS`}>
      {/* Category tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {LEAD_CATS.map(c => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`btn text-xs py-1 px-3 ${cat === c.key ? 'btn-primary' : ''}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="font-mono text-xs text-gray-400 mb-2">
        {LEAD_CATS.find(c => c.key === cat)?.title} — Top 15
      </div>

      {/* Bar-chart leaderboard */}
      <div className="space-y-1">
        {sorted.map((p, i) => {
          const val = p[cat] ?? 0;
          const barPct = Math.round((val / max) * 100);
          const isPlayer = p.isPlayer || p.name === playerName;
          const teamObj = TEAM_MAP[p.team];
          return (
            <div key={p.id ?? i}
              className={`flex items-center gap-2 py-0.5 ${isPlayer ? 'font-bold' : ''}`}
              style={isPlayer ? { background: '#000', color: '#fff', padding: '2px 4px', margin: '0 -4px' } : {}}>
              <span className="w-4 text-right shrink-0 opacity-50">{i + 1}</span>
              <span className="w-32 truncate shrink-0">
                {isPlayer ? `★ ${p.name}` : p.name}
              </span>
              <span className="w-8 shrink-0 opacity-60">{p.pos}</span>
              <span className="w-12 shrink-0 opacity-60">
                {teamObj ? teamObj.id : p.team}
              </span>
              <div className="flex-1 h-2 bg-gray-200 border border-current overflow-hidden">
                <div className="h-full bg-current" style={{ width: `${barPct}%` }} />
              </div>
              <span className="w-10 text-right shrink-0 font-bold">{val}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default function SeasonDashboard() {
  const player = useGameStore(s => s.player);
  const league = useGameStore(s => s.league);
  const seasonResults = useGameStore(s => s.seasonResults);
  const newsItems = useGameStore(s => s.newsItems);
  const finishSeason = useGameStore(s => s.finishSeason);
  const setPendingEvent = useGameStore(s => s.setPendingEvent);
  const addNews = useGameStore(s => s.addNews);
  const goTo = useGameStore(s => s.goTo);
  const retire = useGameStore(s => s.retire);
  const setPlayoffState = useGameStore(s => s.setPlayoffState);
  const clearSeasonGameLog = useGameStore(s => s.clearSeasonGameLog);

  // seasonYear is captured once at mount so it doesn't shift after finishSeason increments nbaSeasonsPlayed.
  const [seasonYear] = useState(() => 2025 + player.nbaSeasonsPlayed);
  const [simmed, setSimmed] = useState(player.currentSeasonSimmed ?? false);
  const [simResult, setSimResult] = useState(player.currentSeasonSimmed ? seasonResults : null);
  const [schedule] = useState(() => generateSchedule(player.team, seasonYear));
  const gamesPlayed = player.gamesPlayedThisSeason ?? 0;

  const team = player.team ? TEAM_MAP[player.team] : null;
  const overall = computeOverall(player.attributes, player.position);

  const standings = league?.standings ?? null;

  function handleSimSeason() {
    if (!team) return;

    const playerSeason = simPlayerSeason(player, team, seasonYear);
    const newStandings = simLeagueStandings(TEAMS, player.team, playerSeason);
    const awards = determineAwards(playerSeason, newStandings, player.team, player.nbaSeasonsPlayed);
    playerSeason.awards = awards;

    // Sim league-wide player stats for leaderboards
    const leaguePlayerStats = simLeaguePlayerStats(TEAMS, seasonYear, {
      name: player.name, team: player.team, pos: player.position,
      age: player.age, overall: playerSeason.overall,
      averages: playerSeason.averages, gamesPlayed: playerSeason.gamesPlayed,
      fgPct: playerSeason.fgPct, fg3Pct: playerSeason.fg3Pct,
    });

    const results = {
      season: seasonYear,
      playerSeason,
      league: { standings: newStandings },
      leaguePlayerStats,
      team: player.team,
    };

    finishSeason(results);

    // News items
    const newsFlash = buildSeasonNews(playerSeason, awards, newStandings, player.team, player.name);
    newsFlash.forEach(n => addNews(n));

    setSimResult(results);
    setSimmed(true);

    // Queue more season events (4 now)
    const events = pickEvents('season', 4);
    events.forEach((ev, i) => setTimeout(() => setPendingEvent(ev), i * 150));

    clearSeasonGameLog();
  }

  function handlePlayNextGame() {
    const nextGame = schedule[gamesPlayed];
    if (!nextGame) return;
    useGameStore.getState().goTo('PLAY_GAME'); // will be called after state set
    useGameStore.setState(s => { s.currentGameEntry = nextGame; s.screen = 'PLAY_GAME'; });
  }

  function handleGoToOffseason() {
    if (shouldRetire(player)) {
      const legacy = computeLegacyScore(player);
      const obituary = generateCareerObituary(player, legacy);
      retire({ ...legacy, obituary });
      return;
    }
    // Check if team made playoffs
    const standings = simResult?.league?.standings ?? league?.standings;
    if (standings) {
      const teamRecord = standings[player.team];
      const confTeams = TEAMS
        .filter(t => t.conf === (TEAM_MAP[player.team]?.conf ?? 'East'))
        .map(t => ({ ...t, wins: standings[t.id]?.wins ?? 0 }))
        .sort((a, b) => b.wins - a.wins);
      const seed = confTeams.findIndex(t => t.id === player.team) + 1;
      if (seed >= 1 && seed <= 8) {
        const bracket = buildPlayoffBracket(standings);
        setPlayoffState(bracket);
        goTo('PLAYOFFS');
        return;
      }
    }
    goTo('OFFSEASON');
  }

  const sr = simResult ?? seasonResults;
  const ps = sr?.playerSeason;
  const avg = ps?.averages;

  // Get sorted standings by conference
  const eastTeams = TEAMS.filter(t => t.conf === 'East');
  const westTeams = TEAMS.filter(t => t.conf === 'West');

  function renderStandings(confTeams, conf) {
    const sorted = confTeams
      .map(t => ({ ...t, ...((standings ?? {})[t.id] ?? { wins: 0, losses: 0, pct: 0 }) }))
      .sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));

    return (
      <div>
        <div className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-1">{conf}</div>
        <table className="stat-table">
          <thead>
            <tr><th className="text-left">Team</th><th>W</th><th>L</th><th>PCT</th></tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={t.id} style={t.id === player.team ? { background: '#000', color: '#fff' } : {}}>
                <td className="text-left">{i + 1}. {t.city} {t.name}</td>
                <td>{t.wins ?? '—'}</td>
                <td>{t.losses ?? '—'}</td>
                <td>{t.pct ? t.pct.toFixed(3) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav links={[
        { screen: 'MY_PLAYER', label: 'My Player' },
        { screen: 'CAREER', label: 'Stats' },
      ]} />

      <div className="max-w-5xl mx-auto p-4">
        <div className="mt-4 mb-5 flex items-end justify-between flex-wrap gap-2">
          <div>
            <div className="font-mono text-xs text-gray-400">{team ? `${team.city} ${team.name}` : '—'} · Season {seasonYear}–{seasonYear + 1}</div>
            <h2 className="text-2xl font-bold">SEASON DASHBOARD</h2>
          </div>
          <div className="font-mono text-xs text-right">
            <div>Age {player.age} · {player.position} · OVR {overall}</div>
            <div className="text-gray-500">Contract: {fmtSalary(player.contractSalary)}/yr · {player.contractYearsLeft} yr{player.contractYearsLeft !== 1 ? 's' : ''} left</div>
          </div>
        </div>

        {!simmed ? (
          /* Pre-sim view */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Panel title="ATTRIBUTES">
                <div className="space-y-1 font-mono text-xs">
                  {[['Overall', overall],['Coach Trust', player.coachTrust],['Chemistry', player.chemistry],['Fan Approval', player.fanApproval],['Brand', player.brand]].map(([l,v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="PRIOR SEASON" className="md:col-span-2">
                {ps ? (
                  <div>
                    <div className="grid grid-cols-5 gap-2 font-mono text-center mb-3">
                      {[['PTS',avg.pts],['REB',avg.reb],['AST',avg.ast],['STL',avg.stl],['BLK',avg.blk]].map(([l,v]) => (
                        <div key={l}>
                          <div className="text-xl font-bold">{v}</div>
                          <div className="text-xs text-gray-500">{l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      {ps.gamesPlayed} GP · {ps.fgPct}% FG · {ps.fg3Pct}% 3P · {ps.ftPct}% FT
                    </div>
                    {ps.awards?.length > 0 && (
                      <div className="mt-2 font-mono text-xs">
                        🏆 {ps.awards.join(' · ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="font-mono text-xs text-gray-400">First NBA season</div>
                )}
              </Panel>
            </div>

            {standings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderStandings(eastTeams, 'Eastern Conference')}
                {renderStandings(westTeams, 'Western Conference')}
              </div>
            )}

            {player.injury && (
              <div className="panel border-2">
                <div className="panel-body font-mono text-sm">
                  ⚠️ <strong>Injured:</strong> {player.injury.type} — {player.injury.gamesMissed} games missed this season
                </div>
              </div>
            )}

            {/* Game progress bar (when games have been played manually) */}
            {gamesPlayed > 0 && (
              <div className="panel">
                <div className="panel-body">
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span>Games Played</span>
                    <span>{gamesPlayed} / 82</span>
                  </div>
                  <div className="h-2 bg-gray-200 border border-black">
                    <div className="h-full bg-black" style={{ width: `${(gamesPlayed / 82) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                className="btn btn-primary py-4 tracking-widest text-base"
                onClick={handlePlayNextGame}
                disabled={gamesPlayed >= 82}
              >
                ▶ PLAY NEXT GAME {gamesPlayed > 0 ? `(${gamesPlayed + 1}/82)` : ''}
              </button>
              <button
                className="btn py-4 tracking-widest text-base"
                onClick={handleSimSeason}
              >
                ⚡ QUICK SIM {gamesPlayed > 0 ? 'REMAINING' : 'FULL SEASON'}
              </button>
            </div>
          </div>
        ) : (
          /* Post-sim view */
          <div className="space-y-4">
            {ps && (
              <Panel title={`${ps.season}–${ps.season + 1} SEASON — FINAL`}>
                <div className="grid grid-cols-5 gap-2 font-mono text-center mb-4">
                  {[['PTS',avg.pts],['REB',avg.reb],['AST',avg.ast],['STL',avg.stl],['BLK',avg.blk]].map(([l,v]) => (
                    <div key={l}>
                      <div className="text-3xl font-bold">{v}</div>
                      <div className="text-xs text-gray-500">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-xs border-t border-gray-200 pt-3 grid grid-cols-3 gap-2">
                  <div><span className="text-gray-500">GP </span>{ps.gamesPlayed}</div>
                  <div><span className="text-gray-500">FG% </span>{ps.fgPct}%</div>
                  <div><span className="text-gray-500">3P% </span>{ps.fg3Pct}%</div>
                  <div><span className="text-gray-500">FT% </span>{ps.ftPct}%</div>
                  <div><span className="text-gray-500">MPG </span>{ps.mpg}</div>
                  <div><span className="text-gray-500">Role </span>{ps.role}</div>
                </div>
                {ps.bestGame && (
                  <div className="mt-3 font-mono text-xs text-gray-500 border-t border-gray-100 pt-2">
                    Best game: {ps.bestGame.pts} PTS · {ps.bestGame.reb} REB · {ps.bestGame.ast} AST · {ps.bestGame.fgm}/{ps.bestGame.fga} FG
                  </div>
                )}
                {ps.awards?.length > 0 && (
                  <div className="mt-2 font-mono text-xs font-bold">
                    AWARDS: {ps.awards.join(' · ')}
                  </div>
                )}
              </Panel>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderStandings(eastTeams, 'Eastern Conference')}
              {renderStandings(westTeams, 'Western Conference')}
            </div>

            {/* League Leaderboards */}
            <LeagueLeaderboards league={league} playerName={player.name} season={sr?.season} />

            {/* News Feed */}
            {newsItems.length > 0 && (
              <Panel title="NEWS FEED">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {newsItems.slice(0, 15).map(n => (
                    <div key={n.id} className={`font-mono text-xs pb-1 border-b border-gray-100 last:border-0 ${n.type === 'award' ? 'font-bold' : ''}`}>
                      <span className="text-gray-400 mr-2">{n.date}</span>{n.headline}
                      {n.body && <div className="text-gray-500 mt-0.5">{n.body}</div>}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button className="btn py-3 text-sm" onClick={() => goTo('MY_PLAYER')}>My Player</button>
              <button className="btn py-3 text-sm" onClick={() => goTo('AWARDS')}>Awards</button>
              <button className="btn py-3 text-sm" onClick={() => goTo('CAREER')}>Full Stats</button>
            </div>
            <button className="btn btn-primary w-full py-3 tracking-widest" onClick={handleGoToOffseason}>
              ADVANCE TO PLAYOFFS / OFFSEASON →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
