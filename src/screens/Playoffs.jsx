import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import {
  buildPlayoffBracket, simSeries, simPlayoffGame,
  findPlayerSeries, isPlayerEliminated,
} from '../engine/playoffEngine.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

function SeriesBox({ series, playerTeamId }) {
  if (!series) return <div className="border border-gray-200 p-2 font-mono text-xs text-gray-400 rounded">TBD</div>;
  const isPlayerInSeries = series.teamA?.id === playerTeamId || series.teamB?.id === playerTeamId;
  const done = !!series.winner;
  return (
    <div className={`border p-2 font-mono text-xs ${isPlayerInSeries ? 'border-2 border-black' : 'border-gray-300'} ${done ? 'opacity-70' : ''}`}>
      <div className={series.winner?.id === series.teamA?.id ? 'font-bold' : 'text-gray-500'}>
        ({series.teamA?.seed}) {series.teamA?.city} — {series.winsA}
      </div>
      <div className={series.winner?.id === series.teamB?.id ? 'font-bold' : 'text-gray-500'}>
        ({series.teamB?.seed}) {series.teamB?.city} — {series.winsB}
      </div>
      {!done && isPlayerInSeries && <div className="text-gray-400 mt-0.5">▶ YOUR SERIES</div>}
      {done && <div className="text-gray-400 mt-0.5">✓ {series.winner?.city}</div>}
    </div>
  );
}

