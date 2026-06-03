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
const ROLE_BASE_AST = { franchise: 5.5, star: 4.0, starter: 2.8, sixthman: 2.0, rotation: 1.4, bench: 0.8 };

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

function simGameLine(attrs, position, role, mpg, oppStrength) {
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
  const ROLE_FLOOR_PPG = { franchise: 18, star: 14, starter: 9, sixthman: 7, rotation: 5, bench: 2.5 };
  const ROLE_CEIL_PPG  = { franchise: 42, star: 32, starter: 22, sixthman: 17, rotation: 14, bench: 9 };
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

  // Rebounds
  const rebMult = clamp(0.5 + 1.0 * (attrs.rebounding / 99), 0.4, 1.6) * pw.rebBonus;
  const rebBase = ROLE_BASE_REB[role] * rebMult * minFactor / 0.75;
  const reb = Math.max(0, sRound(gaussian(rebBase, Math.max(0.5, rebBase * 0.32))));

  // Assists
  const astMult = clamp(0.5 + 1.0 * (attrs.passingVision / 99), 0.4, 1.6) * pw.astBonus;
  const astBase = ROLE_BASE_AST[role] * astMult * minFactor / 0.75;
  const ast = Math.max(0, sRound(gaussian(astBase, Math.max(0.4, astBase * 0.38))));

  // Steals & Blocks
  const stlBase = (attrs.perimeterDefense / 99) * 2.0 * minFactor;
  const stl = Math.max(0, Math.round(gaussian(stlBase, 0.5) * 10) / 10);

  const blkBase = Math.pow(attrs.interiorDefense / 99, 1.2) * pw.blkBonus * 2.4 * minFactor;
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
    gameLines.push(simGameLine(player.attributes, player.position, role, mpg, oppStr));
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
    roster.forEach(npc => {
      const posW = POS_SCORING_ROLE[npc.pos] ?? { rebMult: 1, astMult: 1 };
      const ovr  = npc.overall;
      // Estimate role from isStarter / isStar flags
      const role = npc.isStar ? (ovr >= 85 ? 'franchise' : 'star')
                 : npc.isStarter ? 'starter'
                 : 'rotation';

      // Calibrated PPG: role sets the floor/ceiling, ovr is a ±30% modifier.
      // Realistic ranges: franchise 20-30, star 15-24, starter 10-17, rotation 5-10.
      const NPC_PPG_FLOOR = { franchise: 18, star: 14, starter: 9,  rotation: 4 };
      const NPC_PPG_CEIL  = { franchise: 30, star: 24, starter: 17, rotation: 10 };
      const ppgT = clamp((ovr - 55) / (97 - 55), 0, 1);
      const ppgBase = NPC_PPG_FLOOR[role] + ppgT * (NPC_PPG_CEIL[role] - NPC_PPG_FLOOR[role]);

      const ppg = Math.max(0, Math.round((ppgBase + gaussian(0, 1.5)) * 10) / 10);
      const rpg = Math.max(0, Math.round(
        (ROLE_BASE_REB[role] * posW.rebMult + gaussian(0, 0.8)) * 10) / 10);
      const apg = Math.max(0, Math.round(
        (ROLE_BASE_AST[role] * posW.astMult + gaussian(0, 0.5)) * 10) / 10);
      const spg = Math.max(0, Math.round(gaussian(0.8 + (ovr - 65) * 0.012, 0.25) * 10) / 10);
      const bpg = Math.max(0, Math.round(
        gaussian((npc.pos === 'C' ? 1.5 : npc.pos === 'PF' ? 0.8 : 0.3) + (ovr - 70) * 0.015, 0.25) * 10) / 10);
      const gp  = Math.min(82, Math.max(40, Math.round(gaussian(74, 6))));
      const fgp = Math.round(clamp(42 + (ovr - 70) * 0.2 + gaussian(0, 1.5), 32, 62) * 10) / 10;
      const fg3p = Math.round(clamp(33 + (ovr - 60) * 0.15 + gaussian(0, 2), 25, 47) * 10) / 10;

      leaguePlayers.push({ id: npc.id, name: npc.name, team: team.id, pos: npc.pos,
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
