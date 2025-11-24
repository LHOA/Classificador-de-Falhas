import React, { useMemo, useState } from 'react';
import { BarChart as IconBar, AlertTriangle, Lightbulb, Eye, CheckCircle2 } from 'lucide-react';
import { FailureRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardProps {
  data: FailureRecord[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const IMPACT_COLORS = { 'D': '#ef4444', 'S': '#f97316', 'U': '#eab308', 'X': '#94a3b8' };

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const { t, language } = useLanguage();
  const [showLegend, setShowLegend] = useState(true);

  const total = data.length;
  const critical = data.filter(r => r.impactCode === 'D').length;

  // --- CÁLCULO DE MÉDIA DE CONFIANÇA ---
  const avgConfMode = total > 0 ? (data.reduce((acc, r) => acc + r.confidenceMode, 0) / total * 100).toFixed(1) : "0.0";
  const avgConfMech = total > 0 ? (data.reduce((acc, r) => acc + r.confidenceMech, 0) / total * 100).toFixed(1) : "0.0";
  const avgConfDet = total > 0 ? (data.reduce((acc, r) => acc + r.confidenceDet, 0) / total * 100).toFixed(1) : "0.0";

  // Gráficos (Memoizado)
  const impactData = useMemo(() => {
    const counts = { 'D': 0, 'S': 0, 'U': 0, 'X': 0 };
    data.forEach(r => { if(counts[r.impactCode as keyof typeof counts] !== undefined) counts[r.impactCode as keyof typeof counts]++ });
    return Object.entries(counts).map(([key, val]) => ({ name: key, value: val }));
  }, [data]);

  const getDistribution = (field: keyof FailureRecord) => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
       const val = String(item[field]);
       // Remove código se tiver (ex: "VIB - Vibração" -> "Vibração")
       const label = val.includes('-') ? val.split('-')[1].trim() : val;
       counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  };

  const modeData = useMemo(() => getDistribution('mode'), [data]);
  const mechData = useMemo(() => getDistribution('mechanism'), [data]);

  // Pequeno componente para Cartão de Confiança
  const ConfidenceCard = ({ title, value }: { title: string, value: string }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
      <span className="text-xs font-bold text-slate-400 uppercase mb-1">{title}</span>
      <div className="flex items-end gap-1">
        <span className={`text-2xl font-bold ${parseFloat(value) > 85 ? 'text-emerald-600' : 'text-amber-500'}`}>
          {value}%
        </span>
        <span className="text-xs text-slate-400 mb-1">avg.</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. KPIs PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><IconBar className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('dash_total')}</p>
            <h3 className="text-2xl font-bold text-slate-900">{total}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('dash_critical')}</p>
            <h3 className="text-2xl font-bold text-slate-900">{critical}</h3>
          </div>
        </div>

        {/* CARTÕES DE CONFIANÇA (NOVO) */}
        <div className="col-span-2 grid grid-cols-3 gap-2">
           <ConfidenceCard title="Mode Conf." value={avgConfMode} />
           <ConfidenceCard title="Mech. Conf." value={avgConfMech} />
           <ConfidenceCard title="Det. Conf." value={avgConfDet} />
        </div>
      </div>

      {/* 2. GRÁFICOS */}
      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Impacto */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">{t('dash_impact_title')}</h3>
                <button onClick={() => setShowLegend(!showLegend)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-indigo-600"><Eye className="w-3 h-3" /> {t('dash_legend_toggle')}</button>
             </div>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={impactData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                     {impactData.map((entry, index) => <Cell key={`cell-${index}`} fill={IMPACT_COLORS[entry.name as keyof typeof IMPACT_COLORS] || '#ccc'} />)}
                   </Pie>
                   <Tooltip />
                   {showLegend && <Legend verticalAlign="bottom" height={36}/>}
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Modos */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4">{t('dash_mode_title')}</h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={modeData} layout="vertical" margin={{ left: 10 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                   <XAxis type="number" hide />
                   <YAxis type="category" dataKey="name" width={110} tick={{fontSize: 10}} />
                   <Tooltip />
                   <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Mecanismos */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
             <h3 className="font-bold text-slate-800 mb-4">{t('dash_mech_title')}</h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={mechData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                   <YAxis allowDecimals={false} />
                   <Tooltip />
                   <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {/* 3. TABELA RECENTE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{t('dash_recent')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-4">Tag</th>
                <th className="p-4">Mode</th>
                <th className="p-4">Mechanism</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No records found.</td></tr>
              ) : (
                data.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{record.tag}</td>
                    <td className="p-4 truncate max-w-xs">{record.mode}</td>
                    <td className="p-4 truncate max-w-xs">{record.mechanism}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.status === 'IA' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {record.status} ({ (record.confidence * 100).toFixed(0) }%)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
