import React from 'react';

export default function CoolLoader({ 
  text = 'Memuat Data...', 
  fullScreen = true,
  className = ''
}) {
  const content = (
    <div className="flex flex-col items-center justify-center p-4 text-center select-none animate-dynamic-reveal">
      {/* Lightweight & Smooth Spinning Rings */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
        {/* Track Ring */}
        <div className="absolute inset-0 rounded-full border-3 border-emerald-100" />

        {/* Primary Spinner */}
        <div 
          className="absolute inset-0 rounded-full border-3 border-transparent border-t-emerald-600 border-r-emerald-500 animate-spin" 
          style={{ animationDuration: '0.85s' }} 
        />

        {/* Inner Counter Spinner */}
        <div 
          className="absolute inset-1.5 rounded-full border-2 border-transparent border-b-teal-500 border-l-emerald-400 animate-spin" 
          style={{ animationDirection: 'reverse', animationDuration: '1.2s' }} 
        />
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className={`w-full py-12 flex items-center justify-center ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[9999] bg-white/75 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 ${className}`}>
      {content}
    </div>
  );
}
