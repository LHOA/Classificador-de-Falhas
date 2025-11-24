import React, { useState } from 'react';
import { MAP_MODE, MAP_MECH, MAP_DET } from '../constants';
import { Search } from 'lucide-react';

const Dictionary: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'MODE' | 'MECH' | 'DET'>('MODE');
  const [searchTerm, setSearchTerm] = useState('');

  const getData = () => {
    switch (activeCategory) {
      case 'MODE': return MAP_MODE;
      case 'MECH': return MAP_MECH;
      case 'DET': return MAP_DET;
      default: return {};
    }
  };

  const filteredData = Object.entries(getData()).filter(([code, desc]) => 
    code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">ISO 14224 Dictionary</h3>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-lg">
            {(['MODE', 'MECH', 'DET'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${activeCategory === cat ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                `}
              >
                {cat === 'MODE' ? 'Failure Modes' : cat === 'MECH' ? 'Mechanisms' : 'Detection'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search codes..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase w-32">Code</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? (
              filteredData.map(([code, desc]) => (
                <tr key={code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-sm text-indigo-600 font-medium">{code}</td>
                  <td className="px-6 py-3 text-sm text-slate-700">{desc}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-slate-400">
                  No matching codes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dictionary;