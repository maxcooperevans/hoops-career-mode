// Weighted event pool. weight = relative probability of firing.
export const EVENT_POOL = [
  {
    id: 'hot_streak',
    title: 'ON FIRE',
    phase: 'season', // fires during season
    weight: 8,
    body: "You've been unconscious — 30+ points in four straight games. Cameras follow you everywhere. The whole league is talking.",
    choices: [
      {
        label: 'Stay locked in — no interviews',
        outcome: 'You let the game speak for itself.',
        effects: { coachTrust: +4, brand: +2 },
      },
      {
        label: 'Embrace the spotlight',
        outcome: 'The hype machine runs hot. Brand soars.',
        effects: { brand: +10, fanApproval: +6, coachTrust: -2 },
      },
    ],
  },
  {
    id: 'slump',
    title: 'SHOOTING SLUMP',
    phase: 'season',
    weight: 8,
    body: "You're 6-for-38 from three over the last two weeks. The coach pulls you aside after film: 'What's going on?'",
    choices: [
      {
        label: 'Work extra hours in the gym',
        outcome: 'You grind through it the right way.',
        effects: { attributes: { threePoint: +1 }, coachTrust: +3 },
      },
      {
        label: 'Change nothing — trust the process',
        outcome: 'The slump passes... eventually.',
        effects: { coachTrust: -2, fanApproval: -3 },
      },
      {
        label: 'Blame the plays being drawn up',
        outcome: 'The locker room gets tense.',
        effects: { coachTrust: -6, chemistry: -4, personalityRep: -5 },
      },
    ],
  },
  {
    id: 'endorsement_small',
    title: 'ENDORSEMENT OFFER',
    phase: 'season',
    weight: 7,
    body: "A mid-tier shoe company wants you for a regional campaign. $200K, minimal commitments.",
    choices: [
      {
        label: 'Sign the deal',
        outcome: 'Free money. The exposure helps.',
        effects: { earnings: 200_000, brand: +5 },
      },
      {
        label: 'Hold out for a bigger deal',
        outcome: "You pass. Maybe something better comes along.",
        effects: { brand: +2 },
      },
    ],
  },
  {
    id: 'endorsement_major',
    title: 'MAJOR ENDORSEMENT',
    phase: 'season',
    weight: 4,
    body: "A top-tier brand is circling. They want you for a flagship campaign — $2M, but demanding image requirements.",
    choices: [
      {
        label: 'Sign the full deal',
        outcome: "You're a brand now.",
        effects: { earnings: 2_000_000, brand: +18, fanApproval: +6 },
      },
      {
        label: 'Negotiate reduced commitments',
        outcome: 'They come down to $1.2M with less oversight.',
        effects: { earnings: 1_200_000, brand: +10, fanApproval: +3 },
      },
      {
        label: 'Decline — stay authentic',
        outcome: 'Some respect the move. Brand grows organically.',
        effects: { brand: +5, personalityRep: +8 },
      },
    ],
  },
  {
    id: 'media_controversy',
    title: 'MEDIA FIRESTORM',
    phase: 'season',
    weight: 5,
    body: "An old social-media post surfaces. It's taken out of context, but the headlines are brutal.",
    choices: [
      {
        label: 'Issue a full public apology',
        outcome: "The storm blows over quicker.",
        effects: { fanApproval: +4, personalityRep: -3, brand: -2 },
      },
      {
        label: 'Stay silent and let it fade',
        outcome: 'Two uncomfortable weeks, then it dies.',
        effects: { fanApproval: -5, brand: -5 },
      },
      {
        label: 'Stand your ground publicly',
        outcome: 'Polarising. Some fans love it.',
        effects: { fanApproval: -8, brand: -8, personalityRep: +10 },
      },
    ],
  },
  {
    id: 'veteran_mentor',
    title: 'VETERAN MENTOR',
    phase: 'season',
    weight: 6,
    body: "A 14-year vet takes you under his wing. Film sessions, weight room, postgame conversations about reading the game.",
    choices: [
      {
        label: 'Invest the time — show up every session',
        outcome: "Your IQ jumps. The game slows down.",
        effects: { attributes: { basketballIQ: +3, passingVision: +2 }, chemistry: +6 },
      },
      {
        label: 'Appreciate it but keep your routine',
        outcome: 'Modest gains.',
        effects: { attributes: { basketballIQ: +1 }, chemistry: +2 },
      },
    ],
  },
  {
    id: 'locker_room_drama',
    title: 'LOCKER ROOM FRICTION',
    phase: 'season',
    weight: 5,
    body: "A teammate goes public complaining about shots and usage. The locker room splits. Everyone's watching how you respond.",
    choices: [
      {
        label: 'Call him out — this is unacceptable',
        outcome: "The drama intensifies before clearing.",
        effects: { chemistry: -8, coachTrust: +2, personalityRep: +4 },
      },
      {
        label: 'Pull him aside privately',
        outcome: "Defused quietly. The coach notices.",
        effects: { chemistry: +5, coachTrust: +5, personalityRep: +6 },
      },
      {
        label: 'Stay out of it',
        outcome: "You avoid the blast zone.",
        effects: { chemistry: -3, personalityRep: -2 },
      },
    ],
  },
  {
    id: 'trade_rumor',
    title: 'TRADE RUMOR',
    phase: 'season',
    weight: 4,
    body: "Your name is appearing in trade packages on every NBA pundit's feed. The front office hasn't said a word.",
    choices: [
      {
        label: 'Request a meeting with the GM',
        outcome: "They assure you you're part of the plan.",
        effects: { coachTrust: +2, fanApproval: -3 },
      },
      {
        label: 'Ignore the noise and ball out',
        outcome: "You let your play do the talking.",
        effects: { coachTrust: +4, brand: +3, fanApproval: +4 },
      },
      {
        label: 'Let it be known you are open to a trade',
        outcome: "The front office is... displeased.",
        effects: { coachTrust: -8, chemistry: -5, personalityRep: -4 },
      },
    ],
  },
  {
    id: 'coach_change',
    title: 'NEW HEAD COACH',
    phase: 'offseason',
    weight: 4,
    body: "Your coach is out. A new system is coming in, and nobody knows where they fit yet.",
    choices: [
      {
        label: 'Reach out immediately — build rapport',
        outcome: "You're first in the new coach's plans.",
        effects: { coachTrust: +12, chemistry: +4 },
      },
      {
        label: 'Wait and see what the new system looks like',
        outcome: 'Cautious. You start at zero.',
        effects: { coachTrust: -5 },
      },
    ],
  },
  {
    id: 'community_event',
    title: 'COMMUNITY INITIATIVE',
    phase: 'offseason',
    weight: 6,
    body: "A local youth program wants you to host a basketball clinic. Low cost — just a Saturday.",
    choices: [
      {
        label: 'Show up and give it your all',
        outcome: 'The city sees a different side of you.',
        effects: { fanApproval: +10, brand: +5, personalityRep: +6 },
      },
      {
        label: 'Send a signed jersey instead',
        outcome: "They're grateful. You stay focused.",
        effects: { fanApproval: +3, brand: +1 },
      },
    ],
  },
  {
    id: 'party_caught',
    title: 'LATE NIGHT HEADLINES',
    phase: 'season',
    weight: 3,
    body: "TMZ catches you at a club at 2 AM — game day tomorrow. The coach has already seen the photos.",
    choices: [
      {
        label: 'Apologize to the coach directly',
        outcome: 'He respects the ownership.',
        effects: { coachTrust: -4, personalityRep: -4 },
      },
      {
        label: 'Show up and play 40 minutes',
        outcome: 'The performance papers over it — for now.',
        effects: { coachTrust: -6, fanApproval: +2, attributes: { durability: -1 } },
      },
    ],
  },
  {
    id: 'business_venture',
    title: 'STARTUP OPPORTUNITY',
    phase: 'offseason',
    weight: 5,
    body: "A tech founder is pitching you on a media company. $500K buy-in. High upside, significant distraction.",
    choices: [
      {
        label: 'Invest — diversify the portfolio',
        outcome: "Money in. Time management tested.",
        effects: { earnings: -500_000, brand: +8, attributes: { basketballIQ: -1 } },
      },
      {
        label: 'Become a brand ambassador instead',
        outcome: 'Upside capped, but your game stays sharp.',
        effects: { earnings: 150_000, brand: +5 },
      },
      {
        label: 'Pass — eyes on the prize',
        outcome: "Basketball first.",
        effects: { attributes: { basketballIQ: +1, stamina: +1 }, coachTrust: +2 },
      },
    ],
  },
  {
    id: 'all_star_snub',
    title: 'ALL-STAR SNUB',
    phase: 'season',
    weight: 4,
    body: "You played your best basketball all season and they still left you off the All-Star roster. The notifications won't stop.",
    choices: [
      {
        label: '"They will remember this come June."',
        outcome: 'Chip on your shoulder — measurably.',
        effects: { attributes: { clutch: +3 }, fanApproval: +5, coachTrust: +2 },
      },
      {
        label: 'Say all the right things publicly',
        outcome: 'Classy. The league notices.',
        effects: { personalityRep: +8, brand: +4 },
      },
      {
        label: 'Take the break to fully recover',
        outcome: 'Your legs feel fresh for the second half.',
        effects: { attributes: { stamina: +2, durability: +1 } },
      },
    ],
  },
  {
    id: 'injury_scare',
    title: 'INJURY SCARE',
    phase: 'season',
    weight: 5,
    body: "You tweak your ankle in practice. Trainers say it's minor — but pushing it risks something worse.",
    choices: [
      {
        label: 'Sit out a week — let it heal',
        outcome: 'Smart. Back at full strength.',
        effects: { attributes: { durability: +1 } },
      },
      {
        label: 'Play through it — team needs you',
        outcome: "You gut it out. The ankle stays a problem.",
        effects: { coachTrust: +3, chemistry: +2, attributes: { durability: -1 } },
      },
    ],
  },
];

export function pickEvents(phase, count = 2) {
  const pool = EVENT_POOL.filter(e => e.phase === phase || e.phase === 'any');
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  const picked = [];

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalWeight;
    for (const ev of pool) {
      r -= ev.weight;
      if (r <= 0) {
        if (!picked.find(p => p.id === ev.id)) {
          picked.push(ev);
          break;
        }
      }
    }
  }

  return picked;
}
