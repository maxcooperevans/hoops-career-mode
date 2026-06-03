import { gaussian, clamp } from './playerEngine.js';
import { POSITION_WEIGHTS } from '../data/constants.js';
import { TEAMS } from '../data/teams.js';

// ── Schedule generation ──────────────────────────────────────────────────────

export function generateSchedule(playerTeamId, season) {
  const opponents = TEAMS.filter(t => t.id !== playerTeamId);
  const schedule = [];

  opponents.forEach(opp => {
    const count = Math.random() < 0.45 ? 3 : 2;
    for (let g = 0; g < count; g++) {
      schedule.push({ opponent: opp, isHome: Math.random() > 0.5 });
    }
  });

  while (schedule.length > 82) schedule.splice(Math.floor(Math.random() * schedule.length), 1);
  while (schedule.length < 82) {
    const opp = opponents[Math.floor(Math.random() * opponents.length)];
    schedule.push({ opponent: opp, isHome: Math.random() > 0.5 });
  }

  schedule.sort(() => Math.random() - 0.5);
  return schedule.map((g, i) => ({ ...g, gameNumber: i + 1 }));
}

// ── Per-quarter simulation ───────────────────────────────────────────────────

const ROLE_PPG_Q = { franchise: 6.5, star: 5.0, starter: 3.2, sixthman: 2.4, rotation: 1.4, bench: 0.8 };
const ROLE_REB_Q = { franchise: 1.7, star: 1.4, starter: 1.0, sixthman: 0.8, rotation: 0.6, bench: 0.4 };
const ROLE_AST_Q = { franchise: 1.4, star: 1.0, starter: 0.7, sixthman: 0.5, rotation: 0.4, bench: 0.2 };

const FOCUS_MODS = {
  balanced:    { pts: 1.00, reb: 1.00, ast: 1.00, stl: 1.00, blk: 1.00 },
  scoring:     { pts: 1.18, reb: 0.90, ast: 0.85, stl: 0.95, blk: 0.95 },
  playmaking:  { pts: 0.85, reb: 0.92, ast: 1.25, stl: 1.05, blk: 0.90 },
  defense:     { pts: 0.82, reb: 1.05, ast: 0.92, stl: 1.30, blk: 1.30 },
  rebounding:  { pts: 0.88, reb: 1.25, ast: 0.88, stl: 0.95, blk: 1.10 },
};

function simQuarter(attrs, position, role, oppStrength, focus = 'balanced', bonusMultiplier = 1.0) {
  const pw  = POSITION_WEIGHTS[position];
  const mod = FOCUS_MODS[focus] ?? FOCUS_MODS.balanced;
  const oppF = 1 + (50 - oppStrength) * 0.005;

  const scoringRating =
    attrs.insideScoring * pw.scoring.inside +
    attrs.midRange      * pw.scoring.mid +
    attrs.threePoint    * pw.scoring.three;

  const t = clamp((scoringRating - 40) / 59, 0, 1);

  const basePts = ROLE_PPG_Q[role] * (0.6 + 0.8 * t) * oppF * mod.pts * bonusMultiplier;
  const baseReb = ROLE_REB_Q[role] * clamp(0.5 + attrs.rebounding / 99, 0.4, 1.5) * pw.rebBonus * mod.reb;
  const baseAst = ROLE_AST_Q[role] * clamp(0.5 + attrs.passingVision / 99, 0.4, 1.5) * pw.astBonus * mod.ast;
  const baseStl = (attrs.perimeterDefense / 99) * 0.5 * mod.stl;
  const baseBlk = Math.pow(attrs.interiorDefense / 99, 1.2) * pw.blkBonus * 0.6 * mod.blk;

  const pts = Math.max(0, Math.round(gaussian(basePts, basePts * 0.45)));
  const fgPct = clamp(0.42 + (scoringRating - 65) * 0.0025, 0.33, 0.62);
  const fga  = pts > 0 ? Math.max(1, Math.round(pts / (fgPct * 2.0 + 0.4))) : 0;
  const fgm  = Math.min(fga, Math.round(fga * fgPct));
  const fg3Rate = pw.scoring.three * Math.min(0.8, attrs.threePoint / 99 * 0.85);
  const fg3a = Math.round(fga * fg3Rate);
  const fg3pct = clamp(0.34 + (attrs.threePoint - 65) * 0.003, 0.28, 0.48);
  const fg3m  = Math.min(fg3a, Math.round(fg3a * fg3pct));
  const ftaQ  = Math.round(fga * 0.20 * Math.pow(clamp(attrs.athleticism, 30, 99) / 80, 1.5));
  const ftpct = clamp(0.68 + (attrs.freeThrow - 65) * 0.004, 0.52, 0.95);
  let ftm = 0; for (let i = 0; i < ftaQ; i++) if (Math.random() < ftpct) ftm++;
  const actualPts = 2 * Math.max(0, fgm - fg3m) + 3 * fg3m + ftm;

  return {
    pts: actualPts,
    reb: Math.max(0, Math.round(gaussian(baseReb, Math.max(0.3, baseReb * 0.4)))),
    ast: Math.max(0, Math.round(gaussian(baseAst, Math.max(0.2, baseAst * 0.45)))),
    stl: Math.max(0, Math.round(gaussian(baseStl, 0.3) * 10) / 10),
    blk: Math.max(0, Math.round(gaussian(baseBlk, 0.2) * 10) / 10),
    fgm, fga, fg3m, fg3a, ftm, fta: ftaQ,
  };
}

