import React from 'react';

export default function Input({ 
  label, 
  error, 
  icon: Icon, 
  className = '', 
  ...props 
}) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-bold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          className={`w-full rounded-2xl bg-white border text-xs md:text-sm font-medium transition-all ${
            Icon ? 'pl-10' : 'px-4'
          } py-2.5 ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          } outline-none ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
