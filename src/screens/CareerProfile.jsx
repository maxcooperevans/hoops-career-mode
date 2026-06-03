import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';
import { computeOverall } from '../engine/playerEngine.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

function fmtSalary(n) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

// Simple inline bar for visual emphasis
function Bar({ val, max, invert }) {
  const pct = Math.min(100, Math.round((val / Math.max(max, 1)) * 100));
  return (
    <div className="flex items-center gap-1">
      <div className="w-16 h-1.5 bg-gray-200 border border-black overflow-hidden">
        <div className="h-full bg-black" style={{ width: `${pct}%` }} />
      </div>
      <span>{val}</span>
    </div>
  );
}

const SEASON_TAB  = 'seasons';
const HIGHS_TAB   = 'highs';
const AWARDS_TAB  = 'awards';

export default function CareerProfile() {
  const player  = useGameStore(s => s.player);
  const goTo    = useGameStore(s => s.goTo);
  const [tab, setTab] = useState(SEASON_TAB);

  const team    = player.team ? TEAM_MAP[player.team] : null;
  const overall = computeOverall(player.attributes, player.position);

  const gp  = player.careerGames;
  const ppg = gp > 0 ? (player.careerPts  / gp).toFixed(1) : '—';
  const rpg = gp > 0 ? (player.careerReb  / gp).toFixed(1) : '—';
  const apg = gp > 0 ? (player.careerAst  / gp).toFixed(1) : '—';
  const spg = gp > 0 ? ((player.careerStl ?? 0) / gp).toFixed(1) : '—';
  const bpg = gp > 0 ? ((player.careerBlk ?? 0) / gp).toFixed(1) : '—';

  const ch = player.careerHighs ?? {};

  // Awards grouped by base name
  const awardsGrouped = player.awards.reduce((acc, a) => {
    const base = a.replace(/\s*\(\d{4}[^)]*\)/, '');
    if (!acc[base]) acc[base] = [];
    acc[base].push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <TopNav links={[{ screen: 'SEASON_DASHBOARD', label: 'Dashboard' }]} />

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">
            {team ? `${team.city} ${team.name}` : '—'} · {player.position} · Age {player.age}
          </div>
          <h2 className="text-2xl font-bold">{player.name}</h2>
        </div>

        {/* Career-average stat bar */}
        <div className="grid grid-cols-5 gap-0 border border-black">
          {[['PPG', ppg], ['RPG', rpg], ['APG', apg], ['SPG', spg], ['BPG', bpg]].map(([l, v], i) => (
            <div key={l} className={`p-3 text-center ${i < 4 ? 'border-r border-black' : ''}`}>
              <div className="text-3xl font-bold font-mono">{v}</div>
              <div className="font-mono text-xs text-gray-500 mt-0.5">{l} career avg</div>
            </div>
          ))}
        </div>

        {/* Quick info row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Panel title="CAREER">
            <div className="font-mono text-sm space-y-1">
              {[['Games', gp], ['Seasons', player.nbaSeasonsPlayed],
                ['Championships', player.championships], ['All-Stars', player.allStarSelections]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span>{v}</span></div>
              ))}
            </div>
          </Panel>
          <Panel title="FINANCIALS">
            <div className="font-mono text-sm space-y-1">
              {[['Salary', fmtSalary(player.contractSalary)],
                ['Yrs Left', player.contractYearsLeft],
                ['Earnings', `$${(player.totalEarnings / 1_000_000).toFixed(1)}M`],
                ['Brand', `${player.brand}/100`]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span>{v}</span></div>
              ))}
            </div>
          </Panel>
          <Panel title="RELATIONSHIPS">
            <div className="font-mono text-sm space-y-1">
              {[['Coach Trust', player.coachTrust], ['Chemistry', player.chemistry],
                ['Fan Approval', player.fanApproval], ['Reputation', player.personalityRep]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span>{v}</span></div>
              ))}
            </div>
          </Panel>
          <Panel title="OVERVIEW">
            <div className="font-mono text-sm space-y-1">
              {[['Overall', overall], ['Archetype', player.archetype],
                ['Draft Pick', `#${player.draftPick ?? '—'}`], ['Hometown', player.hometown]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span>
                  <span className="text-right text-xs max-w-[120px] truncate">{v}</span></div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border border-black">
          {[[SEASON_TAB, 'Season Log'], [HIGHS_TAB, 'Career Highs'], [AWARDS_TAB, 'Awards']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-r last:border-r-0 border-black
                ${tab === t ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Season Log tab */}
        {tab === SEASON_TAB && player.nbaSeasons.length > 0 && (
          <div className="overflow-x-auto">
            <table className="stat-table">
              <thead>
                <tr>
                  <th className="text-left">Season</th>
                  <th className="text-left">Team</th>
                  <th>GP</th>
                  <th>Role</th>
                  <th>PPG</th>
                  <th>RPG</th>
                  <th>APG</th>
                  <th>SPG</th>
                  <th>BPG</th>
                  <th>FG%</th>
                  <th>3P%</th>
                  <th>FT%</th>
                  <th>MPG</th>
                  <th title="Season-high points">SHI PTS</th>
                </tr>
              </thead>
              <tbody>
                {player.nbaSeasons.map((s, i) => {
                  const a = s.averages;
                  const teamObj = TEAM_MAP[s.team];
                  const isBestPPG = a.pts === ch.ptsAvg;
                  return (
                    <tr key={i} style={isBestPPG ? { background: '#000', color: '#fff' } : {}}>
                      <td className="text-left">{s.season}–{s.season + 1}</td>
                      <td className="text-left">{teamObj ? teamObj.id : s.team ?? '—'}</td>
                      <td>{s.gamesPlayed}</td>
                      <td className="text-left capitalize">{s.role}</td>
                      <td>{a.pts}</td>
                      <td>{a.reb}</td>
                      <td>{a.ast}</td>
                      <td>{a.stl}</td>
                      <td>{a.blk}</td>
                      <td>{s.fgPct}%</td>
                      <td>{s.fg3Pct}%</td>
                      <td>{s.ftPct}%</td>
                      <td>{s.mpg}</td>
                      <td>{s.seasonHighs?.pts ?? s.bestGame?.pts ?? '—'}</td>
                    </tr>
                  );
                })}
                {/* Career totals row */}
                {player.nbaSeasons.length > 1 && (
                  <tr className="font-bold border-t-2 border-black">
                    <td className="text-left">CAREER</td>
                    <td>—</td>
                    <td>{gp}</td>
                    <td>—</td>
                    <td>{ppg}</td>
                    <td>{rpg}</td>
                    <td>{apg}</td>
                    <td>{spg}</td>
                    <td>{bpg}</td>
                    <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="font-mono text-xs text-gray-400 mt-1">★ Black row = career-best scoring season</div>
          </div>
        )}

        {tab === SEASON_TAB && player.nbaSeasons.length === 0 && (
          <div className="font-mono text-sm text-gray-400 text-center py-8">No NBA seasons played yet.</div>
        )}

        {/* Career Highs tab */}
        {tab === HIGHS_TAB && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel title="SINGLE-GAME HIGHS">
                <div className="font-mono text-sm space-y-2">
                  {[['Points',   ch.pts  ?? '—'],
                    ['Rebounds', ch.reb  ?? '—'],
                    ['Assists',  ch.ast  ?? '—'],
                    ['Steals',   ch.stl  ?? '—'],
                    ['Blocks',   ch.blk  ?? '—']].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between border-b border-gray-100 pb-1 last:border-0">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-bold text-xl">{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="BEST SEASON AVERAGES">
                <div className="font-mono text-sm space-y-2">
                  {[['PPG', ch.ptsAvg ?? '—'],
                    ['RPG', ch.rebAvg ?? '—'],
                    ['APG', ch.astAvg ?? '—'],
                    ['SPG', ch.stlAvg ?? '—'],
                    ['BPG', ch.blkAvg ?? '—']].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between border-b border-gray-100 pb-1 last:border-0">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-bold text-xl">{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Season-by-season game highs */}
            {player.nbaSeasons.length > 0 && (
              <Panel title="SEASON-BY-SEASON GAME HIGHS">
                <div className="overflow-x-auto">
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th className="text-left">Season</th>
                        <th>Best PTS</th>
                        <th>Best REB</th>
                        <th>Best AST</th>
                        <th>Best STL</th>
                        <th>Best BLK</th>
                        <th className="text-left">Game Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {player.nbaSeasons.map((s, i) => {
                        const sh = s.seasonHighs ?? {};
                        const bg = s.bestGame ?? {};
                        return (
                          <tr key={i}>
                            <td className="text-left">{s.season}–{s.season + 1}</td>
                            <td>{sh.pts ?? bg.pts ?? '—'}</td>
                            <td>{sh.reb ?? bg.reb ?? '—'}</td>
                            <td>{sh.ast ?? bg.ast ?? '—'}</td>
                            <td>{sh.stl ?? bg.stl ?? '—'}</td>
                            <td>{sh.blk ?? bg.blk ?? '—'}</td>
                            <td className="text-left font-mono text-xs text-gray-500">
                              {bg.pts != null
                                ? `${bg.pts}p ${bg.reb}r ${bg.ast}a · ${bg.fgm}/${bg.fga}fg`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* Awards tab */}
        {tab === AWARDS_TAB && (
          <div className="space-y-4">
            {player.awards.length > 0 ? (
              <Panel title="AWARDS CASE">
                <div className="space-y-1">
                  {Object.entries(awardsGrouped).map(([base, list]) => (
                    <div key={base} className="font-mono text-sm border-b border-gray-100 pb-1 last:border-0 flex items-baseline gap-3">
                      <span className="font-bold w-40 shrink-0">{base}</span>
                      <span className="text-gray-400 text-xs">×{list.length}</span>
                      <span className="text-gray-400 text-xs">
                        {list.map(a => a.match(/\(([^)]+)\)/)?.[1]).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : (
              <div className="font-mono text-sm text-gray-400 text-center py-8">
                No awards yet — the trophy case is waiting.
              </div>
            )}
          </div>
        )}

        <div className="pb-8">
          <button className="btn btn-primary w-full py-3" onClick={() => goTo('SEASON_DASHBOARD')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
