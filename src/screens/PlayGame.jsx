import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import {
  simulateLiveGame, aggregateQuarters, applyDecisionToQuarters,
  pickHalftimeDecision, pickQ4Decision, generateDetailedPlayLog,
  simOpponentRoster, simOpponentQuarter,
} from '../engine/gameEngine.js';
import { determineRole } from '../engine/seasonEngine.js';
import { computeOverall } from '../engine/playerEngine.js';
import { TEAM_MAP, generateRoster } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';

// ─── helpers ──────────────────────────────────────────────────────────────────

function zeroStats() {
  return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0 };
}

function addQtoStats(acc, q) {
  return {
    pts: acc.pts + (q.pts ?? 0), reb: acc.reb + (q.reb ?? 0),
    ast: acc.ast + (q.ast ?? 0), stl: acc.stl + (q.stl ?? 0),
    blk: acc.blk + (q.blk ?? 0), fgm: acc.fgm + (q.fgm ?? 0),
    fga: acc.fga + (q.fga ?? 0),
  };
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PlayGame() {
  const player       = useGameStore(s => s.player);
  const goTo         = useGameStore(s => s.goTo);
  const addGameToLog = useGameStore(s => s.addGameToLog);
  const addNews      = useGameStore(s => s.addNews);
  const scheduleEntry= useGameStore(s => s.currentGameEntry);

  const opponent  = scheduleEntry?.opponent ?? TEAM_MAP['WAS'] ?? Object.values(TEAM_MAP)[0];
  const isHome    = scheduleEntry?.isHome ?? true;
  const gameNumber= scheduleEntry?.gameNumber ?? 1;
  const season    = 2025 + (player.nbaSeasonsPlayed ?? 0);

  const team    = player.team ? TEAM_MAP[player.team] : null;
  const overall = computeOverall(player.attributes, player.position);
  const role    = determineRole(overall, team?.strength ?? 70, player.nbaSeasonsPlayed ?? 0, player.coachTrust ?? 50);
  const focus   = player.playerFocus ?? 'balanced';

  // All mutable game data lives in a ref so animations always see the latest values
  // without stale closure issues.
  const gRef = useRef(null); // { quarters, plays, allPlays, teamFinalScore, oppFinalScore, oppRoster, teamNPCRoster, isOT }

  // ── display state ──────────────────────────────────────────────────────────
  const [ready,      setReady]      = useState(false);
  const [phase,      setPhase]      = useState('intro');  // intro|playing|decision|final
  const [playLog,    setPlayLog]    = useState([]);
  const [decision,   setDecision]   = useState(null);
  const [boxTab,     setBoxTab]     = useState('you');    // you|team|opp
  const [result,     setResult]     = useState(null);

  // Running totals shown during play — updated per play, not per quarter
  const [liveTeam, setLiveTeam]   = useState(0);
  const [liveOpp,  setLiveOpp]    = useState(0);
  const [curQ,     setCurQ]       = useState(0);
  const [playerSt, setPlayerSt]   = useState(zeroStats());
  const [oppBox,   setOppBox]     = useState({});   // id → cumulative stats
  const [teamBox,  setTeamBox]    = useState({});   // id → cumulative stats

  const ivRef  = useRef(null); // interval handle
  const idxRef = useRef(0);    // play index within current quarter
  const qIdxRef= useRef(0);    // current quarter index

  // ── prepare game ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!team || !opponent) return;
    try {
      const data = simulateLiveGame(player, team, opponent, role, focus, season);

      // Pre-generate all play logs per quarter (stored in ref so decisions can modify quarters later)
      const perQPlays = data.quarters.map((q, qi) =>
        generateDetailedPlayLog(player.name, team.id, data.oppRoster ?? [], q, qi + 1)
      );

      // Distribute team/opp score across plays in each quarter
      // Each quarter contributes ~teamScore/numQs points; we spread them across the scoring plays
      const numQs = data.quarters.length;
      const qTeamTarget = (q) => Math.round(data.teamScore / numQs + (Math.random() - 0.5) * 8);
      const qOppTarget  = (q) => Math.round(data.oppScore  / numQs + (Math.random() - 0.5) * 8);

      const annotated = perQPlays.map((plays, qi) => {
        const tgt = qTeamTarget(qi);
        const otgt = qOppTarget(qi);
        let tGiven = 0, oGiven = 0;
        return plays.map((p, pi) => {
          let td = 0, od = 0;
          if (p.pts > 0 && tGiven < tgt) {
            td = Math.min(p.pts, tgt - tGiven);
            tGiven += td;
          } else if (p.pts < 0 && oGiven < otgt) {
            od = Math.min(Math.abs(p.pts), otgt - oGiven);
            oGiven += od;
          }
          // On the last play, dump any remainder
          if (pi === plays.length - 1) { td += tgt - tGiven; od += otgt - oGiven; tGiven = tgt; oGiven = otgt; }
          return { ...p, td, od };
        });
      });

      // Generate team NPC roster for "Team" box score tab
      const teamNPCRoster = simOpponentRoster(team, season);

      gRef.current = {
        quarters:     data.quarters,
        annotated,
        teamFinalScore: data.teamScore,
        oppFinalScore:  data.oppScore,
        isOT:           data.isOT,
        oppRoster:      data.oppRoster ?? [],
        teamNPCRoster,
      };
      setReady(true);
    } catch (e) {
      console.error('Game init error:', e);
    }
    return () => clearInterval(ivRef.current);
  }, []);

  // ── quarter animation ──────────────────────────────────────────────────────
  function runQuarter(qi) {
    clearInterval(ivRef.current);
    qIdxRef.current = qi;
    idxRef.current = 0;
    setCurQ(qi);

    const plays  = gRef.current.annotated[qi];
    const oppQs  = simOpponentQuarter(gRef.current.oppRoster);
    const teamQs = simOpponentQuarter(gRef.current.teamNPCRoster);

    if (!plays || plays.length === 0) {
      onQuarterEnd(qi);
      return;
    }

    ivRef.current = setInterval(() => {
      const idx = idxRef.current;
      if (idx >= plays.length) {
        clearInterval(ivRef.current);
        onQuarterEnd(qi);
        return;
      }
      const play = plays[idx];
      idxRef.current++;

      // Update running score
      if (play.td > 0) setLiveTeam(prev => prev + play.td);
      if (play.od > 0) setLiveOpp (prev => prev + play.od);

      // Update play log
      setPlayLog(prev => [play, ...prev.slice(0, 13)]);

      // Update player stats (player plays are those where team === team.id, not OPP)
      if (play.team !== 'OPP') {
        if (play.pts > 0) setPlayerSt(prev => ({ ...prev, pts: prev.pts + play.pts }));
        if (play.text?.toLowerCase().includes('rebound')) setPlayerSt(prev => ({ ...prev, reb: prev.reb + 1 }));
        if (play.text?.toLowerCase().includes('ast')) setPlayerSt(prev => ({ ...prev, ast: prev.ast + 1 }));
        if (play.text?.toLowerCase().includes('steal')) setPlayerSt(prev => ({ ...prev, stl: prev.stl + 1 }));
        if (play.text?.toLowerCase().includes('block') || play.text?.toLowerCase().includes('swat')) setPlayerSt(prev => ({ ...prev, blk: prev.blk + 1 }));
      }

      // Update opponent box score
      setOppBox(prev => {
        const next = { ...prev };
        oppQs.forEach(p => {
          if (!next[p.id]) next[p.id] = { name: p.name, pos: p.pos, pts: 0, reb: 0, ast: 0 };
          next[p.id].pts += p.qPts ?? 0;
          next[p.id].reb += p.qReb ?? 0;
          next[p.id].ast += p.qAst ?? 0;
        });
        return next;
      });

      // Update team NPC box score (once per quarter, first play)
      if (idx === 0) {
        setTeamBox(prev => {
          const next = { ...prev };
          teamQs.forEach(p => {
            if (!next[p.id]) next[p.id] = { name: p.name, pos: p.pos, pts: 0, reb: 0, ast: 0 };
            next[p.id].pts += p.qPts ?? 0;
            next[p.id].reb += p.qReb ?? 0;
            next[p.id].ast += p.qAst ?? 0;
          });
          return next;
        });
      }
    }, 450);
  }

  function onQuarterEnd(qi) {
    const g = gRef.current;
    if (qi === 1) {
      // Halftime
      const halfPts = g.quarters.slice(0, 2).reduce((s, q) => s + q.pts, 0);
      const approxDiff = Math.round((g.teamFinalScore - g.oppFinalScore) * 0.5);
      const dec = pickHalftimeDecision(halfPts, approxDiff);
      setTimeout(() => { setDecision({ ...dec, body: dec.body?.() ?? dec.body }); setPhase('decision'); }, 700);
    } else if (qi === 2) {
      const pts3q = g.quarters.slice(0, 3).reduce((s, q) => s + q.pts, 0);
      const approxDiff = Math.round((g.teamFinalScore - g.oppFinalScore) * 0.75);
      const dec = pickQ4Decision(approxDiff, pts3q);
      if (dec) {
        setTimeout(() => { setDecision({ ...dec, body: dec.body?.() ?? dec.body }); setPhase('decision'); }, 500);
      } else {
        setTimeout(() => runQuarter(3), 500);
      }
    } else if (qi >= 3) {
      // Final
      setTimeout(() => finishGame(), 800);
    } else {
      setTimeout(() => runQuarter(qi + 1), 400);
    }
  }

  function handleStart() {
    if (!gRef.current) return;
    setPhase('playing');
    setLiveTeam(0); setLiveOpp(0);
    setPlayerSt(zeroStats());
    setPlayLog([]);
    setOppBox({}); setTeamBox({});
    setTimeout(() => runQuarter(0), 300);
  }

  function handleDecision(choice) {
    // Apply decision modifiers to the quarters stored in ref so next quarter animation uses updated stats
    const updated = applyDecisionToQuarters(gRef.current.quarters, choice, 0);
    gRef.current.quarters = updated;

    // Regenerate annotated plays for Q3/Q4 with the updated quarter stats
    const prevAnnotated = gRef.current.annotated;
    const numQs = updated.length;
    const reAnnotate = (qi) => {
      const q = updated[qi];
      const tgt = Math.round(gRef.current.teamFinalScore / numQs);
      const otgt = Math.round(gRef.current.oppFinalScore  / numQs);
      const plays = generateDetailedPlayLog(player.name, team?.id ?? 'TM',
        gRef.current.oppRoster, q, qi + 1);
      let tg = 0, og = 0;
      return plays.map((p, pi) => {
        let td = 0, od = 0;
        if (p.pts > 0 && tg < tgt) { td = Math.min(p.pts, tgt - tg); tg += td; }
        else if (p.pts < 0 && og < otgt) { od = Math.min(Math.abs(p.pts), otgt - og); og += od; }
        if (pi === plays.length - 1) { td += tgt - tg; od += otgt - og; }
        return { ...p, td, od };
      });
    };
    gRef.current.annotated[2] = reAnnotate(2);
    gRef.current.annotated[3] = reAnnotate(3);

    setDecision(null);
    setPhase('playing');

    const isHalf = qIdxRef.current <= 1;
    setTimeout(() => runQuarter(isHalf ? 2 : 3), 300);
  }

  function finishGame() {
    clearInterval(ivRef.current);
    const g = gRef.current;
    const total = aggregateQuarters(g.quarters);
    const won = g.teamFinalScore > g.oppFinalScore;
    const line = {
      pts: total.pts, reb: total.reb, ast: total.ast,
      stl: total.stl, blk: total.blk, tov: total.tov ?? 0,
      fgm: total.fgm, fga: total.fga,
      fg3m: total.fg3m, fg3a: total.fg3a,
      ftm: total.ftm, fta: total.fta,
      teamScore: g.teamFinalScore, oppScore: g.oppFinalScore,
      opponentId: opponent.id, won, isOT: g.isOT,
    };
    addGameToLog(line);
    addNews({
      type: 'game',
      headline: `${won ? '✓ W' : '✗ L'} ${g.teamFinalScore}–${g.oppFinalScore}${g.isOT ? ' OT' : ''} vs ${opponent.city} ${opponent.name} — ${total.pts} PTS · ${total.reb} REB · ${total.ast} AST`,
      date: `Game ${gameNumber}`,
    });
    setResult({ ...line, won, quarters: g.quarters });
    setPhase('final');
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  const oppName  = `${opponent.city} ${opponent.name}`;
  const teamName = team ? `${team.city} ${team.name}` : 'Your Team';
  const numQs    = gRef.current?.quarters?.length ?? 4;
  const Q_LABELS = ['Q1', 'Q2', 'Q3', 'Q4', 'OT'];

  const scoreDisplay = phase === 'final'
    ? { team: result?.teamScore ?? 0, opp: result?.oppScore ?? 0 }
    : { team: liveTeam, opp: liveOpp };

  const phaseLabel = phase === 'intro' ? 'PRE-GAME'
    : phase === 'final' ? `FINAL${result?.isOT ? ' (OT)' : ''}`
    : phase === 'decision' ? 'BREAK'
    : `Q${curQ + 1}`;

  // ── render ─────────────────────────────────────────────────────────────────
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-mono text-sm animate-pulse">Generating game...</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 space-y-3">

        {/* ── Scoreboard ── */}
        <div className="border-2 border-black p-3 mt-4">
          <div className="flex justify-between items-center font-mono">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 uppercase">{isHome ? 'Home' : 'Away'}</div>
              <div className="font-bold text-sm truncate">{teamName}</div>
              <div className="text-4xl font-bold tabular-nums">{scoreDisplay.team}</div>
            </div>
            <div className="text-center px-3">
              <div className="font-mono text-xs text-gray-500 mb-1">{phaseLabel}</div>
              <div className="flex gap-0.5 justify-center">
                {Q_LABELS.slice(0, numQs).map((q, i) => (
                  <div key={q} className={`w-6 h-5 border border-black flex items-center justify-center text-xs font-mono
                    ${i < curQ + (phase === 'final' ? 1 : 0) ? 'bg-black text-white' : 'text-gray-300'}`}>{q}</div>
                ))}
              </div>
              <div className="font-mono text-xs text-gray-400 mt-1">Game {gameNumber}</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 uppercase">{isHome ? 'Away' : 'Home'}</div>
              <div className="font-bold text-sm truncate">{oppName}</div>
              <div className="text-4xl font-bold tabular-nums">{scoreDisplay.opp}</div>
            </div>
          </div>
        </div>

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <div className="space-y-3">
            <div className="panel">
              <div className="panel-header">MATCHUP</div>
              <div className="panel-body font-mono text-sm space-y-1">
                {[['Opponent', `${oppName} (Str: ${opponent.strength})`],
                  ['Your Role', role], ['Focus', focus],
                  ['Location', isHome ? 'Home' : 'Away']].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-gray-500">{l}</span><span className="capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary w-full py-4 tracking-widest text-lg" onClick={handleStart}>
              ▶ TIP OFF
            </button>
          </div>
        )}

        {/* ── LIVE GAME ── */}
        {(phase === 'playing' || phase === 'decision') && !decision && (
          <div className="space-y-3">
            {/* Box score tabs */}
            <div className="flex border border-black">
              {[['you', player.name.split(' ').slice(-1)[0]], ['team', teamName.split(' ').slice(-1)[0]], ['opp', oppName.split(' ').slice(-1)[0]]].map(([t, label]) => (
                <button key={t} onClick={() => setBoxTab(t)}
                  className={`flex-1 py-1.5 text-xs font-bold border-r last:border-r-0 border-black truncate px-1
                    ${boxTab === t ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
                  {label.toUpperCase()}
                </button>
              ))}
            </div>

            {boxTab === 'you' && (
              <div className="panel">
                <div className="panel-header flex items-center gap-2">
                  {player.name}
                  {phase === 'playing' && <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />}
                </div>
                <div className="panel-body">
                  <div className="grid grid-cols-5 gap-2 font-mono text-center">
                    {[['PTS', playerSt.pts],['REB', playerSt.reb],['AST', playerSt.ast],['STL', playerSt.stl],['BLK', playerSt.blk]].map(([l,v]) => (
                      <div key={l}><div className="text-2xl font-bold">{v}</div><div className="text-xs text-gray-500">{l}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {boxTab === 'team' && (
              <div className="panel">
                <div className="panel-header">{teamName} — LIVE</div>
                <div className="overflow-x-auto panel-body p-0">
                  <table className="stat-table text-xs">
                    <thead><tr><th className="text-left">Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead>
                    <tbody>
                      {/* Player themselves first */}
                      <tr style={{ background: '#000', color: '#fff' }}>
                        <td className="text-left">★ {player.name}</td>
                        <td>{player.position}</td>
                        <td>{playerSt.pts}</td><td>{playerSt.reb}</td><td>{playerSt.ast}</td>
                      </tr>
                      {Object.values(teamBox).sort((a, b) => b.pts - a.pts).map((p, i) => (
                        <tr key={i}>
                          <td className="text-left">{p.name}</td><td>{p.pos}</td>
                          <td>{p.pts}</td><td>{p.reb}</td><td>{p.ast}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {boxTab === 'opp' && (
              <div className="panel">
                <div className="panel-header">{oppName} — LIVE</div>
                <div className="overflow-x-auto panel-body p-0">
                  <table className="stat-table text-xs">
                    <thead><tr><th className="text-left">Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead>
                    <tbody>
                      {Object.values(oppBox).sort((a, b) => b.pts - a.pts).map((p, i) => (
                        <tr key={i}>
                          <td className="text-left">{p.name}</td><td>{p.pos}</td>
                          <td>{p.pts}</td><td>{p.reb}</td><td>{p.ast}</td>
                        </tr>
                      ))}
                      {Object.keys(oppBox).length === 0 && (
                        <tr><td colSpan={5} className="text-center text-gray-400">Q1 in progress...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Play-by-play */}
            <div className="panel">
              <div className="panel-header flex items-center gap-2">
                PLAY BY PLAY
                {phase === 'playing' && <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />}
              </div>
              <div className="panel-body space-y-0.5 max-h-52 overflow-y-auto">
                {playLog.map((p, i) => (
                  <div key={i}
                    className={`font-mono text-xs py-0.5 border-b border-gray-100 last:border-0 flex gap-2
                      ${p.team !== 'OPP' ? 'font-medium' : 'text-gray-500'}`}>
                    <span className="text-gray-400 shrink-0 w-14">{p.time}</span>
                    <span className="flex-1">{p.text}</span>
                    {(p.td > 0) && <span className="shrink-0 font-bold">+{p.td}</span>}
                    {(p.od > 0) && <span className="shrink-0 text-gray-400">+{p.od}</span>}
                  </div>
                ))}
                {playLog.length === 0 && <div className="font-mono text-xs text-gray-400 animate-pulse">Tip-off...</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── DECISION ── */}
        {decision && (
          <div className="border-2 border-black p-5 bg-white">
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">
              {qIdxRef.current <= 1 ? 'HALF-TIME' : 'Q4 DECISION'}
            </div>
            <div className="font-bold text-xl mb-2">{decision.title}</div>
            <p className="text-sm text-gray-600 mb-4">{typeof decision.body === 'function' ? decision.body() : decision.body}</p>
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

        {/* ── FINAL ── */}
        {phase === 'final' && result && (
          <div className="space-y-3">
            <div className="border-2 border-black p-4 text-center">
              <div className="font-mono text-2xl font-bold">
                {result.won ? '✓ WIN' : '✗ LOSS'}{result.isOT ? ' (OT)' : ''}
              </div>
              <div className="font-mono text-sm mt-1 text-gray-600">
                {result.teamScore} – {result.oppScore} vs {oppName}
              </div>
            </div>

            <div className="flex border border-black">
              {[['you', player.name.split(' ').slice(-1)[0]], ['team', teamName.split(' ').slice(-1)[0]], ['opp', oppName.split(' ').slice(-1)[0]]].map(([t, label]) => (
                <button key={t} onClick={() => setBoxTab(t)}
                  className={`flex-1 py-1.5 text-xs font-bold border-r last:border-r-0 border-black truncate px-1
                    ${boxTab === t ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
                  {label.toUpperCase()}
                </button>
              ))}
            </div>

            {boxTab === 'you' && (
              <div className="panel">
                <div className="panel-header">{player.name} — FINAL</div>
                <div className="panel-body">
                  <div className="grid grid-cols-5 gap-2 font-mono text-center mb-3">
                    {[['PTS',result.pts],['REB',result.reb],['AST',result.ast],['STL',result.stl],['BLK',result.blk]].map(([l,v]) => (
                      <div key={l}><div className="text-3xl font-bold">{v}</div><div className="text-xs text-gray-500">{l}</div></div>
                    ))}
                  </div>
                  <div className="font-mono text-xs text-gray-500 text-center">
                    {result.fgm}/{result.fga} FG · {result.fg3m}/{result.fg3a} 3P · {result.ftm}/{result.fta} FT
                  </div>
                  {result.quarters?.length > 0 && (
                    <div className="mt-3 border-t border-gray-100 pt-2">
                      <div className="font-mono text-xs text-gray-400 mb-1">By quarter</div>
                      <table className="stat-table text-xs">
                        <thead><tr><th className="text-left">Qtr</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th></tr></thead>
                        <tbody>
                          {result.quarters.map((q, i) => (
                            <tr key={i}><td className="text-left">{Q_LABELS[i]}</td>
                              <td>{q.pts}</td><td>{q.reb}</td><td>{q.ast}</td><td>{q.stl}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {boxTab === 'team' && (
              <div className="panel">
                <div className="panel-header">{teamName} — FINAL</div>
                <div className="overflow-x-auto panel-body p-0">
                  <table className="stat-table text-xs">
                    <thead><tr><th className="text-left">Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead>
                    <tbody>
                      <tr style={{ background: '#000', color: '#fff' }}>
                        <td className="text-left">★ {player.name}</td><td>{player.position}</td>
                        <td>{result.pts}</td><td>{result.reb}</td><td>{result.ast}</td>
                      </tr>
                      {Object.values(teamBox).sort((a, b) => b.pts - a.pts).map((p, i) => (
                        <tr key={i}><td className="text-left">{p.name}</td><td>{p.pos}</td>
                          <td>{p.pts}</td><td>{p.reb}</td><td>{p.ast}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {boxTab === 'opp' && (
              <div className="panel">
                <div className="panel-header">{oppName} — FINAL</div>
                <div className="overflow-x-auto panel-body p-0">
                  <table className="stat-table text-xs">
                    <thead><tr><th className="text-left">Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead>
                    <tbody>
                      {Object.values(oppBox).sort((a, b) => b.pts - a.pts).map((p, i) => (
                        <tr key={i}><td className="text-left">{p.name}</td><td>{p.pos}</td>
                          <td>{p.pts}</td><td>{p.reb}</td><td>{p.ast}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button className="btn btn-primary w-full py-3 tracking-widest"
              onClick={() => goTo('SEASON_DASHBOARD')}>← BACK TO SEASON</button>
          </div>
        )}
      </div>
    </div>
  );
}
