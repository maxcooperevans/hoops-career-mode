import { gaussian, clamp, computeOverall, generateInjury, injuryRisk } from './playerEngine.js';
import { POSITION_WEIGHTS, SEASON_GAMES } from '../data/constants.js';
import { generateRoster } from '../data/teams.js';

const ROLE_MPG = {
  franchise: 35, star: 32, starter: 27, sixthman: 22, rotation: 16, bench: 9,
};
const ROLE_USAGE = {
  franchise: 0.30, star: 0.26, starter: 0.20, sixthman: 0.16, rotation: 0.13, bench: 0.10,
};

// Role-anchored base stats — role sets the realistic floor/ceiling; attributes act as ±40% modifier.
const ROLE_BASE_PPG = { franchise: 27, star: 21, starter: 13.5, sixthman: 10.5, rotation: 6, bench: 3.5 };
const ROLE_BASE_REB = { franchise: 7,  star: 5.5, starter: 4.2, sixthman: 3.2, rotation: 2.3, bench: 1.5 };
// AST floors reduced — combined with lower PG astBonus to prevent 18+ APG seasons
const ROLE_BASE_AST = { franchise: 3.5, star: 3.0, starter: 2.2, sixthman: 1.6, rotation: 1.1, bench: 0.6 };

// Archetype-based stat bonuses — inspired by 2K tendencies
// Applied as multipliers on top of the base attribute calculations
const ARCHETYPE_STAT_MODS = {
  'Floor General':  { astMult: 1.30, stlMult: 1.10, ptsMult: 0.95, efficiency: 1.08 },
  'Slasher':        { ptsMult: 1.20, ftMult: 1.25,  rebMult: 1.05, astMult: 0.90 },
  '3-and-D':        { stlMult: 1.35, ptsMult: 1.05, threeMult: 1.20, astMult: 0.85 },
  'Stretch Big':    { threeMult: 1.40, ptsMult: 1.05, rebMult: 0.85, astMult: 1.10 },
  'Rim Protector':  { blkMult: 1.60, rebMult: 1.40, ptsMult: 0.90, stlMult: 0.90 },
  'Two-Way Wing':   { stlMult: 1.25, blkMult: 1.15, ptsMult: 1.00, rebMult: 1.05 },
};

export function determineRole(playerOverall, teamStrength, nbaSeasonsPlayed, coachTrust) {
  const trust = (coachTrust - 50) / 50;
  // Tiny rookie adjustment — talent beats experience after year 1
  const rookiePenalty = nbaSeasonsPlayed === 0 ? 2 : 0;
  const adj = playerOverall + trust * 5 - rookiePenalty;
  if (adj >= teamStrength + 10) return 'franchise';
  if (adj >= teamStrength + 2)  return 'star';
  if (adj >= teamStrength - 8)  return 'starter';
  if (adj >= teamStrength - 17) return 'sixthman';
  if (adj >= teamStrength - 26) return 'rotation';
  return 'bench';
}

// Stochastic rounding: correct expected value with integer output
function sRound(x) {
  const fl = Math.floor(x);
  return Math.random() < (x - fl) ? fl + 1 : fl;
}