// ── Play-by-play text ────────────────────────────────────────────────────────

const PLAY_LINES = {
  score2:  ['drives to the hoop — GOOD!', 'pull-up mid-range — IN!', 'cuts baseline — LAYUP!',
             'post move — reverse lay-in!', 'catch-and-shoot from the elbow — YES!'],
  score3:  ['STEPS BACK — THREE! BANG!', 'catch from the corner — SPLASHES!', 'pull-up from deep — GOOD!'],
  and1:    ['drives — CONTACT — AND-ONE!', 'finishes through the foul!'],
  assist:  ['dishes for the open look — GOOD!', 'no-look pass — easy finish!', 'thread-the-needle — basket!'],
  rebound: ['crashes the glass!', 'box-out — offensive board!', 'tips it up — second chance!'],
  steal:   ['STRIPS THE BALL — fastbreak!', 'picks the pocket — break!'],
  block:   ['REJECTED!', 'SWAT at the rim!'],
  miss:    ['mid-ranger — off the back iron', 'three — rattles out', 'drive — blocked'],
  turnover:['TURNOVER — bad pass', 'fumble — turnover', 'stripped off the dribble'],
  foul:    ['draws the foul — going to the line', 'contact — free throws coming'],
};

function randLine(type) {
  const a = PLAY_LINES[type]; return a[Math.floor(Math.random() * a.length)];
}

export function generatePlayLog(playerName, qStats) {
  const log = [];
  let ptsLeft = qStats.pts;
  let astLeft = qStats.ast;
  let rebLeft = qStats.reb;

  while (ptsLeft > 0 || astLeft > 0 || rebLeft > 0) {
    const r = Math.random();
    if (ptsLeft >= 3 && r < 0.3) {
      log.push(`${playerName} ${randLine('score3')} +3`);
      ptsLeft -= 3;
    } else if (ptsLeft >= 2 && r < 0.7) {
      const andOne = Math.random() < 0.12;
      log.push(`${playerName} ${randLine(andOne ? 'and1' : 'score2')}${andOne ? ' +3' : ' +2'}`);
      ptsLeft -= andOne ? 3 : 2;
    } else if (astLeft > 0) {
      log.push(`${playerName} ${randLine('assist')}`);
      astLeft--;
    } else if (rebLeft > 0) {
      log.push(`${playerName} ${randLine('rebound')}`);
      rebLeft--;
    } else break;
    if (log.length > 8) break;
  }

  if (qStats.stl >= 1) log.push(`${playerName} ${randLine('steal')}`);
  if (qStats.blk >= 1) log.push(`${playerName} ${randLine('block')}`);
  if (log.length === 0) log.push(`${playerName} ${randLine('miss')}`);

  return log.slice(0, 6);
}

// ── In-game decisions ────────────────────────────────────────────────────────

