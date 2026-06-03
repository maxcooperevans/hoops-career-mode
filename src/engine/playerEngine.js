import { ATTRIBUTES, POSITION_WEIGHTS, AGING_CURVE, DECLINE_PRIORITY, ATTR_MAX_CREATION } from '../data/constants.js';
import { ARCHETYPES } from '../data/archetypes.js';

// Seeded gaussian approximation (Box-Muller)
export function gaussian(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + n * std;
}

export function clamp(val, min = 0, max = 99) {
  return Math.max(min, Math.min(max, val));
}

// Compute overall rating for a player given their attributes and position
export function computeOverall(attributes, position) {
  const w = POSITION_WEIGHTS[position];
  const scoring = (
    attributes.insideScoring * w.scoring.inside +
    attributes.midRange      * w.scoring.mid +
    attributes.threePoint    * w.scoring.three
  );
  const playmaking = (attributes.ballHandling * 0.5 + attributes.passingVision * 0.5);
  const defense    = (attributes.perimeterDefense * 0.5 + attributes.interiorDefense * 0.5);
  const physical   = (attributes.athleticism * 0.35 + attributes.strength * 0.25 + attributes.rebounding * 0.3 * w.rebBonus + attributes.stamina * 0.1);
  const mental     = (attributes.basketballIQ * 0.5 + attributes.durability * 0.3 + attributes.clutch * 0.2);

  const raw = scoring * 0.32 + playmaking * 0.18 + defense * 0.22 + physical * 0.16 + mental * 0.12;
  return clamp(Math.round(raw), 30, 99);
}

// Compute draft stock score (0-100) → maps to draft pick range
export function computeDraftStock(player) {
  const overall = computeOverall(player.attributes, player.position);
  const physicalScore = (player.attributes.athleticism + player.attributes.strength) / 2;
  const potentialScore = Object.values(player.potential).reduce((a, b) => a + b, 0) / ATTRIBUTES.length;

  let stock = overall * 0.6 + physicalScore * 0.15 + potentialScore * 0.15;

  // Age modifier — younger is better for draft
  const ageBonus = Math.max(0, (22 - player.age) * 2);
  stock += ageBonus;

  // College performance
  if (player.collegeStats && player.collegeStats.length > 0) {
    const lastSeason = player.collegeStats[player.collegeStats.length - 1];
    const collegeProd = (lastSeason.pts * 0.4 + lastSeason.reb * 0.2 + lastSeason.ast * 0.2 + lastSeason.stl * 0.1 + lastSeason.blk * 0.1);
    const prestigeMultiplier = (player.college?.prestige ?? 70) / 100;
    stock += collegeProd * prestigeMultiplier * 0.8;
  }

  return clamp(Math.round(stock), 20, 100);
}

// Map stock score to projected pick range string
export function stockToPickRange(stock) {
  if (stock >= 88) return 'Top 5 Pick';
  if (stock >= 80) return 'Lottery Pick (Top 14)';
  if (stock >= 70) return 'Mid-1st Round (15–30)';
  if (stock >= 58) return 'Late 1st Round';
  if (stock >= 45) return 'Second Round';
  if (stock >= 32) return 'Undrafted (Training Camp)';
  return 'Undrafted';
}

// Generate hidden potential ceiling for each attribute
export function generatePotential(attributes, archetype) {
  const arch = ARCHETYPES[archetype];
  const potential = {};

  for (const attr of ATTRIBUTES) {
    const base = attributes[attr];
    let ceiling = base + gaussian(12, 5);
    // Archetype growth boosts add potential
    if (arch.growthBoosts.includes(attr)) ceiling += gaussian(8, 3);
    potential[attr] = clamp(Math.round(ceiling), base, 99);
  }

  return potential;
}

// Apply one offseason of aging + progression
export function applyOffseasonProgression(player, trainingFocus, minutesPlayed) {
  const age = player.age;
  const curve = AGING_CURVE[age] ?? -2.5;
  const newAttrs = { ...player.attributes };

  // Load factor: high minutes = more wear
  const loadFactor = minutesPlayed > 2200 ? 1.2 : minutesPlayed > 1600 ? 1.0 : 0.8;

  for (const attr of ATTRIBUTES) {
    const declRate = DECLINE_PRIORITY[attr] ?? 1.0;
    let delta = curve * declRate * loadFactor;

    // Training boost (chosen focus)
    if (trainingFocus.includes(attr)) {
      const distanceFromCeiling = player.potential[attr] - newAttrs[attr];
      const boost = Math.min(distanceFromCeiling, gaussian(3.5, 1.2));
      delta += Math.max(0, boost);
    }

    // Small random jitter
    delta += gaussian(0, 0.4);

    newAttrs[attr] = clamp(Math.round(newAttrs[attr] + delta), 25, player.potential[attr]);
  }

  return newAttrs;
}

// Compute height bonus for certain attributes (height in inches)
export function heightBonus(heightIn) {
  // Average NBA height ~79". Bonus/penalty per inch above/below
  return (heightIn - 79) * 0.8;
}

// Compute wingspan bonus (wingspan in inches, arm span)
export function wingspanBonus(wingspanIn, heightIn) {
  const differential = wingspanIn - heightIn;
  // Average differential ~2.5". Positive = long arms
  return (differential - 2.5) * 1.0;
}

// Check if player should retire
export function shouldRetire(player) {
  if (player.age < 33) return false;
  const overall = computeOverall(player.attributes, player.position);
  if (player.age >= 40) return true;
  if (player.age >= 38 && overall < 65) return true;
  if (player.age >= 36 && overall < 58) return Math.random() < 0.5;
  if (player.age >= 34 && overall < 52) return Math.random() < 0.25;
  return false;
}

// Compute injury risk for a season (0-1 probability)
export function injuryRisk(player) {
  const durability = player.attributes.durability;
  const age = player.age;
  const ageFactor = age > 30 ? 1 + (age - 30) * 0.08 : 1.0;
  const durFactor = (100 - durability) / 100;
  return clamp(durFactor * ageFactor * 0.35, 0, 0.6);
}

// Simulate an injury
export function generateInjury(player) {
  const rand = Math.random();
  if (rand < 0.4) return { type: 'Ankle Sprain', gamesMissed: Math.floor(gaussian(8, 3)), severeEffect: null };
  if (rand < 0.65) return { type: 'Knee Soreness', gamesMissed: Math.floor(gaussian(15, 5)), severeEffect: null };
  if (rand < 0.80) return { type: 'Hamstring Strain', gamesMissed: Math.floor(gaussian(22, 8)), severeEffect: null };
  if (rand < 0.90) return { type: 'Calf Strain', gamesMissed: Math.floor(gaussian(18, 6)), severeEffect: null };
  if (rand < 0.96) return { type: 'Knee Ligament', gamesMissed: Math.floor(gaussian(55, 12)), severeEffect: { athleticism: -3, durability: -2 } };
  return { type: 'Achilles Tear', gamesMissed: Math.floor(gaussian(75, 10)), severeEffect: { athleticism: -5, durability: -3, stamina: -2 } };
}
