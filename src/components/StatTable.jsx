import React from 'react';

export default function StatTable({ columns, rows, highlight }) {
  return (
    <div className="overflow-x-auto">
      <table className="stat-table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{ minWidth: c.width ?? 'auto' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={highlight && highlight(row, i) ? { background: '#000', color: '#fff' } : {}}>
              {columns.map(c => (
                <td key={c.key} className={c.align === 'left' ? 'text-left' : ''}>
                  {row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
