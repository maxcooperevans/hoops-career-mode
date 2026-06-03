import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';
import { computeOverall } from '../engine/playerEngine.js';
import { ATTR_LABELS } from '../data/constants.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

const FOCUS_OPTIONS = [
  { id: 'balanced',    label: 'Balanced',    desc: 'No modifier. Play your natural game.' },
  { id: 'scoring',     label: 'Scoring',     desc: '+18% PPG · –15% AST · Best when your team needs a go-to scorer.' },
  { id: 'playmaking',  label: 'Playmaking',  desc: '+25% AST · –15% PPG · Best when you want to elevate teammates.' },
  { id: 'defense',     label: 'Defense',     desc: '+30% STL/BLK · –18% PPG · Best when you want DPOY recognition.' },
  { id: 'rebounding',  label: 'Rebounding',  desc: '+25% REB · –12% PPG · Best for big men or all-around wings.' },
];

export default function MyPlayer() {
  const player           = useGameStore(s => s.player);
  const setPlayerFocus   = useGameStore(s => s.setPlayerFocus);
  const setPendingEvent  = useGameStore(s => s.setPendingEvent);
  const requestTrade     = useGameStore(s => s.requestTrade);
  const requestMoreMinutes = useGameStore(s => s.requestMoreMinutes);
  const addNews          = useGameStore(s => s.addNews);
  const goTo             = useGameStore(s => s.goTo);

  const [tab, setTab]         = useState('overview');   // overview | focus | requests | attributes
  const [requestMsg, setRequestMsg] = useState('');

  const team    = player.team ? TEAM_MAP[player.team] : null;
  const overall = computeOverall(player.attributes, player.position);

  const gp  = player.careerGames;
  const ppg = gp > 0 ? (player.careerPts / gp).toFixed(1) : '—';
  const rpg = gp > 0 ? (player.careerReb / gp).toFixed(1) : '—';
  const apg = gp > 0 ? (player.careerAst / gp).toFixed(1) : '—';

  const recentSeason = player.nbaSeasons[player.nbaSeasons.length - 1];
  const thisSeasonGames = player.currentSeasonGameLog ?? [];

  // Compute this-season averages from game log
  const thisSeasonAvg = (() => {
    if (thisSeasonGames.length === 0) return null;
    const totals = thisSeasonGames.reduce((acc, g) => ({
      pts: acc.pts + g.pts, reb: acc.reb + g.reb, ast: acc.ast + g.ast,
      stl: acc.stl + (g.stl ?? 0), blk: acc.blk + (g.blk ?? 0),
    }), { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 });
    const n = thisSeasonGames.length;
    return {
      pts: (totals.pts / n).toFixed(1), reb: (totals.reb / n).toFixed(1),
      ast: (totals.ast / n).toFixed(1), stl: (totals.stl / n).toFixed(1),
      blk: (totals.blk / n).toFixed(1), gp: n,
    };
  })();

  function handleRequestMinutes() {
    const granted = player.coachTrust >= 60;
    requestMoreMinutes(granted);
    if (granted) {
      setRequestMsg('The coach agrees — expect more burn going forward.');
    } else {
      setRequestMsg('The coach tells you to earn it on the floor first.');
    }
    addNews({ type: 'team', headline: granted ? 'Requested more minutes — coach agrees' : 'Minute request denied — earn it on the court', date: `Season ${player.nbaSeasonsPlayed + 1}` });
  }

  function handleRequestTrade() {
    requestTrade();
    setRequestMsg('Trade request submitted. Expect some tension in the locker room.');
    addNews({ type: 'team', headline: `${player.name} submits trade request — front office responds`, date: `Season ${player.nbaSeasonsPlayed + 1}` });
    setPendingEvent({
      id: 'trade_request_response',
      title: 'TRADE REQUEST RESPONSE',
      body: 'The front office has formally responded to your trade request. The ball is in your court.',
      choices: [
        { label: 'Withdraw the request — stay and compete', outcome: 'You\'re back on good terms.',
          effects: { coachTrust: +8, chemistry: +6, personalityRep: +4 } },
        { label: 'Stand firm — want out', outcome: 'You\'re on the trade block. Could happen any time.',
          effects: { coachTrust: -8, chemistry: -8 } },
      ],
    });
  }

  function handleSuggestIncomingTrade() {
    setRequestMsg('You suggest a target acquisition. The front office will consider it this offseason.');
    addNews({ type: 'team', headline: 'Player pushes for front office to pursue a trade target', date: `Season ${player.nbaSeasonsPlayed + 1}` });
    setPendingEvent({
      id: 'front_office_trade_talks',
      title: 'TRADE TALKS',
      body: 'You\'ve pushed for the front office to bring in a weapon. They\'re listening — but there\'s a cost.',
      choices: [
        { label: 'Push hard — need a co-star now', outcome: 'They\'re making calls.',
          effects: { coachTrust: +3, chemistry: -4 } },
        { label: 'Leave it to management — trust the process', outcome: 'Professional.',
          effects: { coachTrust: +5, chemistry: +3 } },
      ],
    });
  }

  function handleSuggestOutgoingTrade() {
    setRequestMsg('You suggest moving on a teammate. Risky — locker rooms have ears.');
    addNews({ type: 'team', headline: 'Player requests roster changes — sources say', date: `Season ${player.nbaSeasonsPlayed + 1}` });
    setPendingEvent({
      id: 'teammate_trade_request',
      title: 'LOCKER ROOM FALLOUT',
      body: 'Your comments about wanting roster changes have leaked. Your teammate is furious.',
      choices: [
        { label: 'Double down — the team needs to change', outcome: 'War.',
          effects: { chemistry: -15, coachTrust: -8, brand: +4, personalityRep: -6 } },
        { label: 'Deny and move on', outcome: 'Damage control. Uncomfortable.',
          effects: { chemistry: -5, personalityRep: -4 } },
        { label: 'Apologise privately', outcome: 'Tense but manageable.',
          effects: { chemistry: -2, coachTrust: +3, personalityRep: +4 } },
      ],
    });
  }

  return (
    <div className="min-h-screen">
      <TopNav links={[{ screen: 'SEASON_DASHBOARD', label: 'Dashboard' }]} />
      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">
            {team ? `${team.city} ${team.name}` : '—'} · {player.position} · Age {player.age}
          </div>
          <h2 className="text-2xl font-bold">{player.name}</h2>
          <div className="font-mono text-xs text-gray-500">OVR {overall} · {player.archetype}</div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-5 gap-0 border border-black">
          {[['PPG', ppg],['RPG', rpg],['APG', apg],
            ['GP', gp],['OVR', overall]].map(([l, v], i) => (
            <div key={l} className={`p-2 text-center ${i < 4 ? 'border-r border-black' : ''}`}>
              <div className="text-xl font-bold font-mono">{v}</div>
              <div className="font-mono text-xs text-gray-500">{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border border-black">
          {[['overview','Overview'],['focus','Focus'],['requests','Requests'],['attributes','Attributes']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider border-r last:border-r-0 border-black
                ${tab === t ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-3">
            {thisSeasonAvg && (
              <Panel title="THIS SEASON (GAMES PLAYED)">
                <div className="grid grid-cols-5 gap-2 font-mono text-center mb-2">
                  {[['PTS',thisSeasonAvg.pts],['REB',thisSeasonAvg.reb],['AST',thisSeasonAvg.ast],
                    ['STL',thisSeasonAvg.stl],['BLK',thisSeasonAvg.blk]].map(([l,v]) => (
                    <div key={l}><div className="text-2xl font-bold">{v}</div>
                      <div className="text-xs text-gray-500">{l}</div></div>
                  ))}
                </div>
                <div className="font-mono text-xs text-gray-400 text-center">{thisSeasonAvg.gp} games played</div>
              </Panel>
            )}

            {recentSeason && (
              <Panel title="LAST FULL SEASON">
                <div className="grid grid-cols-5 gap-2 font-mono text-center">
                  {[['PTS',recentSeason.averages?.pts],['REB',recentSeason.averages?.reb],
                    ['AST',recentSeason.averages?.ast],['STL',recentSeason.averages?.stl],
                    ['BLK',recentSeason.averages?.blk]].map(([l,v]) => (
                    <div key={l}><div className="text-2xl font-bold">{v}</div>
                      <div className="text-xs text-gray-500">{l}</div></div>
                  ))}
                </div>
                <div className="font-mono text-xs text-gray-400 text-center mt-2">
                  {recentSeason.gamesPlayed} GP · {recentSeason.fgPct}% FG · Role: {recentSeason.role}
                </div>
              </Panel>
            )}

            <Panel title="STATUS">
              <div className="font-mono text-sm space-y-1">
                {[['Focus', player.playerFocus ?? 'balanced'],
                  ['Coach Trust', `${player.coachTrust}/100`],
                  ['Chemistry', `${player.chemistry}/100`],
                  ['Fan Approval', `${player.fanApproval}/100`],
                  ['Brand', `${player.brand}/100`],
                ].map(([l,v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-gray-500">{l}</span>
                    <span className="capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* FOCUS TAB */}
        {tab === 'focus' && (
          <div className="space-y-2">
            <p className="font-mono text-xs text-gray-500 mb-2">
              Choose what you prioritise on the court. This affects your stats for every game this season.
            </p>
            {FOCUS_OPTIONS.map(opt => (
              <button key={opt.id}
                onClick={() => setPlayerFocus(opt.id)}
                className={`btn w-full text-left flex items-start gap-3 py-3 px-4 ${(player.playerFocus ?? 'balanced') === opt.id ? 'btn-primary' : ''}`}>
                <div>
                  <div className="font-bold text-sm">{opt.label}</div>
                  <div className={`text-xs font-normal mt-0.5 ${(player.playerFocus ?? 'balanced') === opt.id ? 'opacity-80' : 'text-gray-500'}`}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* REQUESTS TAB */}
        {tab === 'requests' && (
          <div className="space-y-3">
            {requestMsg && (
              <div className="border border-black p-3 font-mono text-sm">{requestMsg}</div>
            )}
            <Panel title="PLAYING TIME">
              <div className="space-y-2">
                <p className="font-mono text-xs text-gray-500">
                  Ask the coach for more minutes. Requires high trust ({player.coachTrust}/100 — need 60+).
                </p>
                <button className="btn w-full py-2 text-sm" onClick={handleRequestMinutes}>
                  Ask for more minutes (Trust: {player.coachTrust})
                </button>
              </div>
            </Panel>

            <Panel title="ROSTER MOVES">
              <div className="space-y-2">
                <button className="btn w-full py-2 text-sm text-left" onClick={handleRequestTrade}>
                  <div className="font-bold">Request a Trade</div>
                  <div className="text-xs text-gray-500">–12 Trust · –8 Chemistry · Could trigger a move</div>
                </button>
                <button className="btn w-full py-2 text-sm text-left" onClick={handleSuggestIncomingTrade}>
                  <div className="font-bold">Push for an Acquisition</div>
                  <div className="text-xs text-gray-500">Suggest a trade target to the front office</div>
                </button>
                <button className="btn w-full py-2 text-sm text-left" onClick={handleSuggestOutgoingTrade}>
                  <div className="font-bold">Suggest a Teammate Trade</div>
                  <div className="text-xs text-gray-500 text-red-600">High risk — locker rooms have ears</div>
                </button>
              </div>
            </Panel>
          </div>
        )}

        {/* ATTRIBUTES TAB */}
        {tab === 'attributes' && (
          <Panel title="CURRENT ATTRIBUTES">
            <div className="space-y-1">
              {Object.entries(player.attributes).map(([attr, val]) => {
                const pot = player.potential?.[attr] ?? 99;
                const pct = Math.round(val / 99 * 100);
                return (
                  <div key={attr} className="flex items-center gap-2">
                    <div className="w-36 font-mono text-xs shrink-0">{ATTR_LABELS[attr] ?? attr}</div>
                    <div className="flex-1 h-1.5 bg-gray-200 border border-black overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="font-mono text-xs w-16 text-right">
                      {Math.round(val)} <span className="text-gray-400">/ {pot}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="font-mono text-xs text-gray-400 mt-3">Potential ceiling shown after /</div>
          </Panel>
        )}

        <div className="pb-8">
          <button className="btn w-full py-2 text-xs" onClick={() => goTo('SEASON_DASHBOARD')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
