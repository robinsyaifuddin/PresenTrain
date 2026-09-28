import React from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

export default function StatusBar() {
  return (
    <div className="flex justify-between items-center px-6 pt-3 pb-1 text-slate-600 text-xs font-medium select-none z-40 bg-transparent">
      <span>9:41</span>
      <div className="flex items-center space-x-1.5 opacity-90">
        <Signal className="w-3.5 h-3.5 text-slate-600" />
        <Wifi className="w-3.5 h-3.5 text-slate-600" />
        <BatteryMedium className="w-4 h-4 text-slate-600" />
      </div>
    </div>
  );
}
