import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { ATTRIBUTES, ATTR_LABELS, ATTR_GROUPS, CREATION_POINTS, ATTR_MIN, ATTR_MAX_CREATION, POSITIONS } from '../data/constants.js';
import { ARCHETYPES, ARCHETYPE_NAMES } from '../data/archetypes.js';
import { computeOverall, generatePotential, applyPhysicalModifiers, describePhysicalModifiers } from '../engine/playerEngine.js';
import { stockToPickRange } from '../engine/draftEngine.js';
import { computeDraftStock } from '../engine/playerEngine.js';

const HEIGHTS = {
  PG: { min: 71, max: 78 }, SG: { min: 73, max: 79 }, SF: { min: 76, max: 82 },
  PF: { min: 79, max: 85 }, C: { min: 82, max: 88 },
};
const HOMETOWNS = ['Chicago, IL','Los Angeles, CA','New York, NY','Houston, TX','Atlanta, GA','Dallas, TX','Philadelphia, PA','Miami, FL','Boston, MA','Detroit, MI'];

function inchesToFt(in_) {
  return `${Math.floor(in_ / 12)}'${in_ % 12}"`;
}

export default function CharCreation() {
  const startNewGame = useGameStore(s => s.startNewGame);
  const goTo = useGameStore(s => s.goTo);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('PG');
  const [hometown, setHometown] = useState(HOMETOWNS[0]);
  const [hand, setHand] = useState('R');
  const [archetype, setArchetype] = useState('Floor General');
  const [height, setHeight] = useState(75);
  const [weight, setWeight] = useState(190);
  const [wingspan, setWingspan] = useState(77);
  const [attrs, setAttrs] = useState(() => ({ ...ARCHETYPES['Floor General'].startingAttrs }));

  const arch = ARCHETYPES[archetype];

  // Reset attrs when archetype changes
  function selectArchetype(a) {
    setArchetype(a);
    setAttrs({ ...ARCHETYPES[a].startingAttrs });
    const h = HEIGHTS[position] ?? HEIGHTS.PG;
    setHeight(Math.round((h.min + h.max) / 2));
    setWingspan(Math.round((h.min + h.max) / 2) + 2);
  }

  function selectPosition(p) {
    setPosition(p);
    const validArchs = ARCHETYPE_NAMES.filter(n => ARCHETYPES[n].positions.includes(p));
    const newArch = validArchs.includes(archetype) ? archetype : validArchs[0];
    setArchetype(newArch);
    setAttrs({ ...ARCHETYPES[newArch].startingAttrs });
    const h = HEIGHTS[p];
    const mid = Math.round((h.min + h.max) / 2);
    setHeight(mid);
    setWingspan(mid + 2);
    setWeight(170 + (mid - 71) * 4);
  }

  // Points are measured as delta from the archetype baseline, not from ATTR_MIN.
  // Starting with archetype defaults = CREATION_POINTS remaining. Spending above defaults costs points.
  const archBaseTotal = useMemo(() =>
    ATTRIBUTES.reduce((s, a) => s + Math.max(0, (arch.startingAttrs[a] ?? ATTR_MIN) - ATTR_MIN), 0),
    [archetype]
  );
  const pointsSpent = useMemo(() =>
    ATTRIBUTES.reduce((s, a) => s + Math.max(0, (attrs[a] ?? ATTR_MIN) - ATTR_MIN), 0),
    [attrs]
  );
  const pointsLeft = CREATION_POINTS + archBaseTotal - pointsSpent;

  // Functional updater: reads from prev state so batched rapid-clicks accumulate correctly.
  function changeAttr(attr, delta) {
    setAttrs(prev => {
      const cur = prev[attr] ?? ATTR_MIN;
      const next = Math.max(ATTR_MIN, Math.min(ATTR_MAX_CREATION, cur + delta));
      const cost = next - cur;
      if (cost === 0) return prev;
      // Re-check budget from actual latest state
      const curSpent = ATTRIBUTES.reduce((s, a) => s + Math.max(0, (prev[a] ?? ATTR_MIN) - ATTR_MIN), 0);
      const curLeft = CREATION_POINTS + archBaseTotal - curSpent;
      if (cost > 0 && cost > curLeft) return prev;
      return { ...prev, [attr]: next };
    });
  }

  const overall = useMemo(() => computeOverall(attrs, position), [attrs, position]);

  const draftProjection = useMemo(() => {
    const mockPlayer = { attributes: attrs, position, age: 19, college: null, collegeStats: [], potential: {} };
    const stock = computeDraftStock(mockPlayer);
    return stockToPickRange(stock);
  }, [attrs, position]);

  // Physical modifier preview for step 2 display
  const physicalMods = useMemo(() =>
    describePhysicalModifiers(height, weight, wingspan),
    [height, weight, wingspan]
  );

  function handleConfirm() {
    if (!name.trim()) { alert('Enter a name!'); return; }
    // Apply physical attribute modifiers (2K-style) before saving
    const physicalAttrs = applyPhysicalModifiers(attrs, height, weight, wingspan);
    const potential = generatePotential(physicalAttrs, archetype);
    startNewGame({
      name: name.trim(),
      position,
      height,
      weight,
      wingspan,
      hand,
      hometown,
      archetype,
      attributes: physicalAttrs,
      potential,
    });
  }

  const validArchetypes = ARCHETYPE_NAMES.filter(n => ARCHETYPES[n].positions.includes(position));

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-black pb-3">
          <div>
            <div className="font-mono text-xs text-gray-400 uppercase tracking-widest">Step {step} of 3</div>
            <h2 className="text-xl font-bold tracking-tight">CREATE YOUR PROSPECT</h2>
          </div>
          <button className="btn text-xs" onClick={() => goTo('MAIN_MENU')}>← Back</button>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            {/* Identity */}
            <div className="panel">
              <div className="panel-header">IDENTITY</div>
              <div className="panel-body space-y-4">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    className="border border-black w-full px-3 py-2 font-mono text-sm focus:outline-none"
                    placeholder="e.g. Marcus Williams"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider block mb-1">Hometown</label>
                    <select className="border border-black w-full px-3 py-2 text-sm font-mono focus:outline-none bg-white"
                      value={hometown} onChange={e => setHometown(e.target.value)}>
                      {HOMETOWNS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider block mb-1">Shooting Hand</label>
                    <div className="flex gap-2">
                      {['R','L'].map(h => (
                        <button key={h} onClick={() => setHand(h)}
                          className={`btn flex-1 ${hand === h ? 'btn-primary' : ''}`}>
                          {h === 'R' ? 'Right' : 'Left'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="panel">
              <div className="panel-header">POSITION</div>
              <div className="panel-body">
                <div className="grid grid-cols-5 gap-2">
                  {POSITIONS.map(p => (
                    <button key={p} onClick={() => selectPosition(p)}
                      className={`btn text-lg font-bold py-4 ${position === p ? 'btn-primary' : ''}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="btn btn-primary w-full py-3 tracking-widest" onClick={() => setStep(2)}>
              NEXT: ARCHETYPE →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="panel">
              <div className="panel-header">ARCHETYPE</div>
              <div className="panel-body space-y-2">
                {validArchetypes.map(n => (
                  <button key={n} onClick={() => selectArchetype(n)}
                    className={`btn w-full text-left flex items-start gap-3 py-3 px-4 ${archetype === n ? 'btn-primary' : ''}`}>
                    <div>
                      <div className="font-bold text-sm">{n}</div>
                      <div className={`text-xs mt-0.5 font-normal ${archetype === n ? 'opacity-80' : 'text-gray-500'}`}>
                        {ARCHETYPES[n].description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Measurements */}
            <div className="panel">
              <div className="panel-header">MEASUREMENTS</div>
              <div className="panel-body space-y-3">
                {[
                  { label: 'Height', val: height, min: HEIGHTS[position].min, max: HEIGHTS[position].max, set: setHeight, fmt: inchesToFt },
                  { label: 'Weight (lbs)', val: weight, min: 160, max: 300, set: setWeight, fmt: v => `${v} lbs` },
                  { label: 'Wingspan', val: wingspan, min: HEIGHTS[position].min - 2, max: HEIGHTS[position].max + 8, set: setWingspan, fmt: inchesToFt },
                ].map(({ label, val, min, max, set, fmt }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
                      <span className="font-mono text-sm font-bold">{fmt(val)}</span>
                    </div>
                    <input type="range" min={min} max={max} value={val}
                      onChange={e => set(Number(e.target.value))}
                      className="w-full accent-black" />
                  </div>
                ))}
                {/* Physical modifier impact */}
                {physicalMods.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-1">Physical Impact on Attributes</div>
                    <div className="grid grid-cols-2 gap-1">
                      {physicalMods.map(({ attr, delta }) => (
                        <div key={attr} className="flex justify-between font-mono text-xs">
                          <span className="text-gray-600">{attr}</span>
                          <span className={delta > 0 ? 'font-bold' : 'text-gray-400'}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn flex-1 py-3" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary flex-1 py-3 tracking-widest" onClick={() => setStep(3)}>
                NEXT: ATTRIBUTES →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            {/* Points bank */}
            <div className="panel border-2">
              <div className="panel-body flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-gray-500">Points Remaining</div>
                  <div className={`font-mono text-3xl font-bold ${pointsLeft < 20 ? 'text-black' : ''}`}>
                    {pointsLeft}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-gray-500">Overall</div>
                  <div className="font-mono text-3xl font-bold">{overall}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-gray-500">Draft Projection</div>
                  <div className="font-mono text-sm font-semibold">{draftProjection}</div>
                </div>
              </div>
            </div>

            {/* Attribute groups */}
            {Object.entries(ATTR_GROUPS).map(([group, groupAttrs]) => (
              <div key={group} className="panel">
                <div className="panel-header">{group.toUpperCase()}</div>
                <div className="panel-body space-y-2">
                  {groupAttrs.map(attr => {
                    const val = attrs[attr] ?? ATTR_MIN;
                    const pct = ((val - ATTR_MIN) / (ATTR_MAX_CREATION - ATTR_MIN)) * 100;
                    return (
                      <div key={attr} className="flex items-center gap-3">
                        <div className="w-36 font-mono text-xs shrink-0">{ATTR_LABELS[attr]}</div>
                        <div className="flex-1 h-2 bg-gray-200 border border-black">
                          <div className="h-full bg-black transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button className="btn text-xs px-1.5 h-6 leading-none"
                            onClick={() => changeAttr(attr, -5)}>−5</button>
                          <button className="btn text-xs w-6 h-6 p-0 flex items-center justify-center"
                            onClick={() => changeAttr(attr, -1)}>−</button>
                          <span className="font-mono text-sm font-bold w-8 text-center">{val}</span>
                          <button className="btn text-xs w-6 h-6 p-0 flex items-center justify-center"
                            onClick={() => changeAttr(attr, +1)}>+</button>
                          <button className="btn text-xs px-1.5 h-6 leading-none"
                            onClick={() => changeAttr(attr, +5)}>+5</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-2 pb-8">
              <button className="btn flex-1 py-3" onClick={() => setStep(2)}>← Back</button>
              <button
                className="btn btn-primary flex-1 py-3 tracking-widest"
                onClick={handleConfirm}
              >
                BEGIN CAREER →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
