import React from 'react';

export default function Table({ headers, children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white ${className}`}>
      <table className="w-full text-left border-collapse text-xs md:text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            {headers.map((header, idx) => (
              <th key={idx} className="py-3 px-4">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  );
}
