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

// stockToPickRange consolidated into draftEngine.js — import from there.

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

// ── 2K-style physical attribute modifiers ──────────────────────────────────
// Applied once at character creation — physical measurements shift attribute
// ceilings/floors the same way NBA 2K does in MyPLAYER Builder.
// Baselines: height 79" (6'7"), weight 215 lbs, wingspan = height + 2.5".

export function applyPhysicalModifiers(attrs, heightIn, weightLbs, wingspanIn) {
  const hDiff = heightIn  - 79;          // inches above/below 6'7"
  const wDiff = (weightLbs - 215) / 10;  // units of 10 lbs above/below 215
  const sDiff = (wingspanIn - heightIn) - 2.5; // wingspan reach above average

  const mod = { ...attrs };

  // Height: taller = better rebounding/interior/inside; slower/worse handle
  mod.rebounding      = clamp(Math.round(attrs.rebounding      + hDiff * 2.2),  25, 99);
  mod.interiorDefense = clamp(Math.round(attrs.interiorDefense + hDiff * 1.5),  25, 99);
  mod.insideScoring   = clamp(Math.round(attrs.insideScoring   + hDiff * 1.0),  25, 99);
  mod.strength        = clamp(Math.round(attrs.strength        + hDiff * 0.6),  25, 99);
  mod.athleticism     = clamp(Math.round(attrs.athleticism     - hDiff * 1.6),  25, 99);
  mod.ballHandling    = clamp(Math.round(attrs.ballHandling    - hDiff * 1.0),  25, 99);
  mod.stamina         = clamp(Math.round(attrs.stamina         - hDiff * 0.7),  25, 99);

  // Weight: heavier = more strength/post; less speed/stamina
  mod.strength        = clamp(Math.round(mod.strength        + wDiff * 2.5),  25, 99);
  mod.interiorDefense = clamp(Math.round(mod.interiorDefense + wDiff * 1.0),  25, 99);
  mod.insideScoring   = clamp(Math.round(mod.insideScoring   + wDiff * 0.5),  25, 99);
  mod.athleticism     = clamp(Math.round(mod.athleticism     - wDiff * 1.4),  25, 99);
  mod.stamina         = clamp(Math.round(mod.stamina         - wDiff * 1.8),  25, 99);
  mod.ballHandling    = clamp(Math.round(mod.ballHandling    - wDiff * 0.6),  25, 99);

  // Wingspan: longer reach = better defense/blocking; negligible speed penalty
  mod.interiorDefense  = clamp(Math.round(mod.interiorDefense  + sDiff * 2.0), 25, 99);
  mod.perimeterDefense = clamp(Math.round(attrs.perimeterDefense + sDiff * 1.5), 25, 99);
  // Wingspan also affects blkBonus in the engine via heightBonus/wingspanBonus
  // We record it on the player so the bonus carries through sim

  return mod;
}

// Describe the physical modifier impact for display in character creation
export function describePhysicalModifiers(heightIn, weightLbs, wingspanIn) {
  const hDiff = heightIn  - 79;
  const wDiff = (weightLbs - 215) / 10;
  const sDiff = (wingspanIn - heightIn) - 2.5;
  const rows = [];

  const add = (attr, delta) => { if (Math.abs(delta) >= 0.5) rows.push({ attr, delta: Math.round(delta) }); };

  add('Rebounding',       hDiff * 2.2);
  add('Interior Defense', hDiff * 1.5 + wDiff * 1.0 + sDiff * 2.0);
  add('Inside Scoring',   hDiff * 1.0 + wDiff * 0.5);
  add('Strength',         hDiff * 0.6 + wDiff * 2.5);
  add('Athleticism',     -(hDiff * 1.6 + wDiff * 1.4));
  add('Ball Handling',   -(hDiff * 1.0 + wDiff * 0.6));
  add('Stamina',         -(hDiff * 0.7 + wDiff * 1.8));
  add('Perimeter Defense', sDiff * 1.5);

  return rows.filter(r => r.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// Check if player should retire — probabilistic model driven by age, overall, and role.
// Hard cap at 40 is a backstop only; weaker/declining players bow out earlier.
export function shouldRetire(player) {
  const age = player.age;
  if (age < 30) return false;
  if (age >= 40) return true;

  const overall = computeOverall(player.attributes, player.position);

  // Pull role from most recent NBA season (rotation/bench players retire sooner)
  const lastSeason = player.nbaSeasons?.[player.nbaSeasons.length - 1];
  const role = lastSeason?.role ?? 'starter';

  // Base probability: near-zero at 30, accelerating sharply after 33
  // ~0% @30, ~2% @32, ~5% @34, ~10% @36, ~19% @38, ~26% @39
  const yearsOver30 = age - 30;
  const ageProb = 0.015 * yearsOver30
                + 0.008 * Math.pow(Math.max(0, yearsOver30 - 3), 2);

  // Overall modifier: high-overall players stay; declining players retire sooner
  // ovrMod < 1 for elite (OVR > 68), > 1 for declining (OVR < 68)
  const ovrMod = clamp(1.0 + (68 - overall) * 0.03, 0.4, 2.5);

  // Role modifier: bench/rotation players exit much faster
  const ROLE_MOD = {
    franchise: 0.4, star: 0.6, starter: 0.9,
    sixthman: 1.1, rotation: 1.5, bench: 2.0,
  };
  const roleMod = ROLE_MOD[role] ?? 1.0;

  const prob = Math.min(0.88, ageProb * ovrMod * roleMod);
  return Math.random() < prob;
}

// Compute injury risk for a season (0–1 probability).
// Flat floor (INJ_FLOOR) means even elite durability carries a small annual risk (~5%).
// Curve is softer than the old version so high-durability builds still get hurt occasionally.
const INJ_FLOOR    = 0.05;  // minimum annual risk even at durability 99
const INJ_DUR_RATE = 0.003; // +0.3% per durability point below 100
const INJ_AGE_RATE = 0.05;  // +5% relative risk per year above age 30
export function injuryRisk(player) {
  const durability = player.attributes.durability ?? 70;
  const age = player.age;
  const durBase = INJ_FLOOR + (100 - durability) * INJ_DUR_RATE;
  const ageFactor = age > 30 ? 1 + (age - 30) * INJ_AGE_RATE : 1.0;
  return clamp(durBase * ageFactor, 0.03, 0.55);
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
