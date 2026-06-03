import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import {
  simulateLiveGame, generatePlayLog, aggregateQuarters, applyDecisionToQuarters,
  pickHalftimeDecision, pickQ4Decision,
} from '../engine/gameEngine.js';
import { determineRole } from '../engine/seasonEngine.js';
import { computeOverall } from '../engine/playerEngine.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';

const Q_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function PlayGame() {
  const player         = useGameStore(s => s.player);
  const league         = useGameStore(s => s.league);
  const goTo           = useGameStore(s => s.goTo);
  const addGameToLog   = useGameStore(s => s.addGameToLog);
  const addNews        = useGameStore(s => s.addNews);

  // The game is passed via store or generated here
  const scheduleEntry  = useGameStore(s => s.currentGameEntry);
  const opponent       = scheduleEntry?.opponent ?? TEAM_MAP['WAS'] ?? Object.values(TEAM_MAP)[0];
  const isHome         = scheduleEntry?.isHome ?? true;
  const gameNumber     = scheduleEntry?.gameNumber ?? 1;

  const team     = player.team ? TEAM_MAP[player.team] : null;
  const overall  = computeOverall(player.attributes, player.position);
  const role     = determineRole(overall, team?.strength ?? 70, player.nbaSeasonsPlayed, player.coachTrust);
  const focus    = player.playerFocus ?? 'balanced';

  // Game state
  const [phase, setPhase]           = useState('intro'); // intro|q1|q2|half_decision|q3|q4_decision|q4|final
  const [gameData, setGameData]     = useState(null);
  const [quarters, setQuarters]     = useState([]);
  const [shownQ, setShownQ]         = useState(0);        // how many quarters revealed
  const [playLog, setPlayLog]       = useState([]);
  const [decision, setDecision]     = useState(null);
  const [half1Pts, setHalf1Pts]     = useState(0);
  const [result, setResult]         = useState(null);     // final

  const timerRef = useRef(null);

  useEffect(() => {
    if (!team) return;
    const data = simulateLiveGame(player, team, opponent, role, focus);
    setGameData(data);
  }, []);

  // Animate each quarter
  useEffect(() => {
    if (!gameData || phase === 'intro') return;
    if (phase === 'q1') animateQ(0);
    if (phase === 'q3') animateQ(2);
    if (phase === 'q4') animateQ(3);
  }, [phase, gameData]);

  function animateQ(idx) {
    const qStats = quarters[idx] ?? gameData.quarters[idx];
    const logs = generatePlayLog(player.name, qStats);
    let logIdx = 0;

    // Feed log entries one by one
    timerRef.current = setInterval(() => {
      if (logIdx < logs.length) {
        setPlayLog(prev => [...prev.slice(-6), logs[logIdx]]);
        logIdx++;
      } else {
        clearInterval(timerRef.current);
        setShownQ(idx + 1);
        // After Q1: go to Q2 immediately
        if (idx === 0) {
          setTimeout(() => animateQ(1), 600);
        }
        // After Q2: halftime decision
        if (idx === 1) {
          const h1 = (quarters[0] ?? gameData.quarters[0]).pts;
          const h2 = (quarters[1] ?? gameData.quarters[1]).pts;
          setHalf1Pts(h1 + h2);
          const dec = pickHalftimeDecision(h1 + h2);
          setTimeout(() => { setDecision(dec); setPhase('half_decision'); }, 800);
        }
        // After Q3: check for Q4 decision
        if (idx === 2) {
          const score = computeRunningScore(3);
          const dec = pickQ4Decision(score.teamScore - score.oppScore);
          if (dec) {
            setTimeout(() => { setDecision(dec); setPhase('q4_decision'); }, 600);
          } else {
            setTimeout(() => setPhase('q4'), 600);
          }
        }
        // After Q4: final
        if (idx === 3) {
          setTimeout(() => finishGame(), 800);
        }
      }
    }, 600);
  }

  function computeRunningScore(qCount) {
    // Rough team score split by quarter
    const base = gameData.teamScore;
    const opp  = gameData.oppScore;
    const frac = qCount / 4;
    return { teamScore: Math.round(base * frac), oppScore: Math.round(opp * frac) };
  }

  function handleStart() {
    setQuarters([...gameData.quarters]);
    setPhase('q1');
    setPlayLog([]);
    setShownQ(0);
  }

  function handleDecision(choice) {
    // Apply bonus modifiers to remaining quarters
    const updated = applyDecisionToQuarters(quarters, choice, half1Pts);
    setQuarters(updated);

    // Apply any player effects
    // (These are resolved via a store event after the game)

    setDecision(null);
    if (phase === 'half_decision') setPhase('q3');
    if (phase === 'q4_decision')   setPhase('q4');
  }

  function finishGame() {
    const total = aggregateQuarters(quarters);
    const won   = gameData.teamScore > gameData.oppScore;

    const gameLine = {
      pts: total.pts, reb: total.reb, ast: total.ast,
      stl: total.stl, blk: total.blk, tov: total.tov ?? 0,
      fgm: total.fgm, fga: total.fga,
      fg3m: total.fg3m, fg3a: total.fg3a,
      ftm: total.ftm, fta: total.fta,
      teamScore: gameData.teamScore,
      oppScore:  gameData.oppScore,
      opponentId: opponent.id,
      won,
    };

    addGameToLog(gameLine);
    addNews({
      type: 'game',
      headline: `${won ? '✓ WIN' : '✗ LOSS'} ${gameData.teamScore}–${gameData.oppScore} vs ${opponent.city} ${opponent.name} — ${total.pts} PTS · ${total.reb} REB · ${total.ast} AST`,
      date: `Game ${gameNumber}`,
    });

    setResult({ ...gameLine, won });
    setPhase('final');
  }

  // Running totals display
  const runningTotals = quarters.slice(0, shownQ).reduce(
    (acc, q) => ({
      pts: acc.pts + q.pts, reb: acc.reb + q.reb, ast: acc.ast + q.ast,
      stl: acc.stl + (q.stl ?? 0), blk: acc.blk + (q.blk ?? 0),
      fgm: acc.fgm + q.fgm, fga: acc.fga + q.fga,
    }),
    { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0 }
  );

  const qScores = quarters.slice(0, shownQ).map((_, i) => {
    const frac = (i + 1) / 4;
    return {
      team: Math.round(gameData?.teamScore * 0.25 + Math.round(Math.random() * 4 - 2)),
      opp:  Math.round(gameData?.oppScore * 0.25 + Math.round(Math.random() * 4 - 2)),
    };
  });

  if (!gameData) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-mono text-sm">Loading game...</div>
    </div>
  );

  const teamObj  = team;
  const oppName  = `${opponent.city} ${opponent.name}`;
  const teamName = teamObj ? `${teamObj.city} ${teamObj.name}` : 'Your Team';

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Scoreboard header */}
        <div className="border-2 border-black p-3">
          <div className="flex justify-between items-center font-mono">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500">{isHome ? 'HOME' : 'AWAY'}</div>
              <div className="font-bold text-sm truncate">{teamName}</div>
              <div className="text-3xl font-bold">
                {phase === 'final' ? result?.teamScore : qScores.reduce((s, q) => s + q.team, 0)}
              </div>
            </div>
            <div className="text-center px-4">
              <div className="font-mono text-xs text-gray-400">
                {phase === 'intro' ? 'PRE-GAME' :
                 phase === 'final' ? 'FINAL' :
                 shownQ < 4 ? `Q${shownQ + 1}` : 'FINAL'}
              </div>
              <div className="text-xs text-gray-400">GAME {gameNumber}</div>
              {/* Quarter score boxes */}
              <div className="flex gap-1 mt-1">
                {Q_LABELS.map((q, i) => (
                  <div key={q} className={`w-6 h-6 border border-black flex items-center justify-center text-xs font-mono
                    ${i < shownQ ? 'bg-black text-white' : 'text-gray-300'}`}>
                    {q}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500">{isHome ? 'AWAY' : 'HOME'}</div>
              <div className="font-bold text-sm truncate">{oppName}</div>
              <div className="text-3xl font-bold">
                {phase === 'final' ? result?.oppScore : qScores.reduce((s, q) => s + q.opp, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Intro / start button */}
        {phase === 'intro' && (
          <div className="space-y-3">
            <div className="panel">
              <div className="panel-header">MATCHUP</div>
              <div className="panel-body font-mono text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Opponent</span><span>{oppName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Their Strength</span><span>{opponent.strength}/100</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Your Role</span><span className="capitalize">{role}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Your Focus</span><span className="capitalize">{focus}</span></div>
              </div>
            </div>
            <button className="btn btn-primary w-full py-4 tracking-widest text-lg" onClick={handleStart}>
              ▶ TIP OFF
            </button>
          </div>
        )}

        {/* Live game display */}
        {phase !== 'intro' && phase !== 'final' && !decision && (
          <div className="space-y-3">
            {/* Player stats line */}
            <div className="panel">
              <div className="panel-header">{player.name} — LIVE</div>
              <div className="panel-body">
                <div className="grid grid-cols-5 gap-2 font-mono text-center">
                  {[['PTS', runningTotals.pts],['REB', runningTotals.reb],['AST', runningTotals.ast],
                    ['STL', runningTotals.stl.toFixed(0)],['BLK', runningTotals.blk.toFixed(0)]].map(([l,v]) => (
                    <div key={l}>
                      <div className="text-2xl font-bold">{v}</div>
                      <div className="text-xs text-gray-500">{l}</div>
                    </div>
                  ))}
                </div>
                {runningTotals.fga > 0 && (
                  <div className="font-mono text-xs text-gray-400 text-center mt-2">
                    {runningTotals.fgm}/{runningTotals.fga} FG
                  </div>
                )}
              </div>
            </div>

            {/* Play log */}
            <div className="panel">
              <div className="panel-header flex items-center gap-2">
                PLAY BY PLAY
                <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
              </div>
              <div className="panel-body space-y-1 min-h-[80px]">
                {playLog.map((line, i) => (
                  <div key={i} className="font-mono text-xs border-b border-gray-100 pb-0.5 last:border-0">
                    {line}
                  </div>
                ))}
                {playLog.length === 0 && (
                  <div className="font-mono text-xs text-gray-400 animate-pulse">Tip-off...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Decision modal */}
        {decision && (
          <div className="border-2 border-black p-5 bg-white">
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">
              {phase === 'half_decision' ? 'HALFTIME' : 'FOURTH QUARTER'}
            </div>
            <div className="font-bold text-lg mb-2">{decision.title}</div>
            <p className="text-sm text-gray-700 mb-4">{decision.body}</p>
            <div className="space-y-2">
              {decision.choices.map((c, i) => (
                <button key={i} className="btn w-full text-left py-3 px-4 flex gap-3"
                  onClick={() => handleDecision(c)}>
                  <span className="font-mono text-xs shrink-0 mt-0.5">{String.fromCharCode(65+i)}.</span>
                  <div>
                    <div className="font-semibold text-sm">{c.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Final box score */}
        {phase === 'final' && result && (
          <div className="space-y-3">
            <div className={`border-2 border-black p-4 text-center ${result.won ? '' : 'border-gray-400'}`}>
              <div className={`font-mono text-2xl font-bold ${result.won ? '' : 'text-gray-500'}`}>
                {result.won ? '✓ WIN' : '✗ LOSS'}
              </div>
              <div className="font-mono text-sm mt-1">
                {result.teamScore} – {result.oppScore} vs {oppName}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">YOUR BOX SCORE</div>
              <div className="panel-body">
                <div className="grid grid-cols-5 gap-2 font-mono text-center mb-3">
                  {[['PTS',result.pts],['REB',result.reb],['AST',result.ast],['STL',result.stl],['BLK',result.blk]].map(([l,v]) => (
                    <div key={l}>
                      <div className="text-3xl font-bold">{v}</div>
                      <div className="text-xs text-gray-500">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-xs text-gray-500 text-center">
                  {result.fgm}/{result.fga} FG · {result.fg3m}/{result.fg3a} 3P · {result.ftm}/{result.fta} FT
                </div>

                {/* Quarter breakdown */}
                <div className="mt-3 border-t border-gray-100 pt-2">
                  <div className="font-mono text-xs text-gray-400 mb-1">Quarter breakdown</div>
                  <div className="overflow-x-auto">
                    <table className="stat-table text-xs">
                      <thead><tr><th className="text-left">Qtr</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead>
                      <tbody>
                        {quarters.map((q, i) => (
                          <tr key={i}>
                            <td className="text-left">Q{i+1}</td>
                            <td>{q.pts}</td><td>{q.reb}</td><td>{q.ast}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

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