function simGameLine(attrs, position, role, mpg, oppStrength, archetype = null) {
  const pw = POSITION_WEIGHTS[position];
  const minFactor = mpg / 36;
  const oppFactor = 1 + (50 - oppStrength) * 0.006;

  const scoringRating =
    attrs.insideScoring * pw.scoring.inside +
    attrs.midRange      * pw.scoring.mid +
    attrs.threePoint    * pw.scoring.three;

  // Wide-range scoring: role sets a floor/ceiling; elite scorers punch above their role.
  // t=0 at scoringRating 40 → floor; t=1 at 99 → ceiling.
  // Franchise + scoringRating 90 ≈ 30 PPG; rotation + scoringRating 80 ≈ 12 PPG.
  // Ceilings calibrated so peak scorers hit ~35 PPG max (Jordan/Kobe territory).
  // Prevents maxed builds from generating unrealistic 40+ PPG seasons.
  const ROLE_FLOOR_PPG = { franchise: 16, star: 13, starter: 8, sixthman: 6, rotation: 4, bench: 2 };
  const ROLE_CEIL_PPG  = { franchise: 35, star: 27, starter: 20, sixthman: 15, rotation: 11, bench: 7 };
  const t = clamp((scoringRating - 40) / (99 - 40), 0, 1);
  const basePPG = (ROLE_FLOOR_PPG[role] + t * (ROLE_CEIL_PPG[role] - ROLE_FLOOR_PPG[role])) * oppFactor;

  // Shooting %s
  const fgPct  = clamp(0.42 + (scoringRating - 65) * 0.0025, 0.33, 0.63);
  const fg3Rate = pw.scoring.three * Math.min(0.8, attrs.threePoint / 99 * 0.85);
  const fg3pct  = clamp(0.34 + (attrs.threePoint - 65) * 0.003, 0.28, 0.48);
  const ftpct   = clamp(0.68 + (attrs.freeThrow - 65) * 0.004, 0.52, 0.96);

  // FGA derived from expected PPG — pts ≈ fga*(2*fgPct + fg3Rate*fg3pct + 0.22*ftpct)
  const denom  = Math.max(0.8, 2 * fgPct + fg3Rate * fg3pct + 0.22 * ftpct);
  const fgaBase = basePPG / denom;
  const fga    = Math.max(0, sRound(gaussian(fgaBase, Math.max(1, fgaBase * 0.28))));

  // Makes — stochastic rounding removes systematic bias
  const fgm  = Math.min(fga, sRound(fga * fgPct));
  const fg3a = sRound(fga * fg3Rate);
  const fg3m = Math.min(fg3a, sRound(fg3a * fg3pct));
  const fg2m = Math.max(0, fgm - fg3m);

  // FTs — individual Bernoulli trials for correct aggregate %
  const ftaBase = fga * 0.22 * Math.pow(clamp(attrs.athleticism, 30, 99) / 80, 1.5);
  const fta = Math.max(0, sRound(gaussian(ftaBase, Math.max(0.3, ftaBase * 0.3))));
  let ftm = 0;
  for (let i = 0; i < fta; i++) if (Math.random() < ftpct) ftm++;

  const pts = 2 * fg2m + 3 * fg3m + ftm;

  // Archetype multipliers (2K-style: archetype biases how stats manifest)
  const am = (archetype && ARCHETYPE_STAT_MODS[archetype]) ? ARCHETYPE_STAT_MODS[archetype] : {};

  // Rebounds
  const rebMult = clamp(0.5 + 1.0 * (attrs.rebounding / 99), 0.4, 1.6) * pw.rebBonus * (am.rebMult ?? 1.0);
  const rebBase = ROLE_BASE_REB[role] * rebMult * minFactor / 0.75;
  const reb = Math.max(0, sRound(gaussian(rebBase, Math.max(0.5, rebBase * 0.32))));

  // Assists — astBonus in constants.js reduced (PG 1.65→1.10) to prevent 18+ APG
  const astMult = clamp(0.5 + 1.0 * (attrs.passingVision / 99), 0.4, 1.6) * pw.astBonus * (am.astMult ?? 1.0);
  const astBase = ROLE_BASE_AST[role] * astMult * minFactor / 0.75;
  const ast = Math.max(0, sRound(gaussian(astBase, Math.max(0.4, astBase * 0.38))));

  // Steals & Blocks — archetype-boosted
  const stlBase = (attrs.perimeterDefense / 99) * 2.0 * minFactor * (am.stlMult ?? 1.0);
  const stl = Math.max(0, Math.round(gaussian(stlBase, 0.5) * 10) / 10);

  const blkBase = Math.pow(attrs.interiorDefense / 99, 1.2) * pw.blkBonus * 2.4 * minFactor * (am.blkMult ?? 1.0);
  const blk = Math.max(0, Math.round(gaussian(blkBase, 0.4) * 10) / 10);

  // Turnovers
  const usage = ROLE_USAGE[role];
  const tovBase = usage * 5.5 * minFactor * (1 - attrs.basketballIQ / 99 * 0.45);
  const tov = Math.max(0, sRound(gaussian(tovBase, tovBase * 0.3)));

  const actualMin = Math.round(clamp(gaussian(mpg, 2.5), 2, 42));

  return {
    min: actualMin, pts, reb, ast,
    stl: Math.round(stl * 10) / 10,
    blk: Math.round(blk * 10) / 10,
    tov, fgm, fga: Math.max(fgm, fga),
    fg3m, fg3a: Math.max(fg3m, fg3a),
    ftm, fta: Math.max(ftm, fta),
    plusMinus: Math.round(gaussian(0, 12)),
  };
}

