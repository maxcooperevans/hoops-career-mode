// ─────────────────────────────────────────────
// TUNABLE CONSTANTS — adjust here to balance
// ─────────────────────────────────────────────

export const CREATION_POINTS = 230;
export const ATTR_MIN = 25;
export const ATTR_MAX_CREATION = 88; // global fallback cap (overridden per archetype below)

// ── Per-archetype attribute caps (2K-style) ───────────────────────────────────
// Each archetype has different ceilings reflecting their role.
// E.g. a Floor General can hit 96 Ball Handling but only 75 Three-Point.
// A Rim Protector peaks at 96 Interior Defense / Rebounding but can only reach 65 Three-Point.
export const ATTR_CAPS_BY_ARCHETYPE = {
  'Floor General': {
    insideScoring: 84, midRange: 88, threePoint: 88, freeThrow: 92,
    ballHandling: 96, passingVision: 96, perimeterDefense: 82, interiorDefense: 74,
    rebounding: 78, athleticism: 86, strength: 76, stamina: 88,
    basketballIQ: 96, durability: 88, clutch: 92,
  },
  'Slasher': {
    insideScoring: 96, midRange: 85, threePoint: 75, freeThrow: 86,
    ballHandling: 90, passingVision: 80, perimeterDefense: 80, interiorDefense: 80,
    rebounding: 84, athleticism: 96, strength: 86, stamina: 88,
    basketballIQ: 80, durability: 86, clutch: 88,
  },
  '3-and-D': {
    insideScoring: 80, midRange: 84, threePoint: 96, freeThrow: 88,
    ballHandling: 78, passingVision: 78, perimeterDefense: 96, interiorDefense: 82,
    rebounding: 82, athleticism: 86, strength: 80, stamina: 92,
    basketballIQ: 86, durability: 90, clutch: 82,
  },
  'Stretch Big': {
    insideScoring: 82, midRange: 92, threePoint: 92, freeThrow: 88,
    ballHandling: 72, passingVision: 78, perimeterDefense: 74, interiorDefense: 80,
    rebounding: 88, athleticism: 78, strength: 90, stamina: 82,
    basketballIQ: 86, durability: 86, clutch: 82,
  },
  'Rim Protector': {
    insideScoring: 86, midRange: 74, threePoint: 65, freeThrow: 78,
    ballHandling: 68, passingVision: 72, perimeterDefense: 78, interiorDefense: 96,
    rebounding: 96, athleticism: 84, strength: 96, stamina: 86,
    basketballIQ: 80, durability: 88, clutch: 80,
  },
  'Two-Way Wing': {
    insideScoring: 88, midRange: 88, threePoint: 82, freeThrow: 86,
    ballHandling: 82, passingVision: 82, perimeterDefense: 92, interiorDefense: 86,
    rebounding: 86, athleticism: 90, strength: 86, stamina: 88,
    basketballIQ: 88, durability: 90, clutch: 88,
  },
};

// Average NBA height by position (inches) — used for height-based cap adjustments
export const POSITION_AVG_HEIGHT = { PG: 75, SG: 77, SF: 79, PF: 81, C: 83 };

// Per-inch height modifier to attribute caps (above/below position average)
// Taller = better interior/rebounding caps, worse guard/speed caps
export const HEIGHT_CAP_MODS = {
  insideScoring:    +1.5,
  interiorDefense:  +2.0,
  rebounding:       +2.0,
  strength:         +1.0,
  athleticism:      -1.5,
  ballHandling:     -1.5,
  threePoint:       -1.0,
  passingVision:    -0.5,
};

export const ATTRIBUTES = [
  'insideScoring',
  'midRange',
  'threePoint',
  'freeThrow',
  'ballHandling',
  'passingVision',
  'perimeterDefense',
  'interiorDefense',
  'rebounding',
  'athleticism',
  'strength',
  'stamina',
  'basketballIQ',
  'durability',
  'clutch',
];

export const ATTR_LABELS = {
  insideScoring:    'Inside Scoring',
  midRange:         'Mid-Range',
  threePoint:       'Three-Point',
  freeThrow:        'Free Throw',
  ballHandling:     'Ball Handling',
  passingVision:    'Passing / Vision',
  perimeterDefense: 'Perimeter Defense',
  interiorDefense:  'Interior Defense',
  rebounding:       'Rebounding',
  athleticism:      'Athleticism',
  strength:         'Strength',
  stamina:          'Stamina',
  basketballIQ:     'Basketball IQ',
  durability:       'Durability',
  clutch:           'Clutch',
};

export const ATTR_GROUPS = {
  Offense:  ['insideScoring', 'midRange', 'threePoint', 'freeThrow'],
  Playmaking: ['ballHandling', 'passingVision'],
  Defense:  ['perimeterDefense', 'interiorDefense'],
  Physical: ['rebounding', 'athleticism', 'strength', 'stamina'],
  Mental:   ['basketballIQ', 'durability', 'clutch'],
};

// Salary cap in USD
export const SALARY_CAP = 140_000_000;
export const LUXURY_TAX = 170_000_000;

