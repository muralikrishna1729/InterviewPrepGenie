import React from 'react';

// Variants: primary (gradient), secondary (outline), destructive (red)
export default function Button({
  children,
  className = '',
  variant = 'primary',
  as: Comp = 'button',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-600',
    secondary: 'text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-indigo-600',
    destructive: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-600',
  };
  const sizes = 'px-5 py-2.5 text-sm';
  return (
    <Comp className={[base, variants[variant], sizes, className].join(' ')} {...props}>
      {children}
    </Comp>
  );
}