function aggregateStats(lines) {
  const keys = ['min','pts','reb','ast','stl','blk','tov','fgm','fga','fg3m','fg3a','ftm','fta'];
  const totals = Object.fromEntries(keys.map(k => [k, 0]));
  lines.forEach(g => keys.forEach(k => { totals[k] += g[k] ?? 0; }));
  const gp = lines.length;
  const averages = Object.fromEntries(
    keys.map(k => [k, gp > 0 ? Math.round((totals[k] / gp) * 10) / 10 : 0])
  );
  return {
    totals,
    averages,
    fgPct:  totals.fga  > 0 ? Math.round(totals.fgm  / totals.fga  * 1000) / 10 : 0,
    fg3Pct: totals.fg3a > 0 ? Math.round(totals.fg3m / totals.fg3a * 1000) / 10 : 0,
    ftPct:  totals.fta  > 0 ? Math.round(totals.ftm  / totals.fta  * 1000) / 10 : 0,
  };
}

export function simPlayerSeason(player, team, season) {
  const overall = computeOverall(player.attributes, player.position);
  const role = determineRole(overall, team.strength, player.nbaSeasonsPlayed, player.coachTrust);
  const mpg  = clamp(gaussian(ROLE_MPG[role], 2.5), 5, 40);

  const injRisk = injuryRisk(player);
  const injured = Math.random() < injRisk;
  let gamesMissed = 0, injuryResult = null;
  if (injured) {
    injuryResult = generateInjury(player);
    gamesMissed = Math.min(81, Math.max(0, injuryResult.gamesMissed));
  }

  const gamesPlayed = Math.max(1, SEASON_GAMES - gamesMissed);
  const avgOppStrength = 65 + gaussian(0, 6);
  const gameLines = [];

  for (let g = 0; g < gamesPlayed; g++) {
    const oppStr = clamp(avgOppStrength + gaussian(0, 14), 42, 96);
    gameLines.push(simGameLine(player.attributes, player.position, role, mpg, oppStr, player.archetype));
  }

  const sorted = [...gameLines].sort((a, b) => b.pts - a.pts);
  const stats  = aggregateStats(gameLines);

  // Season highs (best single-game values)
  const seasonHighs = {
    pts: sorted[0]?.pts ?? 0,
    reb: Math.max(...gameLines.map(g => g.reb)),
    ast: Math.max(...gameLines.map(g => g.ast)),
    stl: Math.max(...gameLines.map(g => g.stl)),
    blk: Math.max(...gameLines.map(g => g.blk)),
  };

  return {
    season, role, gamesPlayed,
    mpg: Math.round(mpg * 10) / 10,
    ...stats,
    bestGame: sorted[0],
    seasonHighs,
    injury: injuryResult,
    team: team.id,
    overall,
  };
}

export function simLeagueStandings(teams, playerTeamId, playerSeason) {
  const standings = {};
  teams.forEach(team => {
    const base  = 20 + (team.strength - 50) * 0.88;
    const noise = gaussian(0, 5);
    let wins = Math.round(clamp(base + noise, 10, 72));
    if (team.id === playerTeamId && playerSeason) {
      const ppg = playerSeason.averages?.pts ?? 0;
      wins = Math.round(clamp(wins + (ppg - 12) * 0.25 + (playerSeason.averages?.ast ?? 0) * 0.2, 10, 72));
    }
    standings[team.id] = { wins, losses: 82 - wins, pct: Math.round(wins / 82 * 1000) / 1000 };
  });
  return standings;
}

// ── League-wide player stat simulation ──────────────────────────────────────
// Generates per-season stats for every notable player in the league so we can
// build leaderboards and let the player compare themselves to the rest of the league.

const POS_SCORING_ROLE = {
  PG: { rebMult: 0.55, astMult: 1.55 },
  SG: { rebMult: 0.65, astMult: 0.90 },
  SF: { rebMult: 0.92, astMult: 0.78 },
  PF: { rebMult: 1.25, astMult: 0.48 },
  C:  { rebMult: 1.55, astMult: 0.32 },
};