export default function Playoffs() {
  const player            = useGameStore(s => s.player);
  const league            = useGameStore(s => s.league);
  const seasonResults     = useGameStore(s => s.seasonResults);
  const playoffState      = useGameStore(s => s.playoffState);
  const setPlayoffState   = useGameStore(s => s.setPlayoffState);
  const clearPlayoffState = useGameStore(s => s.clearPlayoffState);
  const goTo              = useGameStore(s => s.goTo);
  const addNews           = useGameStore(s => s.addNews);

  const [bracket, setBracket] = useState(() => playoffState ?? null);
  const [message, setMessage] = useState('');
  const [finalsResult, setFinalsResult] = useState(null);

  const playerTeamId = player.team;

  useEffect(() => {
    if (!bracket && league?.standings) {
      const b = buildPlayoffBracket(league.standings);
      setBracket(b);
      setPlayoffState(b);
    }
  }, []);

  if (!bracket) return (
    <div className="min-h-screen flex items-center justify-center font-mono text-sm text-gray-500">
      Generating playoff bracket...
    </div>
  );

  const playerSeries  = findPlayerSeries(bracket, playerTeamId);
  const eliminated    = isPlayerEliminated(bracket, playerTeamId);
  const champion      = bracket.champion;
  const roundLabel    = ['','First Round','Second Round','Conference Finals','NBA Finals','Champion'][bracket.currentRound] ?? '';

  // Find Finals MVP when complete
  const finalsMVP = (() => {
    if (!champion) return null;
    const playerIsChamp = champion.id === playerTeamId;
    if (playerIsChamp) return player.name;
    const leaguePlayers = (league?.playerStats ?? []).find(e => e.season)?.players ?? [];
    const champPlayers  = leaguePlayers.filter(p => p.team === champion.id).sort((a, b) => b.ppg - a.ppg);
    return champPlayers[0]?.name ?? 'Unknown';
  })();

  function updateBracket(updated) {
    setBracket(updated);
    setPlayoffState(updated);
  }

  function simOneGameInSeries(series, isPlayerSeries) {
    const s = { ...series };
    const gameWinner = simPlayoffGame(s, playerTeamId, seasonResults?.playerSeason);
    if (gameWinner.id === s.teamA.id) s.winsA++;
    else s.winsB++;
    s.games = [...(s.games ?? []), { winner: gameWinner.id }];
    if (s.winsA === 4) s.winner = s.teamA;
    if (s.winsB === 4) s.winner = s.teamB;
    return s;
  }

  function simEntireSeries(series) {
    return simSeries(series, playerTeamId, seasonResults?.playerSeason);
  }

  function updateSeriesInBracket(oldBracket, updatedSeries) {
    // Find and replace the series in the bracket
    const b = JSON.parse(JSON.stringify(oldBracket));
    for (const conf of ['east', 'west']) {
      for (const round of ['r1', 'r2', 'conf']) {
        if (!b[conf]?.[round]) continue;
        const idx = b[conf][round].findIndex(s =>
          (s.teamA?.id === updatedSeries.teamA?.id && s.teamB?.id === updatedSeries.teamB?.id) ||
          (s.teamA?.id === updatedSeries.teamB?.id && s.teamB?.id === updatedSeries.teamA?.id)
        );
        if (idx >= 0) { b[conf][round][idx] = updatedSeries; return b; }
      }
    }
    if (b.finals && (b.finals.teamA?.id === updatedSeries.teamA?.id || b.finals.teamB?.id === updatedSeries.teamA?.id)) {
      b.finals = updatedSeries;
    }
    return b;
  }

  function handleSimOneGame() {
    if (!playerSeries) return;
    const updated = simOneGameInSeries(playerSeries, true);
    const newBracket = updateSeriesInBracket(bracket, updated);

    if (updated.winner) {
      const won = updated.winner.id === playerTeamId;
      const oppTeam = updated.winner.id === updated.teamA.id ? updated.teamB : updated.teamA;
      if (won) {
        setMessage(`Series won! Advancing to the next round.`);
        addNews({ type: 'award', headline: `Playoff series won — advancing!`, date: `${2025 + player.nbaSeasonsPlayed} Playoffs` });
        // Auto-advance bracket
        advanceAfterSeriesWin(newBracket);
      } else {
        setMessage(`Eliminated by ${oppTeam.city} ${oppTeam.name}. Press "Complete Playoffs" to see who wins the championship.`);
        addNews({ type: 'team', headline: `Eliminated in the ${roundLabel}`, date: `${2025 + player.nbaSeasonsPlayed} Playoffs` });
        updateBracket(newBracket); // don't auto-sim — let user press the button
      }
    } else {
      updateBracket(newBracket);
    }
  }

  function handleSimSeries() {
    if (!playerSeries) return;
    const updated = simEntireSeries(playerSeries);
    const newBracket = updateSeriesInBracket(bracket, updated);
    const won = updated.winner?.id === playerTeamId;
    if (won) {
      setMessage(`Series won ${updated.winsA}-${updated.winsB}! Advancing.`);
      advanceAfterSeriesWin(newBracket);
    } else {
      setMessage(`Eliminated ${updated.winsA}-${updated.winsB}. Press "Complete Playoffs" to see the champion.`);
      updateBracket(newBracket); // don't auto-sim — show "Complete" button
    }
  }

  function advanceAfterSeriesWin(b) {
    // Sim all other series in this round, then advance the round
    const advanced = advanceRound(b);
    updateBracket(advanced);
  }

  function autoSimRemaining(b) {
    // Sim all remaining rounds automatically
    let current = b;
    let safetyLimit = 10;
    while (!current.champion && safetyLimit-- > 0) {
      current = advanceRound(current);
    }
    updateBracket(current);
    if (current.champion) {
      const finalsMVPName = current.champion.id === playerTeamId ? player.name : '—';
      setFinalsResult({ champion: current.champion, finalsMVP: finalsMVPName });
    }
  }

  function advanceRound(b) {
    // Sim any incomplete series in the current round, then promote winners
    const clone = JSON.parse(JSON.stringify(b));

    // Sim all incomplete series in each round
    for (const conf of ['east', 'west']) {
      for (const round of ['r1', 'r2', 'conf']) {
        if (!clone[conf]?.[round]) continue;
        clone[conf][round] = clone[conf][round].map(s =>
          s.winner ? s : simSeries(s, playerTeamId, null)
        );
      }
    }

    // Build next rounds if missing
    if (!clone.east.r2?.length && clone.east.r1?.every(s => s.winner)) {
      clone.east.r2 = [
        { teamA: clone.east.r1[0].winner, teamB: clone.east.r1[1].winner, winsA: 0, winsB: 0, games: [], winner: null },
        { teamA: clone.east.r1[2].winner, teamB: clone.east.r1[3].winner, winsA: 0, winsB: 0, games: [], winner: null },
      ];
    }
    if (!clone.west.r2?.length && clone.west.r1?.every(s => s.winner)) {
      clone.west.r2 = [
        { teamA: clone.west.r1[0].winner, teamB: clone.west.r1[1].winner, winsA: 0, winsB: 0, games: [], winner: null },
        { teamA: clone.west.r1[2].winner, teamB: clone.west.r1[3].winner, winsA: 0, winsB: 0, games: [], winner: null },
      ];
    }
    if (!clone.east.conf?.length && clone.east.r2?.every(s => s.winner)) {
      clone.east.conf = [{ teamA: clone.east.r2[0].winner, teamB: clone.east.r2[1].winner, winsA: 0, winsB: 0, games: [], winner: null }];
    }
    if (!clone.west.conf?.length && clone.west.r2?.every(s => s.winner)) {
      clone.west.conf = [{ teamA: clone.west.r2[0].winner, teamB: clone.west.r2[1].winner, winsA: 0, winsB: 0, games: [], winner: null }];
    }
    if (!clone.finals && clone.east.conf?.[0]?.winner && clone.west.conf?.[0]?.winner) {
      clone.finals = { teamA: clone.east.conf[0].winner, teamB: clone.west.conf[0].winner, winsA: 0, winsB: 0, games: [], winner: null };
    }
    if (clone.finals && !clone.finals.winner) {
      clone.finals = simSeries(clone.finals, playerTeamId, null);
      clone.champion = clone.finals.winner;
    }
    if (clone.finals?.winner) clone.champion = clone.finals.winner;

    return clone;
  }

  function handlePlayGame() {
    if (!playerSeries) return;
    useGameStore.setState(s => ({
      ...s,
      currentGameEntry: {
        opponent: playerSeries.teamA?.id === playerTeamId ? playerSeries.teamB : playerSeries.teamA,
        isHome: playerSeries.winsA + playerSeries.winsB < 2,
        gameNumber: (playerSeries.games?.length ?? 0) + 1,
        isPlayoff: true,
      },
      screen: 'PLAY_GAME',
    }));
  }

  function handleAdvanceToOffseason() {
    clearPlayoffState();
    goTo('OFFSEASON');
  }

  const seriesComplete = !playerSeries || eliminated || !!champion;

  return (
    <div className="min-h-screen">
      <TopNav links={[{ screen: 'SEASON_DASHBOARD', label: 'Dashboard' }]} />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">{2025 + player.nbaSeasonsPlayed} NBA Playoffs</div>
          <h2 className="text-2xl font-bold">PLAYOFF BRACKET</h2>
        </div>

        {/* Status message */}
        {message && (
          <div className="border-2 border-black p-4 font-bold text-center">{message}</div>
        )}

        {/* Champion banner */}
        {champion && (
          <div className="border-2 border-black p-5 text-center">
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest mb-1">NBA Champion</div>
            <div className="text-3xl font-bold">{champion.city} {champion.name}</div>
            {finalsMVP && <div className="font-mono text-sm mt-2 text-gray-600">Finals MVP: {finalsMVP}</div>}
            {finalsResult?.finalsMVP && finalsMVP !== finalsResult.finalsMVP && (
              <div className="font-mono text-sm mt-2 text-gray-600">Finals MVP: {finalsResult.finalsMVP}</div>
            )}
          </div>
        )}

        {/* Current player series controls */}
        {playerSeries && !eliminated && !champion && (
          <Panel title="YOUR SERIES">
            <div className="font-mono text-sm mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className={playerSeries.teamA?.id === playerTeamId ? 'font-bold' : 'text-gray-500'}>
                  ({playerSeries.teamA?.seed}) {playerSeries.teamA?.city} {playerSeries.teamA?.name}
                </span>
                <span className="font-mono font-bold text-xl px-4">
                  {playerSeries.winsA} – {playerSeries.winsB}
                </span>
                <span className={playerSeries.teamB?.id === playerTeamId ? 'font-bold' : 'text-gray-500'}>
                  ({playerSeries.teamB?.seed}) {playerSeries.teamB?.city} {playerSeries.teamB?.name}
                </span>
              </div>
              <div className="font-mono text-xs text-gray-400 text-center">
                Best of 7 · {4 - (playerSeries.teamA?.id === playerTeamId ? playerSeries.winsA : playerSeries.winsB)} wins needed
                {playerSeries.games?.length > 0 && ` · Game ${(playerSeries.games?.length ?? 0) + 1}`}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button className="btn btn-primary py-2 text-sm" onClick={handlePlayGame}>
                ▶ Play Game {(playerSeries.games?.length ?? 0) + 1}
              </button>
              <button className="btn py-2 text-sm" onClick={handleSimOneGame}>
                ⚡ Sim 1 Game
              </button>
              <button className="btn py-2 text-sm" onClick={handleSimSeries}>
                ⏩ Sim Series
              </button>
            </div>
          </Panel>
        )}

        {/* Bracket views */}
        {['east', 'west'].map(conf => (
          <Panel key={conf} title={`${conf.toUpperCase()}ERN CONFERENCE`}>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {['r1', 'r2', 'conf'].map(round => (
                <div key={round} className="space-y-1">
                  <div className="font-mono text-xs text-gray-400 mb-1 uppercase">
                    {round === 'r1' ? 'First Round' : round === 'r2' ? 'Semis' : 'Conf Finals'}
                  </div>
                  {(bracket[conf]?.[round] ?? []).map((s, i) => (
                    <SeriesBox key={i} series={s} playerTeamId={playerTeamId} />
                  ))}
                  {!(bracket[conf]?.[round]?.length > 0) && (
                    <div className="border border-gray-200 p-2 text-gray-400 text-xs">TBD</div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        ))}

        {/* NBA Finals */}
        {bracket.finals && (
          <Panel title="NBA FINALS">
            <SeriesBox series={bracket.finals} playerTeamId={playerTeamId} />
          </Panel>
        )}

        {/* "Complete Playoffs" — shown when eliminated but bracket not fully sim'd */}
        {eliminated && !champion && (
          <button className="btn w-full py-3 tracking-widest" onClick={() => autoSimRemaining(bracket)}>
            ⏩ COMPLETE PLAYOFFS
          </button>
        )}

        {(seriesComplete || champion) && (
          <button className="btn btn-primary w-full py-3 tracking-widest" onClick={handleAdvanceToOffseason}>
            ADVANCE TO OFFSEASON →
          </button>
        )}
      </div>
    </div>
  );
}
