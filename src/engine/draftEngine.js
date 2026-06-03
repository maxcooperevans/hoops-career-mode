import { gaussian, clamp, computeOverall, generatePotential } from './playerEngine.js';
import { ROOKIE_SCALE, VETERAN_MINIMUM, POSITIONS, ATTRIBUTES } from '../data/constants.js';
import { ARCHETYPES, ARCHETYPE_NAMES } from '../data/archetypes.js';
import { TEAMS } from '../data/teams.js';

const FIRST = ['Jalen','Marcus','Anthony','Tyler','Cade','Evan','Paolo','AJ','Scottie',
  'Jabari','Keyonte','Ausar','Brandon','Gradey','Cason','Dereck','Ryan','Blake','Walker',
  'Mark','Darius','Devin','Jordan','Chris','Isaiah','Malik','Tre','Collin','Immanuel','Cam'];
const LAST = ['Smith','Johnson','Williams','Brown','Davis','Wilson','Jones','Taylor','Moore',
  'Thompson','White','Martinez','Harris','Clark','Lewis','Robinson','Walker','Young','Hall',
  'Green','King','Scott','Adams','Nelson','Baker','Hill','Mitchell','Carter','Perez','Turner'];

function rnd(n) { return FIRST[Math.floor(Math.random() * FIRST.length)] + ' ' + LAST[Math.floor(Math.random() * LAST.length)]; }

export function generateDraftClass(year, playerStock) {
  const prospects = [];

  // Generate 59 other prospects
  for (let i = 0; i < 59; i++) {
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    const archName = ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)];
    const arch = ARCHETYPES[archName];
    const overall = Math.round(clamp(gaussian(58, 12), 38, 85));
    const age = Math.floor(gaussian(20.5, 1.2));

    prospects.push({
      id: `draft_${year}_${i}`,
      name: rnd(),
      position: pos,
      age: Math.max(18, Math.min(24, age)),
      overall,
      archetype: archName,
      stock: overall + gaussian(0, 8),
      isPlayer: false,
    });
  }

  // Insert real player at their stock position with noise
  const playerEntry = {
    id: 'player',
    name: '(You)',
    stock: playerStock + gaussian(0, 3),
    isPlayer: true,
  };
  prospects.push(playerEntry);

  // Sort by stock descending = draft order
  prospects.sort((a, b) => b.stock - a.stock);

  // Assign pick numbers (top 14 randomised slightly for lottery effect)
  const lottery = prospects.slice(0, 14).sort(() => Math.random() - 0.5);
  const rest = prospects.slice(14);
  const ordered = [...lottery, ...rest];
  ordered.forEach((p, i) => { p.pick = i + 1; });

  return ordered;
}

export function runDraftSimulation(draftClass, playerTeamPreference) {
  // Find the player's pick
  const playerEntry = draftClass.find(p => p.isPlayer);
  const pick = playerEntry?.pick ?? 60;

  // Determine landing team
  // Bad teams pick first → weak teams get top picks
  const teamsSortedByNeed = [...TEAMS].sort((a, b) => a.strength - b.strength);

  let landingTeam;
  if (pick <= TEAMS.length) {
    const teamIdx = Math.min(pick - 1, TEAMS.length - 1);
    landingTeam = teamsSortedByNeed[teamIdx];
  } else {
    landingTeam = TEAMS[Math.floor(Math.random() * TEAMS.length)];
  }

  const salary = ROOKIE_SCALE[Math.min(pick, 60)] ?? VETERAN_MINIMUM;

  return { pick, team: landingTeam, salary };
}

export function stockToPickRange(stock) {
  if (stock >= 90) return 'Top 3 Pick';
  if (stock >= 82) return 'Top 5 Pick';
  if (stock >= 74) return 'Lottery Pick (Top 14)';
  if (stock >= 64) return 'Late Lottery (11–20)';
  if (stock >= 54) return 'Late 1st Round';
  if (stock >= 42) return 'Second Round';
  if (stock >= 30) return 'Undrafted (Training Camp)';
  return 'Undrafted';
}

export function generateContractOffers(player, currentTeam) {
  const recentSeason = player.nbaSeasons[player.nbaSeasons.length - 1];
  const ppg = recentSeason?.averages?.pts ?? 8;
  const rpg = recentSeason?.averages?.reb ?? 4;
  const apg = recentSeason?.averages?.ast ?? 2;
  const prodScore = ppg * 0.6 + rpg * 0.2 + apg * 0.2;

  const yearsService = player.nbaSeasonsPlayed;
  const baseSalary = yearsService >= 7 && prodScore >= 18 ? 35_000_000
    : yearsService >= 4 && prodScore >= 14 ? 22_000_000
    : yearsService >= 4 && prodScore >= 10 ? 14_000_000
    : prodScore >= 8 ? 8_000_000
    : 3_000_000;

  // Exclude current team from random offers — it's added separately as re-sign
  const otherTeams = TEAMS.filter(t => !currentTeam || t.id !== currentTeam.id);
  const shuffledTeams = [...otherTeams].sort(() => Math.random() - 0.5).slice(0, 4);
  const offers = shuffledTeams.map(team => {
    const marketPremium = team.market / 100 * 0.15 + 1;
    const needFactor = (100 - team.strength) / 100 * 0.25 + 1;
    const salary = Math.round(baseSalary * marketPremium * needFactor * (0.88 + Math.random() * 0.24));
    const years = Math.floor(1 + Math.random() * 4);
    return {
      teamId: team.id,
      team,
      salary: Math.min(50_000_000, salary),
      years,
      role: salary > 20_000_000 ? 'Featured Role' : salary > 10_000_000 ? 'Starting Role' : 'Rotation',
    };
  });

  // Always include re-sign with current team
  if (currentTeam) {
    const loyaltyBonus = 1.08;
    const salary = Math.round(baseSalary * loyaltyBonus);
    const years = 4;
    offers.unshift({
      teamId: currentTeam.id,
      team: currentTeam,
      salary: Math.min(50_000_000, salary),
      years,
      role: ppg >= 18 ? 'Franchise Cornerstone' : 'Featured Role',
      isResign: true,
    });
  }

  return offers.sort((a, b) => b.salary - a.salary);
}