export function simLeaguePlayerStats(teams, season, playerEntry) {
  const leaguePlayers = [];

  teams.forEach(team => {
    const roster = generateRoster(team, season);
    roster.forEach((npc, slotIdx) => {
      const posW = POS_SCORING_ROLE[npc.pos] ?? { rebMult: 1, astMult: 1 };
      const ovr  = npc.overall;
      // Estimate role from isStarter / isStar flags
      const role = npc.isStar ? (ovr >= 85 ? 'franchise' : 'star')
                 : npc.isStarter ? 'starter'
                 : 'rotation';

      // Stars must average 20+ PPG; franchise players 24+ at their floor
      const NPC_PPG_FLOOR = { franchise: 24, star: 20, starter: 9, rotation: 3 };
      const NPC_PPG_CEIL  = { franchise: 34, star: 28, starter: 18, rotation: 9 };
      const ppgT = clamp((ovr - 55) / (97 - 55), 0, 1);
      const ppgBase = NPC_PPG_FLOOR[role] + ppgT * (NPC_PPG_CEIL[role] - NPC_PPG_FLOOR[role]);
      // Moderate variance so stars can hit 26-32 PPG at peak
      const ppg = Math.max(NPC_PPG_FLOOR[role], Math.round((ppgBase + gaussian(0, 2.5)) * 10) / 10);

      // REB varies heavily by position (bigs get 8-12, guards get 2-5)
      const posRebBase = { PG: 2.5, SG: 3.2, SF: 5.0, PF: 7.2, C: 9.5 };
      const rpgBase = (posRebBase[npc.pos] ?? 4) * (0.7 + 0.5 * ppgT);
      const rpg = Math.max(0, Math.round((rpgBase + gaussian(0, 1.8)) * 10) / 10);

      // AST varies by position (PGs get 5-10, bigs get 1-3)
      const posAstBase = { PG: 5.5, SG: 2.8, SF: 2.2, PF: 1.8, C: 1.4 };
      const apgBase = (posAstBase[npc.pos] ?? 2) * (0.6 + 0.6 * ppgT);
      const apg = Math.max(0, Math.round((apgBase + gaussian(0, 1.2)) * 10) / 10);

      const spg = Math.max(0, Math.round(gaussian(0.7 + (ovr - 65) * 0.01 + (npc.pos === 'PG' ? 0.4 : 0), 0.35) * 10) / 10);
      const bpg = Math.max(0, Math.round(gaussian(
        (npc.pos === 'C' ? 1.8 : npc.pos === 'PF' ? 0.9 : 0.3) * (0.7 + 0.5 * ppgT), 0.4) * 10) / 10);
      const gp  = Math.min(82, Math.max(35, Math.round(gaussian(72, 8))));
      const fgp = Math.round(clamp(42 + (ovr - 70) * 0.2 + gaussian(0, 2.5), 30, 64) * 10) / 10;
      const fg3p = Math.round(clamp(33 + (ovr - 60) * 0.12 + gaussian(0, 3.5), 22, 50) * 10) / 10;

      // slotId is season-independent (team + slot index) so the roster screen can
      // always find the right stats regardless of which season the roster was generated for.
      const slotId = `${team.id}_slot_${slotIdx}`;
      leaguePlayers.push({ id: npc.id, slotId, name: npc.name, team: team.id, pos: npc.pos,
                           age: npc.age, ovr, ppg, rpg, apg, spg, bpg, gp, fgp, fg3p });
    });
  });

  // Inject the real player (overwrite any matching entry)
  if (playerEntry) {
    const existing = leaguePlayers.findIndex(p => p.id === 'player' || p.name === playerEntry.name);
    if (existing >= 0) leaguePlayers.splice(existing, 1);
    leaguePlayers.push({
      id: 'player',
      name: playerEntry.name,
      team: playerEntry.team,
      pos: playerEntry.pos,
      age: playerEntry.age,
      ovr: playerEntry.overall,
      ppg: playerEntry.averages?.pts ?? 0,
      rpg: playerEntry.averages?.reb ?? 0,
      apg: playerEntry.averages?.ast ?? 0,
      spg: playerEntry.averages?.stl ?? 0,
      bpg: playerEntry.averages?.blk ?? 0,
      gp:  playerEntry.gamesPlayed ?? 0,
      fgp: playerEntry.fgPct ?? 0,
      fg3p: playerEntry.fg3Pct ?? 0,
      isPlayer: true,
    });
  }

  return leaguePlayers;
}

// ── Awards ───────────────────────────────────────────────────────────────────

