import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { TEAM_MAP } from '../data/teams.js';

export default function TopNav({ links = [] }) {
  const player = useGameStore(s => s.player);
  const goTo = useGameStore(s => s.goTo);
  const saveToSlot = useGameStore(s => s.saveToSlot);

  const team = player?.team ? TEAM_MAP[player.team] : null;

  return (
    <nav className="border-b border-black px-4 py-2 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-4">
        <span className="font-bold tracking-widest text-xs uppercase">HOOPS: CAREER MODE</span>
        {links.map(l => (
          <button key={l.screen} onClick={() => goTo(l.screen)}
            className="text-xs uppercase tracking-wider hover:underline">
            {l.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {player && (
          <span className="font-mono text-xs">
            {player.name} · {player.position}
            {team ? ` · ${team.city} ${team.name}` : ''}
            {' · '}Age {player.age}
          </span>
        )}
        {player && (
          <button onClick={() => saveToSlot(0)} className="btn text-xs py-1 px-2">Save</button>
        )}
      </div>
    </nav>
  );
}
