import React from 'react';

export default function Panel({ title, children, className = '' }) {
  return (
    <div className={`panel ${className}`}>
      {title && <div className="panel-header">{title}</div>}
      <div className="panel-body">{children}</div>
    </div>
  );
}