export const GAME_DECISIONS = {
  halftime_hot: {
    id: 'halftime_hot', title: 'ON FIRE AT THE BREAK',
    body: "You've got it going — double figures in the first half. The bench is buzzing.",
    choices: [
      { label: 'Keep attacking — stay aggressive', outcome: 'You keep the foot on the gas.', bonusQ3: 1.25, bonusQ4: 1.10, effect: { clutch: +1 } },
      { label: 'Involve teammates — share the ball', outcome: 'You set others up in the second half.', bonusQ3: 0.80, bonusQ4: 0.90, astBonus: 3, effect: { chemistry: +5 } },
    ],
  },
  halftime_cold: {
    id: 'halftime_cold', title: 'STRUGGLING AT THE HALF',
    body: "The shots aren't falling. The coach pulls you aside at halftime.",
    choices: [
      { label: 'Simplify — take what the defense gives', outcome: 'You play within yourself. The shots come.', bonusQ3: 1.15, bonusQ4: 1.10, effect: {} },
      { label: 'Stay aggressive — trust your game', outcome: 'High-variance second half.', bonusQ3: 0.90, bonusQ4: 1.35, effect: { clutch: +2 } },
      { label: 'Become a facilitator', outcome: 'Low scoring, but the team lifts.', bonusQ3: 0.65, bonusQ4: 0.70, astBonus: 4, effect: { coachTrust: +4 } },
    ],
  },
  halftime_standard: {
    id: 'halftime_standard', title: 'HALFTIME',
    body: "Coaches are drawing up the second-half game plan. What are you telling yourself?",
    choices: [
      { label: 'Take over — I want this', outcome: 'You come out of the tunnel fired up.', bonusQ3: 1.20, bonusQ4: 1.20, effect: {} },
      { label: 'Play the game plan', outcome: 'Steady, reliable second half.', bonusQ3: 1.05, bonusQ4: 1.05, effect: { coachTrust: +2 } },
      { label: 'Lock in on defense', outcome: 'Quiet offensive night, disruptive defensively.', bonusQ3: 0.80, bonusQ4: 0.85, stlBonus: 1.5, effect: {} },
    ],
  },
  clutch: {
    id: 'clutch', title: 'CRUNCH TIME',
    body: "Final three minutes. The game is there to be won.",
    choices: [
      { label: 'Call for the ball — I\'m closing this', outcome: 'You put the team on your back.', bonusQ4: 1.45, effect: { clutch: +2 } },
      { label: 'Play through the system', outcome: 'Composed, efficient finish.', bonusQ4: 1.10, astBonus: 1, effect: { coachTrust: +3 } },
      { label: 'Lock down on D and let others score', outcome: 'Defensive stopper in the fourth.', bonusQ4: 0.60, stlBonus: 1, effect: {} },
    ],
  },
  blowout_win: {
    id: 'blowout_win', title: 'COMFORTABLE LEAD',
    body: "Up big going into the fourth. How do you play out the game?",
    choices: [
      { label: 'Stay aggressive — chase the stats', outcome: 'You put up big numbers.', bonusQ4: 1.20, effect: { coachTrust: -2 } },
      { label: 'Rest up — protect the body', outcome: 'Sit the fourth. Durability up.', bonusQ4: 0.30, effect: { durability: +1 } },
      { label: 'Develop chemistry — feed teammates', outcome: 'Team loves you for it.', bonusQ4: 0.65, astBonus: 2, effect: { chemistry: +6 } },
    ],
  },
  blowout_loss: {
    id: 'blowout_loss', title: 'ROUGH NIGHT',
    body: "Down big. Season on the line? No. But your response matters.",
    choices: [
      { label: 'Fight to the final whistle', outcome: 'Put up a fight. Respect earned.', bonusQ4: 1.30, effect: { coachTrust: +4 } },
      { label: 'Take smart shots — don\'t force it', outcome: 'Efficient in garbage time.', bonusQ4: 0.95, effect: { basketballIQ: +1 } },
    ],
  },
};

export function pickHalftimeDecision(halfPts) {
  if (halfPts >= 14) return GAME_DECISIONS.halftime_hot;
  if (halfPts <= 4)  return GAME_DECISIONS.halftime_cold;
  return GAME_DECISIONS.halftime_standard;
}

export function pickQ4Decision(scoreDiff) {
  if (Math.abs(scoreDiff) <= 8) return GAME_DECISIONS.clutch;
  if (scoreDiff >= 15)           return GAME_DECISIONS.blowout_win;
  if (scoreDiff <= -15)          return GAME_DECISIONS.blowout_loss;
  return null;
}

// ── Full live game simulation ─────────────────────────────────────────────────

export function simulateLiveGame(player, team, opponent, role, focus = 'balanced') {
  const mpgData = { franchise: 35, star: 32, starter: 27, sixthman: 22, rotation: 16, bench: 9 };
  const mpg = clamp(gaussian(mpgData[role] ?? 20, 2.5), 5, 42);

  const quarters = [];
  for (let q = 0; q < 4; q++) {
    quarters.push(simQuarter(player.attributes, player.position, role, opponent.strength, focus));
  }

  // Team score
  const strengthDiff = (team.strength - opponent.strength) * 0.18;
  const homeAdv = 2;
  const base = 100 + gaussian(0, 7);
  const teamScore = Math.round(clamp(base + strengthDiff + homeAdv + gaussian(0, 5), 78, 145));
  const oppScore  = Math.round(clamp(base - strengthDiff + gaussian(0, 5), 78, 145));

  return { quarters, teamScore, oppScore, opponent, team, role, focus, mpg };
}

// Apply decision modifiers to Q3/Q4 quarters
export function applyDecisionToQuarters(quarters, choice, halfPts) {
  const q = [...quarters];
  const b3 = choice.bonusQ3 ?? 1.0;
  const b4 = choice.bonusQ4 ?? 1.0;

  ['pts','reb','ast','stl','blk','fgm','fga','fg3m','fg3a','ftm','fta'].forEach(k => {
    if (q[2]) q[2] = { ...q[2], [k]: Math.max(0, Math.round((q[2][k] ?? 0) * b3)) };
    if (q[3]) q[3] = { ...q[3], [k]: Math.max(0, Math.round((q[3][k] ?? 0) * b4)) };
  });

  if (choice.astBonus && q[3]) q[3].ast = (q[3].ast ?? 0) + Math.round(choice.astBonus);
  if (choice.stlBonus && q[3]) q[3].stl = Math.round(((q[3].stl ?? 0) + choice.stlBonus) * 10) / 10;

  return q;
}

export function aggregateQuarters(quarters) {
  const keys = ['pts','reb','ast','stl','blk','fgm','fga','fg3m','fg3a','ftm','fta'];
  const total = Object.fromEntries(keys.map(k => [k, 0]));
  quarters.forEach(q => keys.forEach(k => { total[k] += q[k] ?? 0; }));
  return total;
}
