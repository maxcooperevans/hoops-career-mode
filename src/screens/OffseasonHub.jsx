import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { applyOffseasonProgression } from '../engine/playerEngine.js';
import { generateContractOffers } from '../engine/draftEngine.js';
import { pickEvents } from '../data/events.js';
import { ATTRIBUTES, ATTR_LABELS } from '../data/constants.js';
import { TEAM_MAP } from '../data/teams.js';
import { computeOverall } from '../engine/playerEngine.js';
import TopNav from '../components/TopNav.jsx';
import Panel from '../components/Panel.jsx';

const LIFESTYLE_OPTIONS = [
  {
    id: 'grind',
    label: 'Training Grind',
    desc: 'Extra workouts all summer. Fatigue risk but potential gains are maximised.',
    effects: { trainingMult: 1.4, durability: -1 },
  },
  {
    id: 'balanced',
    label: 'Balanced Offseason',
    desc: 'Standard training schedule with rest. The smart long-term play.',
    effects: { trainingMult: 1.0, durability: 0 },
  },
  {
    id: 'rest',
    label: 'Rest & Recovery',
    desc: 'Body-first approach. Reduced gains, but built for a long career.',
    effects: { trainingMult: 0.7, durability: +2 },
  },
];

function fmtSalary(n) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

