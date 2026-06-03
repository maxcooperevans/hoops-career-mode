import { gaussian, clamp, computeOverall } from './playerEngine.js';
import { POSITION_WEIGHTS, ATTRIBUTES } from '../data/constants.js';
import { computeDraftStock } from './playerEngine.js';

export function simCollegeSeason(player, college, seasonYear) {
  const overall = computeOverall(player.attributes, player.position);
  const pw = POSITION_WEIGHTS[player.position];

  // Playing time from college PT rating (higher = more PT)
  const ptFactor = college.pt / 100;
  const mpg = clamp(gaussian(ptFactor * 36, 3), 10, 38);
  const minFactor = mpg / 36;

  // College is weaker competition, scale opp strength down
  const oppStrength = 45 + gaussian(0, 10);
  const oppFactor = 1 + (50 - oppStrength) * 0.008;

  const scoringRating =
    player.attributes.insideScoring * pw.scoring.inside +
    player.attributes.midRange * pw.scoring.mid +
    player.attributes.threePoint * pw.scoring.three;

  const usage = 0.22; // college usage is somewhat lower
  const basePts = (scoringRating / 99) * usage * 95 * minFactor * oppFactor;
  const pts = Math.max(0, Math.round(gaussian(basePts, basePts * 0.30) * 10) / 10);

  const fgPct = clamp(0.44 + (scoringRating - 65) * 0.002, 0.34, 0.60);

  const rebBase = (player.attributes.rebounding / 99) * pw.rebBonus * 8 * minFactor;
  const reb = Math.max(0, Math.round(gaussian(rebBase, rebBase * 0.3 + 0.5) * 10) / 10);

  const astBase = (player.attributes.passingVision / 99) * pw.astBonus * 6.5 * minFactor;
  const ast = Math.max(0, Math.round(gaussian(astBase, astBase * 0.35 + 0.5) * 10) / 10);

  const stl = Math.max(0, Math.round(gaussian((player.attributes.perimeterDefense / 99) * 1.6 * minFactor, 0.3) * 10) / 10);
  const blk = Math.max(0, Math.round(gaussian((player.attributes.interiorDefense / 99) * pw.blkBonus * 1.8 * minFactor, 0.25) * 10) / 10);

  // Attribute development from college dev rating
  const devBoost = college.dev / 100;
  const attrGains = {};
  for (const attr of ATTRIBUTES) {
    const base = 0.8 + devBoost * 1.4;
    const gain = Math.max(0, gaussian(base, 0.4));
    attrGains[attr] = Math.round(gain * 10) / 10;
  }

  // College record (simple)
  const teamQuality = college.prestige / 100;
  const wins = Math.round(clamp(gaussian(teamQuality * 35, 4), 10, 35));
  const losses = 35 - wins;

  const gamesPlayed = 32 + Math.round(gaussian(0, 3));

  return {
    season: seasonYear,
    college: college.id,
    gamesPlayed: Math.max(20, gamesPlayed),
    pts,
    reb,
    ast,
    stl,
    blk,
    fgPct,
    mpg: Math.round(mpg * 10) / 10,
    teamRecord: `${wins}–${losses}`,
    attrGains,
  };
}

export function simCombine(player) {
  // NBA Combine tests — boosts or hurts stock
  const strengthTest = gaussian(player.attributes.strength / 99, 0.1);
  const agilityTest = gaussian(player.attributes.athleticism / 99, 0.1);
  const shootingTest = gaussian(
    (player.attributes.threePoint + player.attributes.midRange) / 2 / 99,
    0.1
  );

  const stockDelta = (strengthTest + agilityTest + shootingTest - 1.5) * 12;

  const results = [];
  if (strengthTest > 0.7) results.push('Strength & conditioning: ELITE');
  else if (strengthTest > 0.55) results.push('Strength & conditioning: SOLID');
  else results.push('Strength & conditioning: NEEDS WORK');

  if (agilityTest > 0.72) results.push('Agility / lane drill: ELITE');
  else if (agilityTest > 0.56) results.push('Agility / lane drill: SOLID');
  else results.push('Agility / lane drill: NEEDS WORK');

  if (shootingTest > 0.70) results.push('Shooting workout: ELITE');
  else if (shootingTest > 0.55) results.push('Shooting workout: SOLID');
  else results.push('Shooting workout: NEEDS WORK');

  return { stockDelta: Math.round(stockDelta * 10) / 10, results };
}
