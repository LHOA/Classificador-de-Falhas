import React, { useState, useMemo } from 'react';
import { BarChart as IconBar, AlertTriangle, Lightbulb, Eye } from 'lucide-react';
import { FailureRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
// Importações do Recharts
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardProps {
  data: FailureRecord[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const IMPACT_COLORS = { 'D': '#ef4444', 'S': '#f97316', 'U': '#eab308', 'X': '#94a3b8' };

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const { t } = useLanguage();
  const [showLegend, setShowLegend] = useState(true);

  // --- ÁREA DE CÁLCULO DE DADOS ---
  const total = data.length;
  const critical = data.filter(r => r.impactCode === 'D').length;

  // Função auxiliar para contar ocorrências
  const getDistribution = (field: keyof FailureRecord, topN = 5) => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
      const val = String(item[field]);
      // Remove o código (ex: "VIB - Vibração" -> "Vibração" para ficar mais limpo no gráfico)
      // Ou mantemos o código se preferir. Vamos limpar para ficar bonito.
      const label = val.includes('-') ? val.split('-')[1].trim() : val;
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
  };

  // Dados calculados (useMemo evita recalcular toda hora)
  const impactData = useMemo(() => {
    const counts = { 'D': 0, 'S': 0, 'U': 0, 'X': 0 };
    data.forEach(r => { if(counts[r.impactCode as keyof typeof counts] !== undefined) counts[r.impactCode as keyof typeof counts]++ });
    return Object.entries(counts).map(([key, val]) => ({ name: key, value: val }));
  }, [data]);

  const modeData = useMemo(() => getDistribution('mode'), [data]);
  const mechData = useMemo(() => getDistribution('mechanism'), [data]);

  // --- LÓGICA DE INSIGHTS ---
  const criticalPercentage = total > 0 ? ((critical + (data.filter(r=>r.impactCode==='S').length)) / total * 100).toFixed(0) : 0;
  const topMode = modeData.length > 0 ? modeData[0].name : 'N/A';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <IconBar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('dash_total')}</p>
            <h3 className="text-2xl font-bold text-slate-900">{total}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('dash_critical')}</p>
            <h3 className="text-2xl font-bold text-slate-900">{critical}</h3>
          </div>
        </div>

        {/* Insight Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-yellow-300" />
            <h4 className="font-bold text-sm uppercase tracking-wider">{t('dash_insight_title')}</h4>
          </div>
          <div className="text-sm space-y-1">
             <p>• <strong>{criticalPercentage}%</strong> {t('dash_insight_critical')}</p>
             <p>• <strong>{topMode}</strong> {t('dash_insight_mode')}</p>
          </div>
        </div>
      </div>

      {/* 2. GRÁFICOS */}
      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico de Impacto (Pizza) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">{t('dash_impact_title')}</h3>
                <button onClick={() => setShowLegend(!showLegend)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-indigo-600">
                   <Eye className="w-3 h-3" /> {t('dash_legend_toggle')}
                </button>
             </div>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={impactData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {impactData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={IMPACT_COLORS[entry.name as keyof typeof IMPACT_COLORS] || '#ccc'} />
                     ))}
                   </Pie>
                   <Tooltip />
                   {showLegend && <Legend verticalAlign="bottom" height={36}/>}
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Gráfico de Modos (Barras) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">{t('dash_mode_title')}</h3>
             </div>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={modeData} layout="vertical" margin={{ left: 40 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                   <XAxis type="number" hide />
                   <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}} />
                   <Tooltip />
                   <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
           
           {/* Gráfico de Mecanismos (Barras Vertical) */}
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

      {/* 3. TABELA RECENTE (Mantivemos pois é útil) */}
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
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                data.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{record.tag}</td>
                    <td className="p-4 truncate max-w-xs" title={record.mode}>{record.mode}</td>
                    <td className="p-4 truncate max-w-xs">{record.mechanism}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        record.status === 'IA' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {record.status}
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
