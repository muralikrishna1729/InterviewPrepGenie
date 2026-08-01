import React from 'react';

/**
 * Card — uses CSS variable tokens so light/dark theme toggle actually changes colors.
 * Previously hardcoded bg-white which made dark mode invisible.
 */
export default function Card({ children, className = '' }) {
  return (
    <div
      className={['rounded-2xl shadow-sm p-6', className].join(' ')}
      style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}
