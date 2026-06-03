import React from 'react';
import { useGameStore } from '../store/gameStore.js';

export default function EventModal() {
  const event = useGameStore(s => s.pendingEvent);
  const resolveEvent = useGameStore(s => s.resolveEvent);

  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-black max-w-lg w-full">
        <div className="panel-header text-center py-3">{event.title}</div>
        <div className="p-5">
          <p className="text-sm leading-relaxed mb-6">{event.body}</p>
          <div className="space-y-2">
            {event.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => resolveEvent(i)}
                className="btn w-full text-left flex items-start gap-3 py-3 px-4"
              >
                <span className="font-mono text-xs mt-0.5 shrink-0">{String.fromCharCode(65 + i)}.</span>
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