// Rookie scale by pick slot (USD, Year 1)
export const ROOKIE_SCALE = [
  0, // placeholder so index=pick
  12_000_000, 10_500_000, 9_800_000, 9_100_000, 8_500_000,
  8_000_000,  7_600_000,  7_200_000,  6_900_000,  6_600_000,
  6_300_000,  5_900_000,  5_600_000,  5_300_000,  5_000_000,
  4_700_000,  4_400_000,  4_100_000,  3_800_000,  3_500_000,
  3_300_000,  3_100_000,  2_900_000,  2_700_000,  2_500_000,
  2_300_000,  2_100_000,  1_900_000,  1_800_000,  1_700_000,
  // picks 31-60 (second round)
  1_000_000, 950_000, 900_000, 870_000, 840_000,
  810_000, 780_000, 750_000, 720_000, 690_000,
  670_000, 650_000, 630_000, 610_000, 590_000,
  570_000, 550_000, 530_000, 510_000, 490_000,
  480_000, 470_000, 460_000, 450_000, 440_000,
  430_000, 420_000, 410_000, 400_000, 390_000,
];

export const VETERAN_MINIMUM = 1_200_000;

// Age curve: [age] = growth multiplier for attributes
// Generous growth curve; slower early decline so veterans stay contributing.
export const AGING_CURVE = {
  18: +4.0, 19: +3.5, 20: +3.0, 21: +2.5, 22: +2.2,
  23: +1.8, 24: +1.4, 25: +1.0, 26: +0.6, 27: +0.2,
  28:  0.0, 29:  0.0, 30: -0.1, 31: -0.3, 32: -0.6,
  33: -0.9, 34: -1.1, 35: -1.4, 36: -1.8, 37: -2.3,
  38: -2.9, 39: -3.5, 40: -4.5,
};

// Which attributes decline first (athleticism hits fastest; IQ/shooting last)
export const DECLINE_PRIORITY = {
  athleticism: 1.5,
  insideScoring: 1.1,
  perimeterDefense: 1.0,
  interiorDefense: 0.95,
  rebounding: 0.95,
  strength: 0.85,
  stamina: 0.85,
  midRange: 0.60,
  threePoint: 0.50,
  ballHandling: 0.55,
  passingVision: 0.40,
  basketballIQ: 0.20,
  freeThrow: 0.20,
  durability: 0.75,
  clutch: 0.35,
};

// Per-position stat multipliers
// SG weights updated to credit inside scoring (modern slashing guards).
// PF weights updated to credit 3PT (stretch bigs).
export const POSITION_WEIGHTS = {
  PG: {
    scoring: { inside: 0.20, mid: 0.34, three: 0.46 },
    rebBonus: 0.50, astBonus: 1.10, blkBonus: 0.25,  // was 1.65 — caused 18+ APG
    paceUsage: 1.05,
  },
  SG: {
    scoring: { inside: 0.32, mid: 0.38, three: 0.30 },
    rebBonus: 0.62, astBonus: 0.88, blkBonus: 0.38,
    paceUsage: 1.02,
  },
  SF: {
    scoring: { inside: 0.32, mid: 0.38, three: 0.30 },
    rebBonus: 0.92, astBonus: 0.76, blkBonus: 0.62,
    paceUsage: 1.00,
  },
  PF: {
    scoring: { inside: 0.46, mid: 0.32, three: 0.22 },
    rebBonus: 1.22, astBonus: 0.46, blkBonus: 0.92,
    paceUsage: 0.97,
  },
  C: {
    scoring: { inside: 0.68, mid: 0.22, three: 0.10 },
    rebBonus: 1.55, astBonus: 0.30, blkBonus: 1.50,
    paceUsage: 0.93,
  },
};

export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

// Seasons to simulate per career
export const MAX_CAREER_SEASONS = 20;

// NBA regular season games
export const SEASON_GAMES = 82;

// Playoff rounds
export const PLAYOFF_ROUNDS = 4;

// College schools
export const COLLEGES = [
  { id: 'duke',     name: 'Duke Blue Devils',        prestige: 95, pt: 68, dev: 88 },
  { id: 'kentucky', name: 'Kentucky Wildcats',        prestige: 93, pt: 65, dev: 82 },
  { id: 'kansas',   name: 'Kansas Jayhawks',          prestige: 90, pt: 72, dev: 83 },
  { id: 'unc',      name: 'North Carolina Tar Heels', prestige: 90, pt: 73, dev: 81 },
  { id: 'gonzaga',  name: 'Gonzaga Bulldogs',         prestige: 86, pt: 80, dev: 86 },
  { id: 'villanova',name: 'Villanova Wildcats',       prestige: 82, pt: 78, dev: 80 },
  { id: 'michigan', name: 'Michigan Wolverines',      prestige: 79, pt: 80, dev: 79 },
  { id: 'oregon',   name: 'Oregon Ducks',             prestige: 74, pt: 84, dev: 76 },
  { id: 'memphis',  name: 'Memphis Tigers',           prestige: 70, pt: 88, dev: 74 },
  { id: 'wichita',  name: 'Wichita State Shockers',   prestige: 55, pt: 96, dev: 66 },
];

export const AWARDS = [
  'ROY', 'MVP', 'DPOY', '6MOY', 'MIP', 'Finals MVP',
  'All-Star', 'All-NBA 1st', 'All-NBA 2nd', 'All-NBA 3rd',
  'All-Defense 1st', 'All-Defense 2nd',
  'Scoring Title', 'Assists Title', 'Rebounds Title', 'Steals Title',
  'Championship',
];
