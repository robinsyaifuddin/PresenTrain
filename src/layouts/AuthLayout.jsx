import React from 'react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4">
      {children}
    </div>
  );
}
