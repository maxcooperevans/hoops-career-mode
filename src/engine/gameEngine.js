import { gaussian, clamp } from './playerEngine.js';
import { POSITION_WEIGHTS } from '../data/constants.js';
import { TEAMS, generateRoster } from '../data/teams.js';

// ── Schedule ─────────────────────────────────────────────────────────────────

export function generateSchedule(playerTeamId, season) {
  const opponents = TEAMS.filter(t => t.id !== playerTeamId);
  const schedule = [];
  opponents.forEach(opp => {
    const count = Math.random() < 0.45 ? 3 : 2;
    for (let g = 0; g < count; g++) schedule.push({ opponent: opp, isHome: Math.random() > 0.5 });
  });
  while (schedule.length > 82) schedule.splice(Math.floor(Math.random() * schedule.length), 1);
  while (schedule.length < 82) {
    const opp = opponents[Math.floor(Math.random() * opponents.length)];
    schedule.push({ opponent: opp, isHome: Math.random() > 0.5 });
  }
  schedule.sort(() => Math.random() - 0.5);
  return schedule.map((g, i) => ({ ...g, gameNumber: i + 1 }));
}

// ── Focus modifiers ───────────────────────────────────────────────────────────

const FOCUS_MODS = {
  balanced:   { pts: 1.00, reb: 1.00, ast: 1.00, stl: 1.00, blk: 1.00 },
  scoring:    { pts: 1.18, reb: 0.90, ast: 0.85, stl: 0.95, blk: 0.95 },
  playmaking: { pts: 0.85, reb: 0.92, ast: 1.25, stl: 1.05, blk: 0.90 },
  defense:    { pts: 0.82, reb: 1.05, ast: 0.92, stl: 1.30, blk: 1.30 },
  rebounding: { pts: 0.88, reb: 1.25, ast: 0.88, stl: 0.95, blk: 1.10 },
};

const ROLE_PPG_Q = { franchise: 6.5, star: 5.0, starter: 3.2, sixthman: 2.4, rotation: 1.4, bench: 0.8 };
const ROLE_REB_Q = { franchise: 1.7, star: 1.4, starter: 1.0, sixthman: 0.8, rotation: 0.6, bench: 0.4 };
const ROLE_AST_Q = { franchise: 1.4, star: 1.0, starter: 0.7, sixthman: 0.5, rotation: 0.4, bench: 0.2 };

// ── Per-quarter simulation (player) ──────────────────────────────────────────

export function simQuarter(attrs, position, role, oppStrength, focus = 'balanced', bonusMult = 1.0) {
  const pw  = POSITION_WEIGHTS[position];
  const mod = FOCUS_MODS[focus] ?? FOCUS_MODS.balanced;
  const oppF = 1 + (50 - oppStrength) * 0.005;
  const scoringRating =
    attrs.insideScoring * pw.scoring.inside +
    attrs.midRange      * pw.scoring.mid +
    attrs.threePoint    * pw.scoring.three;
  const t = clamp((scoringRating - 40) / 59, 0, 1);

  const basePts = ROLE_PPG_Q[role] * (0.6 + 0.8 * t) * oppF * mod.pts * bonusMult;
  const baseReb = ROLE_REB_Q[role] * clamp(0.5 + attrs.rebounding / 99, 0.4, 1.5) * pw.rebBonus * mod.reb;
  const baseAst = ROLE_AST_Q[role] * clamp(0.5 + attrs.passingVision / 99, 0.4, 1.5) * pw.astBonus * mod.ast;

  const rawPts = Math.max(0, gaussian(basePts, basePts * 0.45));
  const fgPct  = clamp(0.42 + (scoringRating - 65) * 0.0025, 0.33, 0.62);
  const fga    = rawPts > 0 ? Math.max(1, Math.round(rawPts / (fgPct * 2.0 + 0.4))) : 0;
  const fgm    = Math.min(fga, Math.round(fga * fgPct));
  const fg3Rate = pw.scoring.three * Math.min(0.8, attrs.threePoint / 99 * 0.85);
  const fg3a   = Math.round(fga * fg3Rate);
  const fg3pct = clamp(0.34 + (attrs.threePoint - 65) * 0.003, 0.28, 0.48);
  const fg3m   = Math.min(fg3a, Math.round(fg3a * fg3pct));
  const fg2m   = Math.max(0, fgm - fg3m);
  const ftaQ   = Math.round(fga * 0.20 * Math.pow(clamp(attrs.athleticism, 30, 99) / 80, 1.5));
  const ftpct  = clamp(0.68 + (attrs.freeThrow - 65) * 0.004, 0.52, 0.95);
  let ftm = 0; for (let i = 0; i < ftaQ; i++) if (Math.random() < ftpct) ftm++;
  const pts = 2 * fg2m + 3 * fg3m + ftm;

  // Single-game stats must be whole numbers
  const reb = Math.max(0, Math.round(gaussian(baseReb, Math.max(0.5, baseReb * 0.4))));
  const ast = Math.max(0, Math.round(gaussian(baseAst, Math.max(0.3, baseAst * 0.45))));
  // Steals and blocks are rare events per quarter — Bernoulli trials
  const stlProb = (attrs.perimeterDefense / 99) * 0.40 * mod.stl;
  const blkProb = Math.pow(attrs.interiorDefense / 99, 1.2) * pw.blkBonus * 0.35 * mod.blk;
  const stl = Math.random() < stlProb ? 1 : 0;
  const blk = Math.random() < blkProb ? 1 : 0;
  const tov = Math.random() < (0.12 * bonusMult) ? 1 : 0;

  return { pts, reb, ast, stl, blk, tov, fgm, fga, fg3m, fg3a, ftm, fta: ftaQ };
}

