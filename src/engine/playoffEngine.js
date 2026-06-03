import { gaussian, clamp } from './playerEngine.js';
import { TEAMS, TEAM_MAP } from '../data/teams.js';

// Build playoff bracket from regular-season standings
export function buildPlayoffBracket(standings) {
  const east = TEAMS.filter(t => t.conf === 'East')
    .map(t => ({ ...t, wins: standings[t.id]?.wins ?? 0 }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 8)
    .map((t, i) => ({ ...t, seed: i + 1 }));

  const west = TEAMS.filter(t => t.conf === 'West')
    .map(t => ({ ...t, wins: standings[t.id]?.wins ?? 0 }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 8)
    .map((t, i) => ({ ...t, seed: i + 1 }));

  function makeSeries(a, b) {
    return { teamA: a, teamB: b, winsA: 0, winsB: 0, games: [], winner: null };
  }

  return {
    east: {
      r1: [
        makeSeries(east[0], east[7]),
        makeSeries(east[1], east[6]),
        makeSeries(east[2], east[5]),
        makeSeries(east[3], east[4]),
      ],
      r2: [], conf: [], complete: false,
    },
    west: {
      r1: [
        makeSeries(west[0], west[7]),
        makeSeries(west[1], west[6]),
        makeSeries(west[2], west[5]),
        makeSeries(west[3], west[4]),
      ],
      r2: [], conf: [], complete: false,
    },
    finals: null,
    champion: null,
    currentRound: 1,
  };
}

// Simulate one game of a series
export function simPlayoffGame(series, playerTeamId, playerSeason) {
  const { teamA, teamB } = series;
  const diff = (teamA.strength - teamB.strength) / 50;
  const homeAdv = (series.winsA + series.winsB) % 2 === 0 ? 0.04 : -0.02;
  const winProbA = clamp(0.5 + diff + homeAdv + gaussian(0, 0.05), 0.1, 0.9);

  const aWins = Math.random() < winProbA;
  const winner = aWins ? teamA : teamB;
  const loser  = aWins ? teamB  : teamA;

  // Player impact: slightly boosts their team's win probability
  let playerImpact = 0;
  if (playerSeason && (teamA.id === playerTeamId || teamB.id === playerTeamId)) {
    const ppg = playerSeason.averages?.pts ?? 0;
    playerImpact = ppg > 20 ? 0.05 : ppg > 14 ? 0.02 : 0;
  }

  const finalWinProbA = clamp(winProbA + (teamA.id === playerTeamId ? playerImpact : -playerImpact), 0.1, 0.9);
  const correctedWin = Math.random() < finalWinProbA;

  return correctedWin ? teamA : teamB;
}

// Simulate an entire series (best of 7) without user interaction
export function simSeries(series, playerTeamId, playerSeason) {
  const s = JSON.parse(JSON.stringify(series));
  while (s.winsA < 4 && s.winsB < 4) {
    const gameWinner = simPlayoffGame(s, playerTeamId, playerSeason);
    if (gameWinner.id === s.teamA.id) s.winsA++;
    else s.winsB++;
    s.games.push({ winner: gameWinner.id });
  }
  s.winner = s.winsA === 4 ? s.teamA : s.teamB;
  return s;
}

// Advance the bracket to the next round
export function advanceBracket(bracket, playerTeamId, playerSeason) {
  const b = JSON.parse(JSON.stringify(bracket));

  function simConferenceRound(conf, roundKey, inputKey) {
    const input = conf[inputKey];
    if (!input || input.length === 0) return;
    conf[roundKey] = [];
    for (let i = 0; i < input.length; i += 2) {
      const s1 = simSeries(input[i], playerTeamId, playerSeason);
      const s2 = simSeries(input[i + 1], playerTeamId, playerSeason);
      conf[roundKey].push({ teamA: s1.winner, teamB: s2.winner, winsA: 0, winsB: 0, games: [], winner: null });
      // Mark originals as done
      input[i] = s1; input[i + 1] = s2;
    }
  }

  // Fully sim NPC series for both conferences
  if (b.currentRound === 1) {
    b.east.r1 = b.east.r1.map(s => s.winner ? s : simSeries(s, playerTeamId, playerSeason));
    b.west.r1 = b.west.r1.map(s => s.winner ? s : simSeries(s, playerTeamId, playerSeason));
    // Build R2 matchups
    const ewR1 = b.east.r1; const wR1 = b.west.r1;
    b.east.r2 = [
      { teamA: ewR1[0].winner, teamB: ewR1[1].winner, winsA: 0, winsB: 0, games: [], winner: null },
      { teamA: ewR1[2].winner, teamB: ewR1[3].winner, winsA: 0, winsB: 0, games: [], winner: null },
    ];
    b.west.r2 = [
      { teamA: wR1[0].winner, teamB: wR1[1].winner, winsA: 0, winsB: 0, games: [], winner: null },
      { teamA: wR1[2].winner, teamB: wR1[3].winner, winsA: 0, winsB: 0, games: [], winner: null },
    ];
    b.currentRound = 2;
  } else if (b.currentRound === 2) {
    b.east.r2 = b.east.r2.map(s => s.winner ? s : simSeries(s, playerTeamId, playerSeason));
    b.west.r2 = b.west.r2.map(s => s.winner ? s : simSeries(s, playerTeamId, playerSeason));
    b.east.conf = [{ teamA: b.east.r2[0].winner, teamB: b.east.r2[1].winner, winsA: 0, winsB: 0, games: [], winner: null }];
    b.west.conf = [{ teamA: b.west.r2[0].winner, teamB: b.west.r2[1].winner, winsA: 0, winsB: 0, games: [], winner: null }];
    b.currentRound = 3;
  } else if (b.currentRound === 3) {
    b.east.conf = b.east.conf.map(s => s.winner ? s : simSeries(s, playerTeamId, playerSeason));
    b.west.conf = b.west.conf.map(s => s.winner ? s : simSeries(s, playerTeamId, playerSeason));
    b.finals = { teamA: b.east.conf[0].winner, teamB: b.west.conf[0].winner, winsA: 0, winsB: 0, games: [], winner: null };
    b.currentRound = 4;
  } else if (b.currentRound === 4) {
    if (b.finals && !b.finals.winner) {
      b.finals = simSeries(b.finals, playerTeamId, playerSeason);
    }
    b.champion = b.finals?.winner;
    b.currentRound = 5;
  }

  return b;
}

// Find the player's current series in the bracket
export function findPlayerSeries(bracket, playerTeamId) {
  const allSeries = [
    ...(bracket.east?.r1 ?? []),
    ...(bracket.east?.r2 ?? []),
    ...(bracket.east?.conf ?? []),
    ...(bracket.west?.r1 ?? []),
    ...(bracket.west?.r2 ?? []),
    ...(bracket.west?.conf ?? []),
    bracket.finals,
  ].filter(Boolean);

  return allSeries.find(s =>
    !s.winner &&
    (s.teamA?.id === playerTeamId || s.teamB?.id === playerTeamId)
  ) ?? null;
}

export function isPlayerEliminated(bracket, playerTeamId) {
  if (!bracket) return false;
  const allSeries = [
    ...(bracket.east?.r1 ?? []),
    ...(bracket.east?.r2 ?? []),
    ...(bracket.east?.conf ?? []),
    ...(bracket.west?.r1 ?? []),
    ...(bracket.west?.r2 ?? []),
    ...(bracket.west?.conf ?? []),
    bracket.finals,
  ].filter(Boolean);

  return allSeries.some(s =>
    s.winner &&
    s.winner.id !== playerTeamId &&
    (s.teamA?.id === playerTeamId || s.teamB?.id === playerTeamId)
  );
}
