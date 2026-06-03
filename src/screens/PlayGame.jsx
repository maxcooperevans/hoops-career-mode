import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import {
  simulateLiveGame, aggregateQuarters, applyDecisionToQuarters,
  pickHalftimeDecision, pickQ4Decision, generateDetailedPlayLog,
  simOpponentQuarter,
} from '../engine/gameEngine.js';
import { determineRole } from '../engine/seasonEngine.js';
import { computeOverall } from '../engine/playerEngine.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';

const Q_LABELS = ['Q1', 'Q2', 'Q3', 'Q4', 'OT'];

export default function PlayGame() {
  const player       = useGameStore(s => s.player);
  const goTo         = useGameStore(s => s.goTo);
  const addGameToLog = useGameStore(s => s.addGameToLog);
  const addNews      = useGameStore(s => s.addNews);
  const scheduleEntry= useGameStore(s => s.currentGameEntry);

  const opponent  = scheduleEntry?.opponent ?? TEAM_MAP['WAS'];
  const isHome    = scheduleEntry?.isHome ?? true;
  const gameNumber= scheduleEntry?.gameNumber ?? 1;
  const season    = 2025 + player.nbaSeasonsPlayed;

  const team = player.team ? TEAM_MAP[player.team] : null;
  const overall = computeOverall(player.attributes, player.position);
  const role    = determineRole(overall, team?.strength ?? 70, player.nbaSeasonsPlayed, player.coachTrust);
  const focus   = player.playerFocus ?? 'balanced';

  // ── Game state ─────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState('intro');
  const [gameData, setGameData]   = useState(null);
  const [quarters, setQuarters]   = useState([]);
  const [shownQ, setShownQ]       = useState(0);
  const [playLog, setPlayLog]     = useState([]);   // NBA-style play entries
  const [decision, setDecision]   = useState(null);
  const [result, setResult]       = useState(null);
  const [boxTab, setBoxTab]       = useState('you'); // 'you'|'team'|'opp'
  const [teamBoxScore, setTeamBoxScore]  = useState({}); // player_id → cumulative stats
  const [oppBoxScore, setOppBoxScore]    = useState({});

  const timerRef = useRef(null);

  useEffect(() => {
    if (!team) return;
    const data = simulateLiveGame(player, team, opponent, role, focus, season);
    setGameData(data);
  }, []);

  // Running totals from revealed quarters
  const playerTotals = quarters.slice(0, shownQ).reduce(
    (acc, q) => ({
      pts: acc.pts + q.pts, reb: acc.reb + q.reb, ast: acc.ast + q.ast,
      stl: acc.stl + (q.stl ?? 0), blk: acc.blk + (q.blk ?? 0),
      fgm: acc.fgm + q.fgm, fga: acc.fga + q.fga,
    }),
    { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0 }
  );

  // Approximate running score by quarter fraction
  const runningScore = (() => {
    if (!gameData) return { team: 0, opp: 0 };
    const frac = shownQ / Math.max(4, gameData.quarters.length);
    return {
      team: Math.round(gameData.teamScore * frac),
      opp:  Math.round(gameData.oppScore  * frac),
    };
  })();

  function startAnimation(qIdx) {
    if (!gameData) return;
    const qStats  = quarters[qIdx] ?? gameData.quarters[qIdx];
    const logs    = generateDetailedPlayLog(player.name, team?.id ?? 'TM',
                      gameData.oppRoster, qStats, qIdx + 1);

    // Update opponent box score for this quarter
    const oppQLines = simOpponentQuarter(gameData.oppRoster);
    setOppBoxScore(prev => {
      const next = { ...prev };
      oppQLines.forEach(p => {
        if (!next[p.id]) next[p.id] = { name: p.name, pos: p.pos, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
        next[p.id].pts += p.qPts ?? 0;
        next[p.id].reb += p.qReb ?? 0;
        next[p.id].ast += p.qAst ?? 0;
        next[p.id].stl += p.qStl ?? 0;
        next[p.id].blk += p.qBlk ?? 0;
      });
      return next;
    });

    let logIdx = 0;
    timerRef.current = setInterval(() => {
      if (logIdx < logs.length) {
        setPlayLog(prev => [logs[logIdx], ...prev.slice(0, 11)]);
        logIdx++;
      } else {
        clearInterval(timerRef.current);
        setShownQ(qIdx + 1);

        if (qIdx === 0) {
          // Q1 done → Q2
          setTimeout(() => startAnimation(1), 500);
        } else if (qIdx === 1) {
          // Q2 done → halftime decision
          const h1pts = (quarters[0]?.pts ?? 0) + (quarters[1]?.pts ?? 0);
          const runScore = { team: gameData.teamScore * 0.5, opp: gameData.oppScore * 0.5 };
          const diff = Math.round(runScore.team - runScore.opp);
          const dec = pickHalftimeDecision(h1pts, diff);
          setTimeout(() => { setDecision({ ...dec, body: dec.body() }); setPhase('half_decision'); }, 700);
        } else if (qIdx === 2) {
          // Q3 done → possible Q4 decision
          const total3 = quarters.slice(0, 3).reduce((s, q) => s + q.pts, 0);
          const diff = Math.round((gameData.teamScore * 0.75) - (gameData.oppScore * 0.75));
          const dec = pickQ4Decision(diff, total3);
          if (dec) {
            setTimeout(() => { setDecision({ ...dec, body: dec.body() }); setPhase('q4_decision'); }, 500);
          } else {
            setTimeout(() => startQ4(), 500);
          }
        } else {
          // Final quarter done → finish
          setTimeout(() => finishGame(), 700);
        }
      }
    }, 480);
  }

  function startQ4() {
    setPhase('q4');
    startAnimation(gameData.isOT ? 4 : 3);
  }

  function handleStart() {
    setQuarters([...gameData.quarters]);
    setPhase('q1');
    setPlayLog([]);
    setShownQ(0);
    startAnimation(0);
  }

  function handleDecision(choice) {
    const updated = applyDecisionToQuarters(quarters, choice, 0);
    setQuarters(updated);
    setDecision(null);
    if (phase === 'half_decision') { setPhase('q3'); startAnimation(2); }
    if (phase === 'q4_decision')   startQ4();
  }

  function finishGame() {
    const total = aggregateQuarters(quarters);
    const won   = gameData.teamScore > gameData.oppScore;
    const line  = {
      pts: total.pts, reb: total.reb, ast: total.ast,
      stl: total.stl, blk: total.blk, tov: total.tov ?? 0,
      fgm: total.fgm, fga: total.fga,
      fg3m: total.fg3m, fg3a: total.fg3a,
      ftm: total.ftm, fta: total.fta,
      teamScore: gameData.teamScore, oppScore: gameData.oppScore,
      opponentId: opponent.id, won, isOT: gameData.isOT,
    };
    addGameToLog(line);
    addNews({
      type: 'game',
      headline: `${won ? '✓ W' : '✗ L'} ${gameData.teamScore}–${gameData.oppScore}${gameData.isOT ? ' OT' : ''} vs ${opponent.city} ${opponent.name} — ${total.pts} PTS · ${total.reb} REB · ${total.ast} AST`,
      date: `Game ${gameNumber}`,
    });
    setResult({ ...line, won });
    setPhase('final');
  }

  if (!gameData) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-mono text-sm animate-pulse">Generating game...</div>
    </div>
  );

  const oppName  = `${opponent.city} ${opponent.name}`;
  const teamName = team ? `${team.city} ${team.name}` : 'Your Team';
  const totalQs  = gameData.isOT ? 5 : 4;

  // Scoreboard
  const scoreDisplay = phase === 'final'
    ? { team: result.teamScore, opp: result.oppScore }
    : runningScore;

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 space-y-3">

        {/* Scoreboard */}
        <div className="border-2 border-black p-3 mt-4">
          <div className="flex justify-between items-center font-mono">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 uppercase">{isHome ? 'Home' : 'Away'}</div>
              <div className="font-bold text-sm truncate">{teamName}</div>
              <div className={`text-4xl font-bold ${phase === 'final' && result?.won ? '' : ''}`}>
                {scoreDisplay.team}
              </div>
            </div>
            <div className="text-center px-3">
              <div className="font-mono text-xs text-gray-400">
                {phase === 'intro' ? 'PRE-GAME' : phase === 'final' ? `FINAL${result?.isOT ? ' (OT)' : ''}` : `Q${Math.min(shownQ + 1, totalQs)}`}
              </div>
              <div className="flex gap-0.5 mt-1 justify-center">
                {Q_LABELS.slice(0, totalQs).map((q, i) => (
                  <div key={q} className={`w-6 h-5 border border-black flex items-center justify-center text-xs font-mono
                    ${i < shownQ ? 'bg-black text-white' : 'text-gray-300'}`}>
                    {q}
                  </div>
                ))}
              </div>
              <div className="font-mono text-xs text-gray-400 mt-1">Game {gameNumber}</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 uppercase">{isHome ? 'Away' : 'Home'}</div>
              <div className="font-bold text-sm truncate">{oppName}</div>
              <div className="text-4xl font-bold">{scoreDisplay.opp}</div>
            </div>
          </div>
        </div>

        {/* INTRO */}
        {phase === 'intro' && (
          <div className="space-y-3">
            <div className="panel">
              <div className="panel-header">MATCHUP</div>
              <div className="panel-body font-mono text-sm space-y-1">
                {[['Opponent', `${oppName} (Str: ${opponent.strength})`],
                  ['Your Role', role], ['Focus', focus],
                  ['Location', isHome ? 'Home' : 'Away']].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-gray-500">{l}</span>
                    <span className="capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary w-full py-4 tracking-widest text-lg" onClick={handleStart}>
              ▶ TIP OFF
            </button>
          </div>
        )}

        {/* LIVE GAME */}
        {phase !== 'intro' && phase !== 'final' && !decision && (
          <div className="space-y-3">
            {/* Box score tabs */}
            <div className="flex border border-black">
              {[['you', player.name], ['opp', oppName]].map(([t, label]) => (
                <button key={t} onClick={() => setBoxTab(t)}
                  className={`flex-1 py-1.5 text-xs font-bold border-r last:border-r-0 border-black
                    ${boxTab === t ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
                  {label.split(' ').slice(-1)[0].toUpperCase()}
                </button>
              ))}
            </div>

            {/* Player stats */}
            {boxTab === 'you' && (
              <div className="panel">
                <div className="panel-header flex items-center gap-2">
                  {player.name}
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                </div>
                <div className="panel-body">
                  <div className="grid grid-cols-5 gap-2 font-mono text-center">
                    {[['PTS', playerTotals.pts], ['REB', playerTotals.reb], ['AST', playerTotals.ast],
                      ['STL', playerTotals.stl], ['BLK', playerTotals.blk]].map(([l, v]) => (
                      <div key={l}><div className="text-2xl font-bold">{v}</div>
                        <div className="text-xs text-gray-500">{l}</div></div>
                    ))}
                  </div>
                  {playerTotals.fga > 0 && (
                    <div className="font-mono text-xs text-gray-400 text-center mt-2">
                      {playerTotals.fgm}/{playerTotals.fga} FG
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Opponent box score */}
            {boxTab === 'opp' && (
              <div className="panel">
                <div className="panel-header">{oppName} — LIVE BOX SCORE</div>
                <div className="overflow-x-auto panel-body p-0">
                  <table className="stat-table text-xs">
                    <thead><tr><th className="text-left">Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th></tr></thead>
                    <tbody>
                      {Object.values(oppBoxScore).sort((a, b) => b.pts - a.pts).map((p, i) => (
                        <tr key={i}>
                          <td className="text-left">{p.name}</td>
                          <td>{p.pos}</td>
                          <td>{p.pts}</td><td>{p.reb}</td><td>{p.ast}</td><td>{p.stl}</td>
                        </tr>
                      ))}
                      {Object.keys(oppBoxScore).length === 0 && (
                        <tr><td colSpan={6} className="text-center text-gray-400">Game in progress...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Play-by-play */}
            <div className="panel">
              <div className="panel-header">PLAY BY PLAY</div>
              <div className="panel-body space-y-0.5 max-h-52 overflow-y-auto font-mono text-xs">
                {playLog.map((play, i) => (
                  <div key={i}
                    className={`py-0.5 border-b border-gray-100 last:border-0 flex gap-2
                      ${play.team !== 'OPP' ? 'font-medium' : 'text-gray-500'}`}>
                    <span className="shrink-0 text-gray-400 w-16">{play.time}</span>
                    <span className="flex-1">{play.text}</span>
                  </div>
                ))}
                {playLog.length === 0 && (
                  <div className="text-gray-400 animate-pulse">Tip-off...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DECISION */}
        {decision && (
          <div className="border-2 border-black p-5 bg-white">
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">
              {phase === 'half_decision' ? 'HALF-TIME' : 'Q4 DECISION'}
            </div>
            <div className="font-bold text-lg mb-2">{decision.title}</div>
            <p className="text-sm text-gray-600 mb-4">{decision.body}</p>
            <div className="space-y-2">
              {decision.choices.map((c, i) => (
                <button key={i} className="btn w-full text-left py-3 px-4 flex gap-3"
                  onClick={() => handleDecision(c)}>
                  <span className="font-mono text-xs shrink-0 mt-0.5">{String.fromCharCode(65 + i)}.</span>
                  <span className="font-semibold text-sm">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FINAL BOX SCORE */}
        {phase === 'final' && result && (
          <div className="space-y-3">
            <div className={`border-2 border-black p-4 text-center`}>
              <div className="font-mono text-2xl font-bold">
                {result.won ? '✓ WIN' : '✗ LOSS'}{result.isOT ? ' (OT)' : ''}
              </div>
              <div className="font-mono text-sm mt-1 text-gray-600">
                {result.teamScore} – {result.oppScore} vs {oppName}
              </div>
            </div>

            {/* Tab switcher for final box score */}
            <div className="flex border border-black">
              {[['you', player.name], ['opp', oppName]].map(([t, label]) => (
                <button key={t} onClick={() => setBoxTab(t)}
                  className={`flex-1 py-1.5 text-xs font-bold border-r last:border-r-0 border-black
                    ${boxTab === t ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
                  {label.split(' ').slice(-1)[0].toUpperCase()}
                </button>
              ))}
            </div>

            {boxTab === 'you' && (
              <div className="panel">
                <div className="panel-header">{player.name} — FINAL</div>
                <div className="panel-body">
                  <div className="grid grid-cols-5 gap-2 font-mono text-center mb-3">
                    {[['PTS',result.pts],['REB',result.reb],['AST',result.ast],['STL',result.stl],['BLK',result.blk]].map(([l,v]) => (
                      <div key={l}><div className="text-3xl font-bold">{v}</div>
                        <div className="text-xs text-gray-500">{l}</div></div>
                    ))}
                  </div>
                  <div className="font-mono text-xs text-gray-500 text-center">
                    {result.fgm}/{result.fga} FG · {result.fg3m}/{result.fg3a} 3P · {result.ftm}/{result.fta} FT
                  </div>
                  <div className="mt-3 border-t border-gray-100 pt-2">
                    <div className="font-mono text-xs text-gray-400 mb-1">By quarter</div>
                    <table className="stat-table text-xs">
                      <thead><tr><th className="text-left">Qtr</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th></tr></thead>
                      <tbody>
                        {quarters.map((q, i) => (
                          <tr key={i}>
                            <td className="text-left">{Q_LABELS[i]}</td>
                            <td>{q.pts}</td><td>{q.reb}</td><td>{q.ast}</td><td>{q.stl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {boxTab === 'opp' && (
              <div className="panel">
                <div className="panel-header">{oppName} — FINAL BOX SCORE</div>
                <div className="overflow-x-auto panel-body p-0">
                  <table className="stat-table text-xs">
                    <thead><tr><th className="text-left">Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th></tr></thead>
                    <tbody>
                      {Object.values(oppBoxScore).sort((a, b) => b.pts - a.pts).map((p, i) => (
                        <tr key={i}>
                          <td className="text-left">{p.name}</td>
                          <td>{p.pos}</td>
                          <td>{p.pts}</td><td>{p.reb}</td><td>{p.ast}</td>
                          <td>{p.stl}</td><td>{p.blk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button className="btn btn-primary w-full py-3 tracking-widest"
              onClick={() => goTo('SEASON_DASHBOARD')}>
              ← BACK TO SEASON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
