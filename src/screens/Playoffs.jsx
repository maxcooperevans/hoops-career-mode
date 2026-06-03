import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import {
  buildPlayoffBracket, simSeries, advanceBracket,
  findPlayerSeries, isPlayerEliminated,
} from '../engine/playoffEngine.js';
import { TEAM_MAP } from '../data/teams.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

function TeamLabel({ team, seed }) {
  if (!team) return <span className="text-gray-400">TBD</span>;
  return <span>({seed}) {team.city} {team.name}</span>;
}

function SeriesBox({ series, playerTeamId, onClick }) {
  if (!series) return <div className="border border-gray-200 p-2 font-mono text-xs text-gray-400">TBD</div>;
  const isPlayer = series.teamA?.id === playerTeamId || series.teamB?.id === playerTeamId;
  const done = !!series.winner;
  return (
    <div
      className={`border p-2 font-mono text-xs cursor-pointer hover:bg-gray-50
        ${isPlayer ? 'border-2 border-black font-bold' : 'border-gray-300'}
        ${done ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className={series.winner?.id === series.teamA?.id ? 'font-bold' : 'text-gray-500'}>
        ({series.teamA?.seed}) {series.teamA?.city} {series.winsA}
      </div>
      <div className={series.winner?.id === series.teamB?.id ? 'font-bold' : 'text-gray-500'}>
        ({series.teamB?.seed}) {series.teamB?.city} {series.winsB}
      </div>
      {!done && isPlayer && (
        <div className="text-xs text-gray-400 mt-0.5">▶ YOUR SERIES</div>
      )}
    </div>
  );
}

export default function Playoffs() {
  const player           = useGameStore(s => s.player);
  const league           = useGameStore(s => s.league);
  const playoffState     = useGameStore(s => s.playoffState);
  const setPlayoffState  = useGameStore(s => s.setPlayoffState);
  const clearPlayoffState= useGameStore(s => s.clearPlayoffState);
  const seasonResults    = useGameStore(s => s.seasonResults);
  const goTo             = useGameStore(s => s.goTo);
  const addNews          = useGameStore(s => s.addNews);
  const finishSeason     = useGameStore(s => s.finishSeason);

  const [bracket, setBracket] = useState(playoffState ?? null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [message, setMessage] = useState('');

  const playerTeamId = player.team;

  // Generate bracket on first load
  useEffect(() => {
    if (!bracket && league?.standings) {
      const b = buildPlayoffBracket(league.standings);
      setBracket(b);
      setPlayoffState(b);
    }
  }, []);

  if (!bracket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-sm text-gray-500">Generating playoff bracket...</div>
      </div>
    );
  }

  const eliminated = isPlayerEliminated(bracket, playerTeamId);
  const playerSeries = findPlayerSeries(bracket, playerTeamId);
  const champion = bracket.champion;
  const roundLabel = ['', 'First Round', 'Second Round', 'Conference Finals', 'NBA Finals', 'Champion'][bracket.currentRound] ?? '';

  function handleSimRound() {
    const updated = advanceBracket(bracket, playerTeamId, seasonResults?.playerSeason);
    setBracket(updated);
    setPlayoffState(updated);

    const newElim = isPlayerEliminated(updated, playerTeamId);
    if (updated.champion) {
      const won = updated.champion.id === playerTeamId;
      setMessage(won ? '🏆 CHAMPIONS!' : `Season over. ${updated.champion.city} ${updated.champion.name} win the title.`);
      if (won) {
        addNews({ type: 'award', headline: `CHAMPIONSHIP! ${player.name} and the ${TEAM_MAP[playerTeamId]?.name} are NBA Champions!`, date: `${2025 + player.nbaSeasonsPlayed}` });
      }
    } else if (newElim && !isPlayerEliminated(bracket, playerTeamId)) {
      setMessage(`Eliminated. ${updated.east?.r1?.find(s => s.winner && (s.teamA?.id === playerTeamId || s.teamB?.id === playerTeamId))?.winner?.city ?? ''} moves on.`);
      addNews({ type: 'team', headline: `Playoff run ends — eliminated in Round ${bracket.currentRound}`, date: `${2025 + player.nbaSeasonsPlayed} Playoffs` });
    }
  }

  function handleAdvanceToOffseason() {
    clearPlayoffState();
    goTo('OFFSEASON');
  }

  const isFinished = !!champion || eliminated;

  return (
    <div className="min-h-screen">
      <TopNav links={[{ screen: 'SEASON_DASHBOARD', label: 'Dashboard' }]} />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">
            {2025 + player.nbaSeasonsPlayed} NBA Playoffs · {roundLabel}
          </div>
          <h2 className="text-2xl font-bold">PLAYOFF BRACKET</h2>
        </div>

        {message && (
          <div className="border-2 border-black p-4 font-bold text-center text-lg">{message}</div>
        )}

        {/* Current player series highlight */}
        {playerSeries && !isFinished && (
          <Panel title="YOUR SERIES">
            <div className="font-mono text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className={playerSeries.teamA?.id === playerTeamId ? 'font-bold' : ''}>
                  ({playerSeries.teamA?.seed}) {playerSeries.teamA?.city} {playerSeries.teamA?.name}
                </span>
                <span className="font-mono font-bold">{playerSeries.winsA} – {playerSeries.winsB}</span>
                <span className={playerSeries.teamB?.id === playerTeamId ? 'font-bold' : ''}>
                  ({playerSeries.teamB?.seed}) {playerSeries.teamB?.city} {playerSeries.teamB?.name}
                </span>
              </div>
              <div className="font-mono text-xs text-gray-500 text-center">
                Best of 7 · {4 - (playerSeries.teamA?.id === playerTeamId ? playerSeries.winsA : playerSeries.winsB)} wins needed
              </div>
            </div>
          </Panel>
        )}

        {/* East bracket */}
        <Panel title="EASTERN CONFERENCE">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-400 mb-1">FIRST ROUND</div>
              {(bracket.east.r1 ?? []).map((s, i) => (
                <SeriesBox key={i} series={s} playerTeamId={playerTeamId} onClick={() => setSelectedSeries(s)} />
              ))}
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-400 mb-1">SECOND ROUND</div>
              {(bracket.east.r2 ?? []).map((s, i) => (
                <SeriesBox key={i} series={s} playerTeamId={playerTeamId} onClick={() => setSelectedSeries(s)} />
              ))}
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-400 mb-1">CONF. FINALS</div>
              {(bracket.east.conf ?? []).map((s, i) => (
                <SeriesBox key={i} series={s} playerTeamId={playerTeamId} onClick={() => setSelectedSeries(s)} />
              ))}
            </div>
          </div>
        </Panel>

        {/* Finals */}
        {bracket.finals && (
          <Panel title="NBA FINALS">
            <SeriesBox series={bracket.finals} playerTeamId={playerTeamId} onClick={() => setSelectedSeries(bracket.finals)} />
          </Panel>
        )}

        {/* West bracket */}
        <Panel title="WESTERN CONFERENCE">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-400 mb-1">FIRST ROUND</div>
              {(bracket.west.r1 ?? []).map((s, i) => (
                <SeriesBox key={i} series={s} playerTeamId={playerTeamId} onClick={() => setSelectedSeries(s)} />
              ))}
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-400 mb-1">SECOND ROUND</div>
              {(bracket.west.r2 ?? []).map((s, i) => (
                <SeriesBox key={i} series={s} playerTeamId={playerTeamId} onClick={() => setSelectedSeries(s)} />
              ))}
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs text-gray-400 mb-1">CONF. FINALS</div>
              {(bracket.west.conf ?? []).map((s, i) => (
                <SeriesBox key={i} series={s} playerTeamId={playerTeamId} onClick={() => setSelectedSeries(s)} />
              ))}
            </div>
          </div>
        </Panel>

        {/* Action buttons */}
        {!isFinished && !champion && (
          <button className="btn btn-primary w-full py-3 tracking-widest" onClick={handleSimRound}>
            SIMULATE NEXT ROUND →
          </button>
        )}

        {isFinished && (
          <button className="btn btn-primary w-full py-3 tracking-widest" onClick={handleAdvanceToOffseason}>
            ADVANCE TO OFFSEASON →
          </button>
        )}
      </div>
    </div>
  );
}
