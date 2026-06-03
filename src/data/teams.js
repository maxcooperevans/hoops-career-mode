// All 30 NBA teams. Strength 50-99. Market 1-100. Culture = winning tradition.
export const TEAMS = [
  // ── EASTERN CONFERENCE ──────────────────────────────────
  // Atlantic
  { id: 'BOS', city: 'Boston',       name: 'Celtics',      conf: 'East', div: 'Atlantic', strength: 92, youth: 25, market: 88, culture: 95, arena: 'TD Garden' },
  { id: 'BKN', city: 'Brooklyn',     name: 'Nets',         conf: 'East', div: 'Atlantic', strength: 60, youth: 70, market: 95, culture: 40, arena: 'Barclays Center' },
  { id: 'NYK', city: 'New York',     name: 'Knicks',       conf: 'East', div: 'Atlantic', strength: 82, youth: 40, market: 99, culture: 55, arena: 'Madison Square Garden' },
  { id: 'PHI', city: 'Philadelphia', name: '76ers',        conf: 'East', div: 'Atlantic', strength: 70, youth: 45, market: 85, culture: 60, arena: 'Wells Fargo Center' },
  { id: 'TOR', city: 'Toronto',      name: 'Raptors',      conf: 'East', div: 'Atlantic', strength: 63, youth: 65, market: 80, culture: 58, arena: 'Scotiabank Arena' },
  // Central
  { id: 'CHI', city: 'Chicago',      name: 'Bulls',        conf: 'East', div: 'Central',  strength: 65, youth: 50, market: 90, culture: 70, arena: 'United Center' },
  { id: 'CLE', city: 'Cleveland',    name: 'Cavaliers',    conf: 'East', div: 'Central',  strength: 84, youth: 30, market: 72, culture: 68, arena: 'Rocket Mortgage Fieldhouse' },
  { id: 'DET', city: 'Detroit',      name: 'Pistons',      conf: 'East', div: 'Central',  strength: 63, youth: 80, market: 70, culture: 58, arena: 'Little Caesars Arena' },
  { id: 'IND', city: 'Indiana',      name: 'Pacers',       conf: 'East', div: 'Central',  strength: 78, youth: 35, market: 65, culture: 65, arena: 'Gainbridge Fieldhouse' },
  { id: 'MIL', city: 'Milwaukee',    name: 'Bucks',        conf: 'East', div: 'Central',  strength: 76, youth: 40, market: 68, culture: 75, arena: 'Fiserv Forum' },
  // Southeast
  { id: 'ATL', city: 'Atlanta',      name: 'Hawks',        conf: 'East', div: 'Southeast', strength: 67, youth: 50, market: 78, culture: 48, arena: 'State Farm Arena' },
  { id: 'CHA', city: 'Charlotte',    name: 'Hornets',      conf: 'East', div: 'Southeast', strength: 58, youth: 70, market: 62, culture: 42, arena: 'Spectrum Center' },
  { id: 'MIA', city: 'Miami',        name: 'Heat',         conf: 'East', div: 'Southeast', strength: 72, youth: 35, market: 88, culture: 85, arena: 'Kaseya Center' },
  { id: 'ORL', city: 'Orlando',      name: 'Magic',        conf: 'East', div: 'Southeast', strength: 76, youth: 25, market: 68, culture: 52, arena: 'Kia Center' },
  { id: 'WAS', city: 'Washington',   name: 'Wizards',      conf: 'East', div: 'Southeast', strength: 57, youth: 75, market: 82, culture: 40, arena: 'Capital One Arena' },
  // ── WESTERN CONFERENCE ─────────────────────────────────
  // Northwest
  { id: 'DEN', city: 'Denver',       name: 'Nuggets',      conf: 'West', div: 'Northwest', strength: 87, youth: 28, market: 72, culture: 80, arena: 'Ball Arena' },
  { id: 'MIN', city: 'Minnesota',    name: 'Timberwolves', conf: 'West', div: 'Northwest', strength: 82, youth: 30, market: 65, culture: 52, arena: 'Target Center' },
  { id: 'OKC', city: 'Oklahoma City',name: 'Thunder',      conf: 'West', div: 'Northwest', strength: 89, youth: 20, market: 60, culture: 78, arena: 'Paycom Center' },
  { id: 'POR', city: 'Portland',     name: 'Trail Blazers',conf: 'West', div: 'Northwest', strength: 60, youth: 75, market: 66, culture: 60, arena: 'Moda Center' },
  { id: 'UTA', city: 'Utah',         name: 'Jazz',         conf: 'West', div: 'Northwest', strength: 61, youth: 72, market: 60, culture: 62, arena: 'Delta Center' },
  // Pacific
  { id: 'GSW', city: 'Golden State', name: 'Warriors',     conf: 'West', div: 'Pacific',   strength: 79, youth: 45, market: 95, culture: 90, arena: 'Chase Center' },
  { id: 'LAC', city: 'LA',          name: 'Clippers',     conf: 'West', div: 'Pacific',   strength: 74, youth: 45, market: 95, culture: 62, arena: 'Intuit Dome' },
  { id: 'LAL', city: 'Los Angeles',  name: 'Lakers',       conf: 'West', div: 'Pacific',   strength: 76, youth: 40, market: 99, culture: 95, arena: 'Crypto.com Arena' },
  { id: 'PHX', city: 'Phoenix',      name: 'Suns',         conf: 'West', div: 'Pacific',   strength: 73, youth: 42, market: 80, culture: 65, arena: 'Footprint Center' },
  { id: 'SAC', city: 'Sacramento',   name: 'Kings',        conf: 'West', div: 'Pacific',   strength: 70, youth: 45, market: 70, culture: 48, arena: 'Golden 1 Center' },
  // Southwest
  { id: 'DAL', city: 'Dallas',       name: 'Mavericks',    conf: 'West', div: 'Southwest', strength: 80, youth: 38, market: 82, culture: 72, arena: 'American Airlines Center' },
  { id: 'HOU', city: 'Houston',      name: 'Rockets',      conf: 'West', div: 'Southwest', strength: 72, youth: 20, market: 85, culture: 65, arena: 'Toyota Center' },
  { id: 'MEM', city: 'Memphis',      name: 'Grizzlies',    conf: 'West', div: 'Southwest', strength: 74, youth: 35, market: 62, culture: 68, arena: 'FedExForum' },
  { id: 'NOP', city: 'New Orleans',  name: 'Pelicans',     conf: 'West', div: 'Southwest', strength: 68, youth: 45, market: 68, culture: 55, arena: 'Smoothie King Center' },
  { id: 'SAS', city: 'San Antonio',  name: 'Spurs',        conf: 'West', div: 'Southwest', strength: 63, youth: 80, market: 72, culture: 92, arena: 'AT&T Center' },
];

