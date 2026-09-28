import React from 'react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false, 
  onClick, 
  type = 'button',
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-2xl transition-all cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-[0.98]',
    outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs active:scale-[0.98]',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-xs md:text-sm',
    lg: 'px-6 py-3.5 text-sm md:text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
