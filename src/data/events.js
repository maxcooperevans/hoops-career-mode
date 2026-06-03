// Weighted event pool. weight = relative probability of firing.
// Effects are deliberately strong — every decision should feel meaningful.
export const EVENT_POOL = [
  // ── PERFORMANCE EVENTS ────────────────────────────────────────────────────
  {
    id: 'hot_streak', title: 'ON FIRE', phase: 'season', weight: 7,
    body: "You've scored 30+ in four straight games. The league is taking notice. Every article has your name.",
    choices: [
      { label: 'Stay locked in — no media', outcome: 'Pure basketball focus.',
        effects: { coachTrust: +6, attributes: { basketballIQ: +2 } } },
      { label: 'Embrace the moment publicly', outcome: 'Brand explodes overnight.',
        effects: { brand: +15, fanApproval: +10, coachTrust: -3 } },
    ],
  },
  {
    id: 'shooting_slump', title: 'DEEP IN A SLUMP', phase: 'season', weight: 7,
    body: "5-for-31 from the field over the last week. The benching rumours are starting. Coach is running film sessions.",
    choices: [
      { label: 'Work double sessions — fix it yourself', outcome: 'You grind your way out.',
        effects: { attributes: { midRange: +3, threePoint: +2 }, coachTrust: +5 } },
      { label: 'Simplify your game until it passes', outcome: 'Quiet but steady. The slump fades.',
        effects: { coachTrust: +3, attributes: { basketballIQ: +2 } } },
      { label: 'Call out the team\'s offensive system', outcome: 'Drama. The slump continues.',
        effects: { coachTrust: -12, chemistry: -10, personalityRep: -8 } },
    ],
  },
  {
    id: 'triple_double_run', title: 'STAT MACHINE', phase: 'season', weight: 5,
    body: "Three triple-doubles in five games. The highlight reels won't stop. The coach is building the offense around you.",
    choices: [
      { label: 'Lean into the playmaking role', outcome: 'Floor general status cemented.',
        effects: { attributes: { passingVision: +4, basketballIQ: +3 }, coachTrust: +8 } },
      { label: 'Balance scoring and assists equally', outcome: 'Complete player reputation grows.',
        effects: { brand: +8, fanApproval: +8, coachTrust: +5 } },
    ],
  },
  {
    id: 'defensive_challenge', title: 'LOCKED IN', phase: 'season', weight: 5,
    body: "You've held your last four opponents under their average. The coaching staff is raving about your effort on that end.",
    choices: [
      { label: 'Double down — become a two-way force', outcome: 'Your defensive reputation changes.',
        effects: { attributes: { perimeterDefense: +4, basketballIQ: +2 }, coachTrust: +8 } },
      { label: 'Use it to set up offense off turnovers', outcome: 'Transition points follow.',
        effects: { coachTrust: +5, fanApproval: +6 } },
    ],
  },
  {
    id: 'career_high_game', title: 'HISTORIC NIGHT', phase: 'season', weight: 4,
    body: "You just dropped a career-high. The arena gave you a standing ovation. Every sports outlet is running the clip.",
    choices: [
      { label: 'Thank your teammates first in the post-game', outcome: 'Locker room hero.',
        effects: { chemistry: +10, fanApproval: +10, brand: +6 } },
      { label: 'Own it — this is what you\'ve been working for', outcome: 'Confident. Polarising.',
        effects: { brand: +14, fanApproval: +8, personalityRep: +5 } },
    ],
  },

  // ── MEDIA & BRAND ──────────────────────────────────────────────────────────
  {
    id: 'endorsement_small', title: 'ENDORSEMENT OFFER', phase: 'season', weight: 6,
    body: "A mid-tier shoe brand wants you for a regional campaign. $300K, minimal time commitments.",
    choices: [
      { label: 'Sign it', outcome: 'Easy money.', effects: { earnings: 300_000, brand: +6 } },
      { label: 'Hold out for a bigger deal', outcome: 'They walk. You wait.', effects: { brand: +2 } },
    ],
  },
  {
    id: 'endorsement_major', title: 'MAJOR ENDORSEMENT', phase: 'season', weight: 4,
    body: "A top-tier brand is circling — $2.5M flagship deal. Demanding image requirements, but massive visibility.",
    choices: [
      { label: 'Sign the full deal', outcome: "You're a brand now.",
        effects: { earnings: 2_500_000, brand: +20, fanApproval: +8 } },
      { label: 'Negotiate reduced commitments ($1.4M)', outcome: 'Less money, more freedom.',
        effects: { earnings: 1_400_000, brand: +12, fanApproval: +4 } },
      { label: 'Decline — keep it authentic', outcome: 'The brand appreciates the game.',
        effects: { brand: +7, personalityRep: +10 } },
    ],
  },
  {
    id: 'magazine_cover', title: 'COVER STORY', phase: 'season', weight: 5,
    body: "A major sports magazine wants you for their season preview cover. Three-hour shoot, full profile piece.",
    choices: [
      { label: 'Do it — build the profile', outcome: 'Big visibility boost.',
        effects: { brand: +12, fanApproval: +7, coachTrust: -2 } },
      { label: 'Pass — focus on the season', outcome: 'Coaches notice.',
        effects: { coachTrust: +5, attributes: { basketballIQ: +1 } } },
    ],
  },
  {
    id: 'media_controversy', title: 'MEDIA FIRESTORM', phase: 'season', weight: 5,
    body: "An old social media post surfaces — taken wildly out of context. Headlines are brutal for 48 hours.",
    choices: [
      { label: 'Issue a full public apology immediately', outcome: 'Storm blows over fast.',
        effects: { fanApproval: +5, brand: -3, personalityRep: -4 } },
      { label: 'Stay silent and let it die', outcome: 'Two uncomfortable weeks. It fades.',
        effects: { fanApproval: -8, brand: -8 } },
      { label: 'Stand your ground publicly', outcome: 'Half the league respects it.',
        effects: { fanApproval: -10, brand: -10, personalityRep: +15 } },
    ],
  },
  {
    id: 'documentary_offer', title: 'DOCUMENTARY OFFER', phase: 'offseason', weight: 4,
    body: "A streaming giant wants to document your season. Access-all-areas. Career-defining exposure — or an invasion of privacy.",
    choices: [
      { label: 'Full access — let the cameras in', outcome: 'The series premieres to huge numbers.',
        effects: { earnings: 800_000, brand: +18, fanApproval: +12, coachTrust: -4 } },
      { label: 'Limited access — control the narrative', outcome: 'Solid series. Measured exposure.',
        effects: { earnings: 400_000, brand: +10, fanApproval: +6 } },
      { label: 'Decline — my life is private', outcome: 'They respect it. Your mystique grows.',
        effects: { personalityRep: +8, brand: +4 } },
    ],
  },

  // ── TEAM & RELATIONSHIPS ───────────────────────────────────────────────────
  {
    id: 'veteran_mentor', title: 'VETERAN MENTOR', phase: 'season', weight: 6,
    body: "A 14-year vet pulls you aside after practice. Film sessions, breakfast meetings, lessons about reading the game at the next level.",
    choices: [
      { label: 'Invest fully — show up every session', outcome: 'The game slows down for you.',
        effects: { attributes: { basketballIQ: +5, passingVision: +3 }, chemistry: +8, coachTrust: +4 } },
      { label: 'Take some sessions — keep your own routine', outcome: 'Modest but real gains.',
        effects: { attributes: { basketballIQ: +2 }, chemistry: +4 } },
    ],
  },
  {
    id: 'locker_room_drama', title: 'LOCKER ROOM FRICTION', phase: 'season', weight: 5,
    body: "A teammate goes public blaming you for usage and shots. The locker room has split. Everyone is watching how you handle it.",
    choices: [
      { label: 'Address it publicly', outcome: 'The drama peaks then clears.',
        effects: { chemistry: -6, coachTrust: +4, personalityRep: +5 } },
      { label: 'Pull him aside privately — defuse it', outcome: 'Quiet resolution. Coach respects it.',
        effects: { chemistry: +8, coachTrust: +8, personalityRep: +8 } },
      { label: 'Ignore it and let the game speak', outcome: 'Simmering tension all season.',
        effects: { chemistry: -10, fanApproval: -4 } },
    ],
  },
  {
    id: 'coach_change', title: 'NEW HEAD COACH', phase: 'offseason', weight: 4,
    body: "Your coach is out after five seasons. A new system is coming — nobody knows their role yet.",
    choices: [
      { label: 'Reach out immediately — build rapport early', outcome: "You're first in the new plans.",
        effects: { coachTrust: +18, chemistry: +5 } },
      { label: 'Wait and see what the system looks like', outcome: 'You start from zero.',
        effects: { coachTrust: -8 } },
    ],
  },
  {
    id: 'star_teammate_friction', title: 'STAR CONFLICT', phase: 'season', weight: 4,
    body: "Your co-star is openly frustrated — you're taking shots he wants. It's become a storyline.",
    choices: [
      { label: 'Sit down together and work it out', outcome: 'Mutual understanding. Dynamic improves.',
        effects: { chemistry: +10, coachTrust: +5, personalityRep: +6 } },
      { label: 'Defer to him on this — pick your battles', outcome: 'Peace. But a piece of your game disappears.',
        effects: { chemistry: +8, coachTrust: +3, attributes: { clutch: -2 } } },
      { label: 'Your team, your shots — he can adapt', outcome: 'War. And the whole league is watching.',
        effects: { chemistry: -15, coachTrust: -8, brand: +5, personalityRep: -5 } },
    ],
  },
  {
    id: 'team_chemistry_event', title: 'TEAM RETREAT', phase: 'offseason', weight: 5,
    body: "The front office has organised a team bonding retreat. Two days, no phones, no press.",
    choices: [
      { label: 'Fully commit — lead the activities', outcome: 'The team gel is real this year.',
        effects: { chemistry: +14, coachTrust: +6, fanApproval: +4 } },
      { label: 'Go but keep to yourself', outcome: 'You participate, nothing more.',
        effects: { chemistry: +4 } },
      { label: 'Skip with a "personal commitment"', outcome: 'The team notices.',
        effects: { chemistry: -8, coachTrust: -6, personalityRep: -6 } },
    ],
  },

  // ── TRADE & CONTRACT ───────────────────────────────────────────────────────
  {
    id: 'trade_rumor', title: 'TRADE RUMOUR', phase: 'season', weight: 4,
    body: "Your name is in every trade package ESPN runs. The front office hasn't said a word.",
    choices: [
      { label: 'Request clarity from the GM', outcome: "They say you're part of the future.",
        effects: { coachTrust: +3, fanApproval: -4 } },
      { label: 'Ignore the noise — ball out', outcome: 'You let your game respond.',
        effects: { coachTrust: +5, brand: +5, fanApproval: +5 } },
      { label: 'Leak that you\'re open to a move', outcome: 'The front office is furious.',
        effects: { coachTrust: -14, chemistry: -10, personalityRep: -6 } },
    ],
  },
  {
    id: 'extension_offer', title: 'CONTRACT EXTENSION TALKS', phase: 'season', weight: 4,
    body: "The front office wants to start extension talks mid-season. A long-term deal — below your market value, but security.",
    choices: [
      { label: 'Sign the extension — loyalty matters', outcome: 'Locked in. The city loves it.',
        effects: { earnings: 5_000_000, coachTrust: +10, fanApproval: +12, brand: +6 } },
      { label: 'Tell them to wait until the offseason', outcome: 'Professional. They respect it.',
        effects: { coachTrust: +2 } },
      { label: 'Reject outright — bet on yourself', outcome: 'High stakes, high reward potential.',
        effects: { coachTrust: -6, fanApproval: -5, personalityRep: +4 } },
    ],
  },

  // ── LIFESTYLE & PERSONAL ───────────────────────────────────────────────────
  {
    id: 'community_event', title: 'COMMUNITY INITIATIVE', phase: 'offseason', weight: 6,
    body: "A local youth basketball clinic wants you to headline. A full Saturday, your city, the next generation.",
    choices: [
      { label: 'Show up and give everything', outcome: 'The city sees who you really are.',
        effects: { fanApproval: +14, brand: +8, personalityRep: +10 } },
      { label: 'Send a donation and a signed jersey', outcome: "They're grateful. You stay focused.",
        effects: { fanApproval: +5, brand: +3 } },
    ],
  },
  {
    id: 'party_caught', title: 'LATE-NIGHT HEADLINES', phase: 'season', weight: 3,
    body: "TMZ catches you at a club at 2 AM — game day tomorrow. The coach has already seen the photos.",
    choices: [
      { label: 'Apologise to the coach directly, first thing', outcome: 'He respects the honesty.',
        effects: { coachTrust: -6, personalityRep: -5 } },
      { label: 'Play 40 minutes and let the performance speak', outcome: "Big game. But it's stored away.",
        effects: { coachTrust: -8, fanApproval: +4, attributes: { durability: -2 } } },
    ],
  },
  {
    id: 'business_venture', title: 'STARTUP INVESTMENT', phase: 'offseason', weight: 5,
    body: "A tech founder is pitching you a media company. $600K buy-in. Huge upside — and a real distraction risk.",
    choices: [
      { label: 'Invest — diversify the portfolio', outcome: 'You\'re in the game off the court.',
        effects: { earnings: -600_000, brand: +10, attributes: { basketballIQ: -1 } } },
      { label: 'Brand ambassador instead — no cash risk', outcome: 'Upside is capped but safe.',
        effects: { earnings: 200_000, brand: +6 } },
      { label: 'Pass — eyes only on the ring', outcome: 'Basketball first.',
        effects: { attributes: { basketballIQ: +2, stamina: +2 }, coachTrust: +4 } },
    ],
  },
  {
    id: 'charity_foundation', title: 'FOUNDATION LAUNCH', phase: 'offseason', weight: 4,
    body: "Your management team is pushing you to launch a charitable foundation. Big PR upside — and a genuine chance to do good.",
    choices: [
      { label: 'Launch it — do it properly', outcome: 'Career-defining off-court legacy begins.',
        effects: { earnings: -200_000, brand: +16, fanApproval: +14, personalityRep: +12 } },
      { label: 'Make a large personal donation instead', outcome: 'Quiet but real.',
        effects: { earnings: -150_000, fanApproval: +8, personalityRep: +6 } },
    ],
  },
  {
    id: 'all_star_snub', title: 'ALL-STAR SNUB', phase: 'season', weight: 4,
    body: "The All-Star rosters are out. You're not on them. Borderline votes don't feel borderline when you're on the outside.",
    choices: [
      { label: '"They\'ll remember this in June."', outcome: 'The chip is real.',
        effects: { attributes: { clutch: +4 }, fanApproval: +6, coachTrust: +3 } },
      { label: 'Take the all-star break to recover fully', outcome: 'Body fresh for the playoff push.',
        effects: { attributes: { stamina: +3, durability: +2 } } },
      { label: 'Say all the right things — class act', outcome: 'The league respects the response.',
        effects: { personalityRep: +10, brand: +6, fanApproval: +5 } },
    ],
  },

  // ── INJURY & HEALTH ────────────────────────────────────────────────────────
  {
    id: 'injury_scare', title: 'INJURY SCARE', phase: 'season', weight: 6,
    body: "You tweak your ankle badly in practice. Trainers say two weeks minimum — but you feel you could push through earlier.",
    choices: [
      { label: 'Take the full two weeks — don\'t rush it', outcome: 'Smart. Back at full strength.',
        effects: { attributes: { durability: +3 } } },
      { label: 'Rehab hard and return in one week', outcome: 'You make it back — barely.',
        effects: { coachTrust: +4, attributes: { durability: -1, athleticism: -1 } } },
      { label: 'Play through it — team needs you now', outcome: 'You gut it out. Long-term cost.',
        effects: { coachTrust: +6, chemistry: +4, attributes: { durability: -3 } } },
    ],
  },
  {
    id: 'load_management', title: 'LOAD MANAGEMENT', phase: 'season', weight: 4,
    body: "The training staff is pushing load management — sit two back-to-backs per month. Some fans are unhappy.",
    choices: [
      { label: 'Agree to the programme', outcome: 'Body thanks you in year seven.',
        effects: { attributes: { durability: +3, stamina: +2 }, fanApproval: -5 } },
      { label: 'Sit only when you feel it', outcome: 'Compromise. Some rest, some risk.',
        effects: { attributes: { durability: +1 } } },
      { label: 'Refuse — I play every game', outcome: 'The fans love you for it. Your body pays later.',
        effects: { fanApproval: +8, attributes: { durability: -2, stamina: -2 } } },
    ],
  },
  {
    id: 'surgery_decision', title: 'OFFSEASON PROCEDURE', phase: 'offseason', weight: 3,
    body: "Doctors are recommending a clean-up procedure on your knee. Six-week recovery but prevents long-term damage.",
    choices: [
      { label: 'Have the surgery — protect the career', outcome: 'Smart investment in longevity.',
        effects: { attributes: { durability: +5, athleticism: +2 } } },
      { label: 'Skip it — rehab and manage it', outcome: 'Manageable for now.',
        effects: { attributes: { durability: -1 } } },
    ],
  },

  // ── PLAYOFFS & PRESSURE ────────────────────────────────────────────────────
  {
    id: 'playoff_pressure', title: 'FIRST PLAYOFF RUN', phase: 'season', weight: 3,
    body: "Your first playoff run is approaching. The media is testing whether you can handle it. Some doubt you can.",
    choices: [
      { label: 'Welcome the pressure — it\'s what you play for', outcome: 'Born for this moment.',
        effects: { attributes: { clutch: +5 }, coachTrust: +6, fanApproval: +8 } },
      { label: 'Stay methodical — playoffs is just basketball', outcome: 'Steady mindset.',
        effects: { attributes: { basketballIQ: +3, clutch: +2 } } },
    ],
  },
  {
    id: 'rivalry_game', title: 'RIVALRY GAME', phase: 'season', weight: 5,
    body: "The biggest game of the season — against your arch-rivals. Your number has been called all week.",
    choices: [
      { label: 'Obsess over preparation — watch every clip', outcome: 'You\'re ready for anything.',
        effects: { attributes: { basketballIQ: +3, perimeterDefense: +2 }, coachTrust: +4 } },
      { label: 'Stay in your routine — don\'t let them in your head', outcome: 'Business as usual.',
        effects: { attributes: { clutch: +2 }, fanApproval: +4 } },
      { label: 'Engage in the trash talk — own the moment', outcome: 'Electric. Win or lose.',
        effects: { fanApproval: +10, brand: +6, personalityRep: +5 } },
    ],
  },

  // ── OFFSEASON DEVELOPMENT ─────────────────────────────────────────────────
  {
    id: 'elite_trainer', title: 'ELITE TRAINER OPPORTUNITY', phase: 'offseason', weight: 5,
    body: "One of the most sought-after player development trainers has an opening in their summer programme. Six weeks, total dedication.",
    choices: [
      { label: 'Go all-in — six weeks, nothing else', outcome: 'Massive technical leap.',
        effects: { attributes: { insideScoring: +4, midRange: +3, freeThrow: +3 }, coachTrust: +5 } },
      { label: 'Join for three weeks', outcome: 'Good gains. Social life survives.',
        effects: { attributes: { insideScoring: +2, midRange: +1 } } },
    ],
  },
  {
    id: 'international_camp', title: 'INTERNATIONAL TRAINING CAMP', phase: 'offseason', weight: 3,
    body: "Invited to an elite summer camp overseas — train with some of the world\'s best players. Expensive to attend. Worth it.",
    choices: [
      { label: 'Go — experience changes you', outcome: 'Inspired and improved.',
        effects: { earnings: -100_000, attributes: { basketballIQ: +4, passingVision: +3 }, brand: +8 } },
      { label: 'Train locally — stay in your system', outcome: 'Consistent. Comfortable.',
        effects: { attributes: { basketballIQ: +1 } } },
    ],
  },
  {
    id: 'nutrition_coach', title: 'BODY TRANSFORMATION', phase: 'offseason', weight: 4,
    body: "A elite sports nutritionist and conditioning coach wants to overhaul your offseason programme.",
    choices: [
      { label: 'Full programme — total commitment', outcome: 'You come back a different athlete.',
        effects: { attributes: { athleticism: +4, stamina: +4, durability: +3 }, earnings: -80_000 } },
      { label: 'Partial changes — adjust the diet only', outcome: 'Modest improvement.',
        effects: { attributes: { stamina: +2, durability: +1 } } },
    ],
  },
];

// Pick `count` unique events for the given phase, weighted by probability.
export function pickEvents(phase, count = 3) {
  const pool = EVENT_POOL.filter(e => e.phase === phase || e.phase === 'any');
  if (pool.length === 0) return [];

  const totalWeight = pool.reduce((s, e) => s + (e.weight ?? 1), 0);
  const picked = new Set();
  const results = [];

  let attempts = 0;
  while (results.length < count && attempts < 200) {
    attempts++;
    let r = Math.random() * totalWeight;
    for (const ev of pool) {
      r -= ev.weight ?? 1;
      if (r <= 0) {
        if (!picked.has(ev.id)) {
          picked.add(ev.id);
          results.push(ev);
        }
        break;
      }
    }
  }

  return results;
}