export const TEAM_MAP = Object.fromEntries(TEAMS.map(t => [t.id, t]));

// Player name pools for roster generation
const FIRST_NAMES = [
  'James','Kevin','Stephen','LeBron','Giannis','Luka','Nikola','Joel','Jayson','Damian',
  'Donovan','Trae','Zion','Ja','De\'Aaron','Anthony','Bam','Karl-Anthony','Rudy','Paul',
  'Chris','Bradley','Khris','Pascal','Draymond','Klay','Andrew','Miles','OG','Shai',
  'Chet','Jalen','Jordan','Tyler','Cole','Tre','Cameron','Aaron','Scottie','Franz',
  'Evan','Max','Victor','Wembanyama','Brandon','Alperen','Tyrese','Devin','Kyrie','Jimmy',
  'Lauri','RJ','Immanuel','Bogdan','Caris','Spencer','Malcolm','Norman','Gary','Jrue',
  'Markelle','Tobias','Mikal','Royce','Robert','Wendell','Daniel','PJ','Brook','Nicolas',
  'Maxi','Precious','Thaddeus','Kentavious','Josh','Bojan','Mo','Nic','Doug','Darius',
  'Derrick','Marcus','Alec','Ricky','Isaiah','Lonzo','Dejounte','Dwight','Nerlens','Bismack',
];

