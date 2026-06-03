export function computeLegacyScore(player) {
  let score = 0;
  const notes = [];

  const gp = player.careerGames ?? 0;
  const careerPts = player.careerPts ?? 0;
  const careerReb = player.careerReb ?? 0;
  const careerAst = player.careerAst ?? 0;
  const ppg = gp > 0 ? careerPts / gp : 0;
  const rpg = gp > 0 ? careerReb / gp : 0;
  const apg = gp > 0 ? careerAst / gp : 0;

  // Career longevity
  if (gp >= 1000) { score += 15; notes.push('+15: 1,000+ career games'); }
  else if (gp >= 700) { score += 10; notes.push('+10: 700+ career games'); }
  else if (gp >= 400) { score += 5; notes.push('+5: 400+ career games'); }

  // Career scoring
  if (ppg >= 22) { score += 20; notes.push(`+20: ${ppg.toFixed(1)} PPG career avg`); }
  else if (ppg >= 18) { score += 15; notes.push(`+15: ${ppg.toFixed(1)} PPG career avg`); }
  else if (ppg >= 14) { score += 8; notes.push(`+8: ${ppg.toFixed(1)} PPG career avg`); }
  else if (ppg >= 10) { score += 3; notes.push(`+3: ${ppg.toFixed(1)} PPG career avg`); }

  // Career total points
  if (careerPts >= 25_000) { score += 15; notes.push(`+15: ${careerPts.toLocaleString()} career pts`); }
  else if (careerPts >= 18_000) { score += 10; notes.push(`+10: ${careerPts.toLocaleString()} career pts`); }
  else if (careerPts >= 10_000) { score += 5; notes.push(`+5: ${careerPts.toLocaleString()} career pts`); }

  // Rebounds/Assists specialists
  if (rpg >= 9 || apg >= 8) { score += 8; notes.push(`+8: dominant stat line (${rpg.toFixed(1)} RPG / ${apg.toFixed(1)} APG)`); }
  else if (rpg >= 7 || apg >= 6) { score += 4; notes.push(`+4: strong rebounding/playmaking`); }

  // Championships
  const champs = player.championships ?? 0;
  if (champs >= 3) { score += 30; notes.push(`+30: ${champs} championships`); }
  else if (champs >= 2) { score += 20; notes.push(`+20: ${champs} championships`); }
  else if (champs >= 1) { score += 12; notes.push(`+12: ${champs} championship`); }

  // Awards
  const awards = player.awards ?? [];
  const mvps = awards.filter(a => a.startsWith('MVP')).length;
  const dpoys = awards.filter(a => a.startsWith('DPOY')).length;
  const finalsMVPs = awards.filter(a => a.startsWith('Finals MVP')).length;
  const allStars = player.allStarSelections ?? 0;
  const allNBA1 = awards.filter(a => a.startsWith('All-NBA 1st')).length;
  const allNBA2 = awards.filter(a => a.startsWith('All-NBA 2nd')).length;
  const scoringTitles = awards.filter(a => a.startsWith('Scoring Title')).length;

  if (mvps >= 3) { score += 25; notes.push(`+25: ${mvps}× MVP`); }
  else if (mvps >= 2) { score += 18; notes.push(`+18: ${mvps}× MVP`); }
  else if (mvps >= 1) { score += 10; notes.push(`+10: ${mvps}× MVP`); }

  if (dpoys >= 2) { score += 10; notes.push(`+10: ${dpoys}× DPOY`); }
  else if (dpoys >= 1) { score += 5; notes.push(`+5: DPOY`); }

  if (finalsMVPs >= 1) { score += 8; notes.push(`+8: Finals MVP`); }

  const allStarBonus = Math.min(allStars * 2, 20);
  if (allStars > 0) { score += allStarBonus; notes.push(`+${allStarBonus}: ${allStars}× All-Star`); }

  const allNBABonus = Math.min(allNBA1 * 4 + allNBA2 * 2, 20);
  if (allNBA1 + allNBA2 > 0) { score += allNBABonus; notes.push(`+${allNBABonus}: All-NBA selections`); }

  if (scoringTitles >= 2) { score += 6; notes.push(`+6: ${scoringTitles}× Scoring Title`); }
  else if (scoringTitles >= 1) { score += 3; notes.push(`+3: Scoring Title`); }

  score = Math.round(score);

  const hofVerdict = score >= 75 ? 'FIRST BALLOT HOF'
    : score >= 60 ? 'HALL OF FAME INDUCTEE'
    : score >= 45 ? 'HOF BORDERLINE'
    : score >= 30 ? 'SOLID PRO CAREER'
    : 'JOURNEYMAN';

  return { score, notes, hofVerdict, ppg, rpg, apg, gp };
}

export function generateCareerObituary(player, legacy) {
  const { ppg, rpg, apg, gp, hofVerdict } = legacy;
  const years = player.nbaSeasonsPlayed ?? 0;
  const champs = player.championships ?? 0;
  const allStars = player.allStarSelections ?? 0;
  const team = player.team ?? 'various teams';
  const pos = player.position;

  const openings = [
    `${player.name} played ${years} seasons as a ${pos}, etching their name into the record books`,
    `Few players defined an era the way ${player.name} did over ${years} NBA seasons`,
    `Over ${years} seasons, ${player.name} proved that the ${pos} position could be played at the highest level`,
  ];

  const statLine = `averaging ${ppg.toFixed(1)} points, ${rpg.toFixed(1)} rebounds, and ${apg.toFixed(1)} assists over ${gp} games`;

  const champStr = champs > 0 ? `${champs > 1 ? `${champs} championships` : 'a championship'} and ` : '';
  const asStr = allStars > 0 ? `${allStars} All-Star appearances` : 'a career built on consistency';

  const opening = openings[Math.floor(Math.random() * openings.length)];

  return [
    `${opening}, ${statLine}.`,
    `Their career included ${champStr}${asStr}.`,
    hofVerdict === 'FIRST BALLOT HOF' || hofVerdict === 'HALL OF FAME INDUCTEE'
      ? `When the votes are counted, ${player.name}'s plaque belongs in Springfield.`
      : hofVerdict === 'HOF BORDERLINE'
      ? `The Hall of Fame debate will burn for decades — a career that polarised voters.`
      : `Not every career ends in the Hall — but ${player.name}'s legacy is written in the box scores.`,
  ].join(' ');
}
