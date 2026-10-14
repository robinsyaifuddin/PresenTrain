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
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-md transition-colors duration-150 cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white active:opacity-90',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:opacity-90',
    outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:opacity-90',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white active:opacity-90',
  };

  const sizes = {
    sm: 'px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs',
    md: 'px-3 py-2 sm:px-4 sm:py-2.5 text-xs md:text-sm',
    lg: 'px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm md:text-base',
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