// ── Opponent team box score ───────────────────────────────────────────────────

export function simOpponentRoster(opponent, season) {
  const roster = generateRoster(opponent, season);
  return roster.map(p => {
    const ppgBase = p.isStar ? 22 + (p.overall - 80) * 0.3
                  : p.isStarter ? 13 + (p.overall - 70) * 0.25
                  : 5 + (p.overall - 55) * 0.15;
    const ppg  = Math.max(0, Math.round(gaussian(ppgBase, 3) * 10) / 10);
    const rebB = p.pos === 'C' ? 9 : p.pos === 'PF' ? 7 : p.pos === 'SF' ? 5 : 3;
    const astB = p.pos === 'PG' ? 7 : p.pos === 'SG' ? 3 : 2;
    return {
      id: p.id, name: p.name, pos: p.pos,
      isStarter: p.isStarter, isStar: p.isStar,
      overall: p.overall,
      ppg, rpg: Math.max(0, Math.round(gaussian(rebB, 2) * 10) / 10),
      apg: Math.max(0, Math.round(gaussian(astB, 1.5) * 10) / 10),
    };
  });
}

export function simOpponentQuarter(oppRoster) {
  // Distribute quarter stats among starters, weighted by ppg
  const active = oppRoster.filter(p => p.isStarter || p.isStar).slice(0, 8);
  const lines = active.map(p => {
    const qPts = Math.max(0, Math.round(gaussian(p.ppg / 4, p.ppg / 6)));
    const qReb = Math.max(0, Math.round(gaussian(p.rpg / 4, 1)));
    const qAst = Math.max(0, Math.round(gaussian(p.apg / 4, 0.6)));
    const qStl = Math.random() < 0.15 ? 1 : 0;
    const qBlk = Math.random() < 0.10 ? 1 : 0;
    return { ...p, qPts, qReb, qAst, qStl, qBlk };
  });
  return lines;
}

// ── NBA-style play-by-play ────────────────────────────────────────────────────