export default function OffseasonHub() {
  const player = useGameStore(s => s.player);
  const applyOffseasonProgressionStore = useGameStore(s => s.applyOffseasonProgression);
  const signContract = useGameStore(s => s.signContract);
  const setPendingEvent = useGameStore(s => s.setPendingEvent);
  const goTo = useGameStore(s => s.goTo);
  const saveToSlot = useGameStore(s => s.saveToSlot);

  const [phase, setPhase] = useState('training'); // training | fa | done
  const [selectedAttrs, setSelectedAttrs] = useState([]);
  const [lifestyle, setLifestyle] = useState('balanced');
  const [trainingApplied, setTrainingApplied] = useState(false);
  const [attrDeltas, setAttrDeltas] = useState({});

  const isFreeAgent = player.contractYearsLeft === 0;
  const team = player.team ? TEAM_MAP[player.team] : null;

  const offers = useMemo(() => {
    if (!isFreeAgent) return [];
    return generateContractOffers(player, team);
  }, [isFreeAgent]);

  function toggleAttr(attr) {
    setSelectedAttrs(prev =>
      prev.includes(attr) ? prev.filter(a => a !== attr) : prev.length < 2 ? [...prev, attr] : prev
    );
  }

  function handleApplyTraining() {
    const lsMult = LIFESTYLE_OPTIONS.find(l => l.id === lifestyle)?.effects?.trainingMult ?? 1.0;
    const lsDur = LIFESTYLE_OPTIONS.find(l => l.id === lifestyle)?.effects?.durability ?? 0;

    const lastSeason = player.nbaSeasons[player.nbaSeasons.length - 1];
    const minutesPlayed = lastSeason ? lastSeason.totals.min : 1500;

    const newAttrs = applyOffseasonProgression(
      player,
      selectedAttrs,
      minutesPlayed
    );

    // Apply lifestyle durability effect
    if (lsDur !== 0) {
      newAttrs.durability = Math.min(99, Math.max(25, (newAttrs.durability ?? 60) + lsDur));
    }

    // Track deltas for display
    const deltas = {};
    ATTRIBUTES.forEach(attr => {
      const d = (newAttrs[attr] ?? 0) - (player.attributes[attr] ?? 0);
      if (Math.abs(d) > 0.1) deltas[attr] = d;
    });

    applyOffseasonProgressionStore(newAttrs);
    setAttrDeltas(deltas);
    setTrainingApplied(true);

    if (isFreeAgent) {
      setPhase('fa');
    } else {
      // Queue offseason events
      const events = pickEvents('offseason', 1);
      if (events[0]) setPendingEvent(events[0]);
      setPhase('done');
    }
  }

  function handleSignContract(offer) {
    signContract(offer.teamId, offer.salary, offer.years);
    const events = pickEvents('offseason', 1);
    if (events[0]) setPendingEvent(events[0]);
    setPhase('done');
    saveToSlot(0);
  }

  function handleStartSeason() {
    goTo('SEASON_DASHBOARD');
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="mt-4">
          <div className="font-mono text-xs text-gray-400">Offseason · {2025 + player.nbaSeasonsPlayed}</div>
          <h2 className="text-2xl font-bold">OFFSEASON HUB</h2>
        </div>

        {phase === 'training' && (
          <>
            {/* Lifestyle */}
            <Panel title="LIFESTYLE">
              <div className="space-y-2">
                {LIFESTYLE_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setLifestyle(opt.id)}
                    className={`btn w-full text-left flex items-start gap-3 py-3 px-4 ${lifestyle === opt.id ? 'btn-primary' : ''}`}>
                    <div>
                      <div className="font-bold text-sm">{opt.label}</div>
                      <div className={`text-xs font-normal mt-0.5 ${lifestyle === opt.id ? 'opacity-80' : 'text-gray-500'}`}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            {/* Training Focus */}
            <Panel title="TRAINING FOCUS (choose up to 2)">
              <div className="grid grid-cols-2 gap-1">
                {ATTRIBUTES.map(attr => (
                  <button key={attr} onClick={() => toggleAttr(attr)}
                    className={`btn text-left text-xs py-2 px-3 ${selectedAttrs.includes(attr) ? 'btn-primary' : ''}`}>
                    {ATTR_LABELS[attr]}
                    <span className="ml-1 font-mono">({player.attributes[attr] ?? '—'})</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 font-mono text-xs text-gray-500">
                Selected: {selectedAttrs.length}/2 · Focused attrs get bigger boosts toward their ceiling
              </div>
            </Panel>

            <button
              className="btn btn-primary w-full py-3 tracking-widest"
              onClick={handleApplyTraining}
            >
              COMPLETE TRAINING →
            </button>
          </>
        )}

        {phase === 'fa' && (
          <>
            {/* Training results */}
            {Object.keys(attrDeltas).length > 0 && (
              <Panel title="DEVELOPMENT RESULTS">
                <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                  {Object.entries(attrDeltas).map(([attr, d]) => (
                    <div key={attr} className="flex justify-between border border-gray-100 px-2 py-1">
                      <span className="text-gray-600 truncate">{ATTR_LABELS[attr]}</span>
                      <span className={`font-bold ml-1 ${d > 0 ? '' : 'text-gray-400'}`}>
                        {d > 0 ? '+' : ''}{Math.round(d * 10) / 10}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="FREE AGENCY">
              <p className="font-mono text-xs text-gray-500 mb-3">
                Your rookie contract has expired. Teams are calling. Choose wisely.
              </p>
              <div className="space-y-2">
                {offers.map((offer, i) => {
                  const t = TEAM_MAP[offer.teamId];
                  return (
                    <div key={i} className="border border-black p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">
                          {t ? `${t.city} ${t.name}` : offer.teamId}
                          {offer.isResign && <span className="ml-2 font-mono text-xs text-gray-500">(Re-sign)</span>}
                        </div>
                        <div className="font-mono text-xs text-gray-500 mt-0.5">
                          {offer.role} · {offer.years} yr{offer.years !== 1 ? 's' : ''}
                          {t && ` · Market ${t.market} · Strength ${t.strength}`}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-lg font-mono">{fmtSalary(offer.salary)}/yr</div>
                        <button className="btn btn-primary text-xs py-1 px-3 mt-1"
                          onClick={() => handleSignContract(offer)}>
                          SIGN
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </>
        )}

        {phase === 'done' && (
          <>
            {Object.keys(attrDeltas).length > 0 && (
              <Panel title="DEVELOPMENT RESULTS">
                <div className="grid grid-cols-3 gap-1 font-mono text-xs">
                  {Object.entries(attrDeltas).map(([attr, d]) => (
                    <div key={attr} className="flex justify-between border border-gray-100 px-2 py-1">
                      <span className="text-gray-600 truncate">{ATTR_LABELS[attr]}</span>
                      <span className={`font-bold ml-1 ${d > 0 ? '' : 'text-gray-400'}`}>
                        {d > 0 ? '+' : ''}{Math.round(d * 10) / 10}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="CONTRACT STATUS">
              <div className="font-mono text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Team</span>
                  <span>{team ? `${team.city} ${team.name}` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Salary</span>
                  <span>{fmtSalary(player.contractSalary)}/yr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Years Remaining</span>
                  <span>{player.contractYearsLeft}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Earnings</span>
                  <span>${(player.totalEarnings / 1_000_000).toFixed(1)}M</span>
                </div>
              </div>
            </Panel>

            <button
              className="btn btn-primary w-full py-4 tracking-widest text-lg"
              onClick={handleStartSeason}
            >
              START {2025 + player.nbaSeasonsPlayed}–{2026 + player.nbaSeasonsPlayed} SEASON →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