const LAST_NAMES = [
  'Johnson','Williams','Brown','Smith','Jones','Davis','Miller','Wilson','Moore','Taylor',
  'Jackson','White','Harris','Martin','Thompson','Lee','Martinez','Robinson','Clark','Lewis',
  'Young','Walker','Hall','Allen','King','Wright','Scott','Green','Baker','Adams',
  'Hill','Nelson','Mitchell','Carter','Perez','Roberts','Turner','Phillips','Campbell','Parker',
  'Thomas','Jefferson','Barnes','Bridges','Porter','Beal','Murray','Simons','Ingram','Ball',
  'Knox','DiVincenzo','Maxey','Nance','Love','Wiggins','Poole','Kuminga','Moody','Curry',
  'Durant','Harden','Irving','Leonard','George','Westbrook','Paul','Lillard','Mitchell','Fox',
  'Young','Doncic','Embiid','Jokic','Giannis','Tatum','Booker','LaVine','Towns','Gobert',
];

function rng(seed, min, max) {
  const x = Math.sin(seed) * 10000;
  const t = x - Math.floor(x);
  return Math.floor(t * (max - min + 1)) + min;
}

function generateName(seed) {
  const fi = rng(seed * 7, 0, FIRST_NAMES.length - 1);
  const li = rng(seed * 13, 0, LAST_NAMES.length - 1);
  return `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
}

export function generateRoster(team, season = 2025) {
  // Vary the star position by team so the league has diverse scoring stars (not all PGs).
  // The first 5 slots are the starting 5; first 2 are the stars.
  // We rotate which 2 positions are starred based on a team-seed.
  const ALL_LINEUPS = [
    ['PG','SG','SF','PF','C', 'SG','PF','PG','C','SF', 'PG','SG','SF'],
    ['SG','SF','PG','C','PF', 'PG','SF','SG','PF','C', 'SG','PF','PG'],
    ['SF','PG','SG','PF','C', 'PF','PG','C','SG','SF', 'PG','SF','SG'],
    ['PG','C','SF','SG','PF', 'SG','C','PG','SF','PF', 'PG','SG','C'],
    ['SG','PF','PG','SF','C', 'PG','PF','SG','C','SF', 'SF','PG','SG'],
  ];
  const lineupIdx = (team.id.charCodeAt(0) + team.id.charCodeAt(1)) % ALL_LINEUPS.length;
  const positions = ALL_LINEUPS[lineupIdx];
  const roster = [];

  positions.forEach((pos, i) => {
    const seed = team.id.charCodeAt(0) * 100 + team.id.charCodeAt(1) * 10 + i + season;
    const isStarter = i < 5;
    const isStar = i < 2;

    const baseStrength = isStar ? team.strength + rng(seed, -3, 8) : isStarter ? team.strength - rng(seed, 5, 18) : team.strength - rng(seed, 20, 35);
    const age = isStar ? rng(seed + 1, 23, 30) : isStarter ? rng(seed + 2, 22, 32) : rng(seed + 3, 20, 36);
    const overall = Math.max(40, Math.min(97, baseStrength + rng(seed + 5, -5, 5)));

    roster.push({
      id: `${team.id}_${i}_${season}`,
      name: generateName(seed),
      pos,
      age,
      overall,
      isStarter,
      isStar,
      contract: {
        salary: isStar ? rng(seed + 9, 25_000_000, 45_000_000) : isStarter ? rng(seed + 9, 8_000_000, 20_000_000) : rng(seed + 9, 1_200_000, 6_000_000),
        years: rng(seed + 10, 1, isStar ? 5 : 3),
      },
    });
  });

  return roster;
}