const SHOT_TYPES = ['driving layup', 'floater', 'pull-up jumper', 'catch-and-shoot', 'step-back', 'post fade', 'turnaround jumper'];
const THREE_TYPES = ['corner three', 'pull-up three', 'step-back three', 'catch-and-shoot three'];
const MISS_TYPES = ['jumper off the rim', 'layup blocked', 'three rattles out', 'mid-range clanked'];

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function formatTime(secondsLeft) {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function generateDetailedPlayLog(playerName, teamId, oppRoster, qStats, quarter) {
  const plays = [];
  let timeLeft = 720; // 12 minutes in seconds
  let playerPtsLog = 0;

  // We know the quarter totals — generate individual plays to hit those totals
  let ptsLeft  = qStats.pts;
  let rebLeft  = qStats.reb;
  let astLeft  = qStats.ast;
  let stlLeft  = qStats.stl;
  let blkLeft  = qStats.blk;

  // Sprinkle in opponent plays between player plays
  const oppActive = oppRoster.filter(p => p.isStarter || p.isStar).slice(0, 5);

  const addPlay = (teamLabel, text, pts = 0) => {
    plays.push({ time: `Q${quarter} ${formatTime(timeLeft)}`, team: teamLabel, text, pts });
    timeLeft -= Math.floor(Math.random() * 25 + 10);
    if (timeLeft < 0) timeLeft = 0;
  };

  // Generate plays until budget is consumed
  let iterations = 0;
  while ((ptsLeft > 0 || rebLeft > 0 || astLeft > 0 || stlLeft > 0 || blkLeft > 0) && iterations < 40) {
    iterations++;
    const r = Math.random();

    if (stlLeft > 0 && r < 0.12) {
      const opp = randFrom(oppActive);
      addPlay(teamId, `${playerName} STEAL (${opp?.name ?? 'opponent'})`);
      stlLeft--;
    } else if (blkLeft > 0 && r < 0.10) {
      const opp = randFrom(oppActive);
      addPlay(teamId, `${playerName} BLOCK (${opp?.name ?? 'opponent'})`);
      blkLeft--;
    } else if (astLeft > 0 && ptsLeft <= 0 && r < 0.5) {
      const teammate = 'teammate';
      addPlay(teamId, `${playerName} AST → ${teammate} layup — GOOD`);
      astLeft--;
    } else if (ptsLeft >= 3 && r < 0.30) {
      const shot = randFrom(THREE_TYPES);
      playerPtsLog += 3; ptsLeft -= 3;
      if (astLeft > 0 && r < 0.15) {
        addPlay(teamId, `${playerName} ${shot} — GOOD ✦ (${playerPtsLog} PTS)`);
        astLeft = Math.max(0, astLeft - 1);
      } else {
        addPlay(teamId, `${playerName} ${shot} — GOOD ✦ (${playerPtsLog} PTS)`, 3);
      }
    } else if (ptsLeft >= 2 && r < 0.65) {
      const shot = randFrom(SHOT_TYPES);
      const andOne = Math.random() < 0.10;
      const scored = andOne ? 3 : 2;
      playerPtsLog += scored; ptsLeft -= scored;
      addPlay(teamId, `${playerName} ${shot}${andOne ? ' — AND-ONE!' : ' — GOOD'} (${playerPtsLog} PTS)`, scored);
    } else if (rebLeft > 0) {
      addPlay(teamId, `${playerName} ${Math.random() < 0.4 ? 'offensive' : 'defensive'} rebound`);
      rebLeft--;
    } else {
      // Miss + opponent play
      addPlay(teamId, `${playerName} ${randFrom(MISS_TYPES)}`);
      if (oppActive.length > 0) {
        const opp = randFrom(oppActive);
        const oppPts = Math.random() < 0.3 ? 3 : 2;
        addPlay(`OPP`, `${opp.name} ${randFrom(oppPts === 3 ? THREE_TYPES : SHOT_TYPES)} — GOOD (${oppPts} PTS)`, -oppPts);
      }
    }

    // Occasional opponent scoring plays between player plays
    if (Math.random() < 0.3 && oppActive.length > 0) {
      const opp = randFrom(oppActive);
      const oppPts = Math.random() < 0.25 ? 3 : 2;
      addPlay('OPP', `${opp.name} ${randFrom(oppPts === 3 ? THREE_TYPES : SHOT_TYPES)} — GOOD (${oppPts} PTS)`, -oppPts);
    }
  }

  return plays.slice(0, 14); // max 14 plays per quarter shown
}

// ── In-game decisions (much more variety) ─────────────────────────────────────

export const GAME_DECISIONS = [
  // HALFTIME decisions
  {
    id: 'half_hot', triggers: 'halftime', condition: (pts) => pts >= 14,
    title: 'HALF-TIME — ON FIRE',
    body: () => `You've got it going — ${Math.floor(Math.random()*5)+14} points on efficient shooting at the half.`,
    choices: [
      { label: 'Stay aggressive — keep the foot down', bonusQ3: 1.25, bonusQ4: 1.10, astBonus: 0, effects: { clutch: 1 } },
      { label: 'Involve teammates — spread the wealth', bonusQ3: 0.80, bonusQ4: 0.90, astBonus: 3, effects: { chemistry: 5 } },
    ],
  },
  {
    id: 'half_cold', triggers: 'halftime', condition: (pts) => pts <= 4,
    title: 'HALF-TIME — OFF NIGHT',
    body: () => `The shots aren't dropping. Coach pulls you aside at the half.`,
    choices: [
      { label: 'Simplify — take what the defence gives', bonusQ3: 1.15, bonusQ4: 1.10, effects: {} },
      { label: 'Stay aggressive — trust the process', bonusQ3: 0.90, bonusQ4: 1.40, effects: { clutch: 2 } },
      { label: 'Become a pure facilitator this half', bonusQ3: 0.60, bonusQ4: 0.65, astBonus: 4, effects: { coachTrust: 4 } },
    ],
  },
  {
    id: 'half_down_big', triggers: 'halftime', condition: (pts, diff) => diff <= -12,
    title: 'HALF-TIME — DOWN BIG',
    body: () => `Down double-digits. The locker room is quiet. Something has to change.`,
    choices: [
      { label: 'Call for the ball — lead the comeback', bonusQ3: 1.35, bonusQ4: 1.35, effects: { clutch: 3 } },
      { label: 'Tighten up the defence first', bonusQ3: 0.85, bonusQ4: 1.10, stlBonus: 1, effects: {} },
      { label: 'Play for pride — next game mindset', bonusQ3: 0.95, bonusQ4: 0.95, effects: { coachTrust: 2 } },
    ],
  },
  {
    id: 'half_up_big', triggers: 'halftime', condition: (pts, diff) => diff >= 15,
    title: 'HALF-TIME — COMFORTABLE LEAD',
    body: () => `Up big. Coach wants to be careful about the team getting complacent.`,
    choices: [
      { label: 'Stay sharp — close it out properly', bonusQ3: 1.05, bonusQ4: 1.05, effects: { coachTrust: 3 } },
      { label: 'Rest now, come out hungry in Q4', bonusQ3: 0.65, bonusQ4: 1.25, effects: { durability: 1 } },
    ],
  },
  {
    id: 'half_standard', triggers: 'halftime', condition: () => true,
    title: 'HALF-TIME',
    body: () => `A tight game at the half. Both teams adjusting.`,
    choices: [
      { label: 'Take over — I want this win', bonusQ3: 1.20, bonusQ4: 1.20, effects: {} },
      { label: 'Run the game plan — stay disciplined', bonusQ3: 1.05, bonusQ4: 1.05, effects: { coachTrust: 3 } },
      { label: 'Lock in defensively', bonusQ3: 0.80, bonusQ4: 0.85, stlBonus: 1, effects: {} },
    ],
  },
  // Q4 decisions
  {
    id: 'clutch_close', triggers: 'q4', condition: (pts, diff) => Math.abs(diff) <= 6,
    title: 'CRUNCH TIME',
    body: () => `Final three minutes. One possession either way.`,
    choices: [
      { label: 'Call for the ball — I\'m closing this out', bonusQ4: 1.45, effects: { clutch: 2 } },
      { label: 'Read the defence — take what\'s there', bonusQ4: 1.10, astBonus: 1, effects: { coachTrust: 3 } },
      { label: 'Lock down on D — force overtime if needed', bonusQ4: 0.60, stlBonus: 1, effects: {} },
    ],
  },
  {
    id: 'q4_hot_hand', triggers: 'q4', condition: (pts) => pts >= 22,
    title: 'HOT HAND — Q4',
    body: () => `You've been unconscious all game. The team is feeding you every possession down the stretch.`,
    choices: [
      { label: 'Keep attacking — this is your moment', bonusQ4: 1.30, effects: { clutch: 2, brand: 3 } },
      { label: 'Distribute — help the team close', bonusQ4: 0.85, astBonus: 2, effects: { chemistry: 4 } },
    ],
  },
  {
    id: 'q4_blowout_win', triggers: 'q4', condition: (pts, diff) => diff >= 18,
    title: 'GAME IN HAND',
    body: () => `The result is essentially decided. How do you play out the final minutes?`,
    choices: [
      { label: 'Chase the personal stats', bonusQ4: 1.25, effects: { coachTrust: -2 } },
      { label: 'Rest up — protect the body', bonusQ4: 0.25, effects: { durability: 1 } },
      { label: 'Develop team chemistry', bonusQ4: 0.65, astBonus: 2, effects: { chemistry: 6 } },
    ],
  },
  {
    id: 'q4_blowout_loss', triggers: 'q4', condition: (pts, diff) => diff <= -18,
    title: 'TOUGH NIGHT',
    body: () => `You\'re getting blown out. A response is needed for next game.`,
    choices: [
      { label: 'Fight to the final buzzer', bonusQ4: 1.30, effects: { coachTrust: 4 } },
      { label: 'Play smart — save the body', bonusQ4: 0.90, effects: { basketballIQ: 1 } },
    ],
  },
  {
    id: 'q4_momentum_shift', triggers: 'q4', condition: (pts, diff) => diff > 6 && diff < 18,
    title: 'MOMENTUM BUILDING',
    body: () => `You\'ve got a lead and the crowd is into it. Maintain intensity or protect the advantage?`,
    choices: [
      { label: 'Push — extend the lead further', bonusQ4: 1.15, effects: {} },
      { label: 'Protect the lead — don\'t give it back', bonusQ4: 0.95, stlBonus: 1, effects: { coachTrust: 2 } },
    ],
  },
];

export function pickHalftimeDecision(halfPts, scoreDiff) {
  const matching = GAME_DECISIONS.filter(d => d.triggers === 'halftime' && d.condition(halfPts, scoreDiff));
  // Pick most specific (non-standard) first
  const specific = matching.filter(d => d.id !== 'half_standard');
  return specific.length > 0 ? specific[0] : matching[0] ?? GAME_DECISIONS.find(d => d.id === 'half_standard');
}

export function pickQ4Decision(scoreDiff, totalPts) {
  const matching = GAME_DECISIONS.filter(d => d.triggers === 'q4' && d.condition(totalPts, scoreDiff));
  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

// ── Full game simulation ───────────────────────────────────────────────────────

export function simulateLiveGame(player, team, opponent, role, focus = 'balanced', season = 2025) {
  const mpgData = { franchise: 35, star: 32, starter: 27, sixthman: 22, rotation: 16, bench: 9 };
  const mpg = clamp(gaussian(mpgData[role] ?? 20, 2.5), 5, 42);

  const quarters = [];
  for (let q = 0; q < 4; q++) {
    quarters.push(simQuarter(player.attributes, player.position, role, opponent.strength, focus));
  }

  const strengthDiff = (team.strength - opponent.strength) * 0.18;
  const homeAdv = 2;
  const base = 100 + gaussian(0, 7);
  let teamScore = Math.round(clamp(base + strengthDiff + homeAdv + gaussian(0, 5), 78, 145));
  let oppScore  = Math.round(clamp(base - strengthDiff + gaussian(0, 5), 78, 145));

  // Overtime if tied
  let isOT = false;
  if (teamScore === oppScore) {
    isOT = true;
    const otTeam = Math.round(gaussian(12, 4));
    const otOpp  = Math.round(gaussian(12, 4));
    teamScore += otTeam;
    oppScore  += otOpp;
    // If still tied after OT, one team wins by 1
    if (teamScore === oppScore) {
      if (Math.random() > 0.5) teamScore++; else oppScore++;
    }
    // Add OT quarter stats for player
    quarters.push(simQuarter(player.attributes, player.position, role, opponent.strength, focus, 0.6));
  }

  // Generate opponent roster for box score
  const oppRoster = simOpponentRoster(opponent, season);

  return { quarters, teamScore, oppScore, opponent, team, role, focus, mpg, isOT, oppRoster };
}

export function applyDecisionToQuarters(quarters, choice, halfPts) {
  const q = quarters.map(qr => ({ ...qr }));
  const b3 = choice.bonusQ3 ?? 1.0;
  const b4 = choice.bonusQ4 ?? 1.0;
  const keys = ['pts','reb','ast','fgm','fga','fg3m','fg3a','ftm','fta'];
  if (q[2]) keys.forEach(k => { q[2][k] = Math.max(0, Math.round((q[2][k] ?? 0) * b3)); });
  if (q[3]) keys.forEach(k => { q[3][k] = Math.max(0, Math.round((q[3][k] ?? 0) * b4)); });
  if (choice.astBonus && q[3]) q[3].ast = (q[3].ast ?? 0) + Math.round(choice.astBonus);
  if (choice.stlBonus && q[3]) q[3].stl = Math.min(3, (q[3].stl ?? 0) + 1);
  return q;
}

export function aggregateQuarters(quarters) {
  const keys = ['pts','reb','ast','stl','blk','tov','fgm','fga','fg3m','fg3a','ftm','fta'];
  const total = Object.fromEntries(keys.map(k => [k, 0]));
  quarters.forEach(q => keys.forEach(k => { total[k] += q[k] ?? 0; }));
  return total;
}