export function determineAwards(playerSeason, standings, playerTeamId, nbaSeasonsPlayed) {
  const awards = [];
  const avg    = playerSeason.averages;
  const gp     = playerSeason.gamesPlayed;
  const teamWins = standings[playerTeamId]?.wins ?? 41;

  // ROY — first NBA season, any notable performance
  if (nbaSeasonsPlayed === 0 && gp >= 55) {
    if (avg.pts >= 13 || avg.reb >= 8 || avg.ast >= 6) awards.push('ROY');
    else if (avg.pts >= 10 && avg.ast >= 4) awards.push('ROY');
  }

  // MVP — 24+ PPG + good team, or pure dominance
  if (gp >= 65) {
    if (avg.pts >= 29 && teamWins >= 48) awards.push('MVP');
    else if (avg.pts >= 26 && teamWins >= 52) awards.push('MVP');
    else if (avg.pts >= 32) awards.push('MVP'); // unstoppable scorer
  }

  // DPOY
  if (gp >= 65 && (avg.stl >= 2.0 || avg.blk >= 2.8)) awards.push('DPOY');
  else if (gp >= 65 && avg.stl >= 1.7 && avg.blk >= 1.5) awards.push('DPOY');

  // Stat titles
  if (avg.pts >= 24 && gp >= 65) awards.push('Scoring Title');
  if (avg.ast >= 9.5 && gp >= 65) awards.push('Assists Title');
  if (avg.reb >= 11.0 && gp >= 65) awards.push('Rebounds Title');
  if (avg.stl >= 2.0 && gp >= 65) awards.push('Steals Title');

  // All-Star
  if (avg.pts >= 16 || avg.reb >= 9 || avg.ast >= 7) awards.push('All-Star');
  else if (avg.pts >= 12 && (avg.reb >= 6 || avg.ast >= 5)) awards.push('All-Star');

  // All-NBA
  if (avg.pts >= 24 && gp >= 65) awards.push('All-NBA 1st');
  else if (avg.pts >= 19 && gp >= 65) awards.push('All-NBA 2nd');
  else if (avg.pts >= 15 && gp >= 65) awards.push('All-NBA 3rd');

  // All-Defense
  if ((avg.stl >= 1.9 || avg.blk >= 2.1) && gp >= 65) awards.push('All-Defense 1st');
  else if ((avg.stl >= 1.5 || avg.blk >= 1.7) && gp >= 65) awards.push('All-Defense 2nd');

  // MIP — available from season 2 onwards, if big jump in ppg
  if (nbaSeasonsPlayed >= 1 && avg.pts >= 16 && gp >= 65) {
    if (Math.random() < 0.3) awards.push('MIP');
  }

  // Championship
  const champChance = teamWins >= 62 ? 0.45 : teamWins >= 55 ? 0.22 : teamWins >= 50 ? 0.10 : 0;
  if (Math.random() < champChance) {
    awards.push('Championship');
    if (avg.pts >= 22) awards.push('Finals MVP');
  }

  return awards;
}

// ── News / summary ────────────────────────────────────────────────────────────

export function buildSeasonNews(playerSeason, awards, standings, playerTeamId, playerName) {
  const news = [];
  const avg  = playerSeason.averages;
  const teamRecord = standings[playerTeamId];
  const yr   = `${playerSeason.season}–${playerSeason.season + 1}`;

  news.push({
    type: 'season_end',
    headline: `${playerName}: ${avg.pts} PPG · ${avg.reb} RPG · ${avg.ast} APG — Season Complete`,
    body: `${playerSeason.gamesPlayed} GP · ${playerSeason.fgPct}% FG · ${playerSeason.fg3Pct}% 3P · ${playerSeason.ftPct}% FT`,
    date: yr,
  });

  if (teamRecord) {
    const eastTeams = Object.entries(standings)
      .filter(([id]) => ['BOS','BKN','NYK','PHI','TOR','CHI','CLE','DET','IND','MIL',
                         'ATL','CHA','MIA','ORL','WAS'].includes(id))
      .sort((a, b) => b[1].wins - a[1].wins);
    const confTeamIds = eastTeams.map(([id]) => id);
    const inEast = confTeamIds.includes(playerTeamId);
    const confStandings = inEast ? eastTeams : Object.entries(standings)
      .filter(([id]) => !confTeamIds.includes(id)).sort((a, b) => b[1].wins - a[1].wins);
    const seed = confStandings.findIndex(([id]) => id === playerTeamId) + 1;
    news.push({
      type: 'team',
      headline: `Team finishes ${teamRecord.wins}–${teamRecord.losses} (${seed <= 8 ? `#${seed} seed` : 'Missed playoffs'})`,
      date: yr,
    });
  }

  if (playerSeason.bestGame?.pts >= 32) {
    news.push({
      type: 'best_game',
      headline: `Season high: ${playerSeason.bestGame.pts} PTS · ${playerSeason.bestGame.reb} REB · ${playerSeason.bestGame.ast} AST`,
      date: yr,
    });
  }

  awards.forEach(a => news.push({ type: 'award', headline: `AWARDED: ${a}`, date: yr }));

  if (playerSeason.injury) {
    news.push({
      type: 'injury',
      headline: `${playerSeason.injury.type} — ${playerSeason.injury.gamesMissed} games missed`,
      date: yr,
    });
  }

  return news;
}

