import React from 'react';
import { Activity, User } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-900 leading-tight">ISO 14224 Classifier</h1>
          <p className="text-xs text-slate-500 font-medium">AI-Powered Maintenance Intelligence</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-semibold text-slate-700">Engineer Admin</span>
          <span className="text-xs text-slate-400">Plant A - Unit 3</span>
        </div>
        <div className="bg-slate-100 p-2 rounded-full border border-slate-200">
          <User className="w-5 h-5 text-slate-600" />
        </div>
      </div>
    </header>
  );
};

export default Header;