// ── Single-game simulation with full box score ────────────────────────────────
// Returns a game result with player line, team box score, and opponent box score.
// Team/opp individual pts sum to the final team score so box scores are consistent.

export function simSingleGameWithBoxScore(player, team, opponent, role, season) {
  const mpg = clamp(gaussian(ROLE_MPG[role] ?? 20, 2.5), 5, 40);
  const oppStr = clamp(65 + gaussian(0, 12), 42, 96);

  // Player's game line — round STL/BLK to integers (single-game values must be whole numbers)
  const rawLine = simGameLine(player.attributes, player.position, role, mpg, oppStr, player.archetype);
  const playerLine = {
    ...rawLine,
    stl: Math.round(rawLine.stl),
    blk: Math.round(rawLine.blk),
  };

  // Team NPC lines
  const teamRoster = generateRoster(team, season);
  const teamNPCs = teamRoster.filter(p => p.isStarter || p.isStar).slice(0, 8);
  const teamNPCLines = teamNPCs.map((p) => {
    const pRole = p.isStar ? 'star' : p.isStarter ? 'starter' : 'rotation';
    const pMpg = p.isStar ? 30 : p.isStarter ? 24 : 14;
    const pPts = Math.max(0, Math.round(gaussian(p.overall * 0.24, 5)));
    const posReb = { PG: 2, SG: 3, SF: 5, PF: 7, C: 9 };
    const posAst = { PG: 5, SG: 2, SF: 2, PF: 1, C: 1 };
    const pReb = Math.max(0, Math.round(gaussian(posReb[p.pos] ?? 4, 2)));
    const pAst = Math.max(0, Math.round(gaussian(posAst[p.pos] ?? 2, 1.5)));
    const pFga = pPts > 0 ? Math.max(pPts > 0 ? 1 : 0, Math.round(pPts / 2.2)) : 0;
    const pFgm = Math.round(pFga * 0.44);
    return { name: p.name, pos: p.pos, pts: pPts, reb: pReb, ast: pAst,
             fgm: pFgm, fga: pFga, stl: Math.random() < 0.15 ? 1 : 0, blk: Math.random() < 0.10 ? 1 : 0 };
  });

  // Total team pts = player + NPCs + bench contribution
  const npcTotal = teamNPCLines.reduce((s, p) => s + p.pts, 0);
  const benchPts = Math.round(gaussian(14, 4));
  const rawTeamScore = playerLine.pts + npcTotal + benchPts;

  // Opponent score based on strength differential
  const strengthDiff = (team.strength - opponent.strength) * 0.2;
  const baseScore = clamp(rawTeamScore, 85, 130);
  let oppScore = Math.round(clamp(baseScore - strengthDiff + gaussian(0, 8), 78, 140));
  let teamScore = rawTeamScore;

  // Resolve ties with OT
  let isOT = false;
  if (teamScore === oppScore) {
    isOT = true;
    teamScore += Math.round(gaussian(5, 3));
    oppScore  += Math.round(gaussian(5, 3));
    if (teamScore === oppScore) (Math.random() > 0.5 ? teamScore++ : oppScore++);
  }

  // Opponent box score
  const oppRoster = generateRoster(opponent, season);
  const oppLines = oppRoster.filter(p => p.isStarter || p.isStar).slice(0, 8).map(p => {
    const pPts = Math.max(0, Math.round(gaussian(p.overall * 0.22, 5)));
    const posReb = { PG: 2, SG: 3, SF: 5, PF: 7, C: 9 };
    const posAst = { PG: 5, SG: 2, SF: 2, PF: 1, C: 1 };
    return { name: p.name, pos: p.pos, pts: pPts,
             reb: Math.max(0, Math.round(gaussian(posReb[p.pos] ?? 4, 1.8))),
             ast: Math.max(0, Math.round(gaussian(posAst[p.pos] ?? 2, 1.2))) };
  });

  return {
    playerLine, teamNPCLines, oppLines,
    teamScore, oppScore,
    won: teamScore > oppScore, isOT,
    opponent: opponent.id, opponentName: `${opponent.city} ${opponent.name}`,
    teamName: `${team.city} ${team.name}`,
  };
}
