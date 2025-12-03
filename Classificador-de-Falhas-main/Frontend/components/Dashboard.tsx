// src/components/Dashboard.tsx (Versão Final Completa)
import React, { useMemo, useState } from 'react';
import { 
  BarChart as IconBar, AlertTriangle, Eye, Download, 
  ChevronDown, ChevronUp, ListFilter, History 
} from 'lucide-react';
import { FailureRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardProps {
  data: FailureRecord[];
  // Prop para carregar dados do banco
  onLoadHistory: () => void; 
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const IMPACT_COLORS = { 'D': '#ef4444', 'S': '#f97316', 'U': '#eab308', 'X': '#94a3b8' };
const ITEMS_PER_PAGE = 8; // Quantos itens mostram antes de expandir

const Dashboard: React.FC<DashboardProps> = ({ data, onLoadHistory }) => {
  const { t, language } = useLanguage();
  const [showLegend, setShowLegend] = useState(true);
  // Estado para controlar o "Ver Tudo" da tabela
  const [isExpanded, setIsExpanded] = useState(false); 

  const total = data.length;
  const critical = data.filter(r => r.impactCode === 'D').length;

  // Cálculo de Confianças Médias
  const avgConfMode = total > 0 ? (data.reduce((acc, r) => acc + r.confidenceMode, 0) / total * 100).toFixed(1) : "0.0";
  const avgConfMech = total > 0 ? (data.reduce((acc, r) => acc + r.confidenceMech, 0) / total * 100).toFixed(1) : "0.0";
  const avgConfDet = total > 0 ? (data.reduce((acc, r) => acc + r.confidenceDet, 0) / total * 100).toFixed(1) : "0.0";

  // Preparação de Dados para Gráficos
  const impactData = useMemo(() => {
    const counts = { 'D': 0, 'S': 0, 'U': 0, 'X': 0 };
    data.forEach(r => { if(counts[r.impactCode as keyof typeof counts] !== undefined) counts[r.impactCode as keyof typeof counts]++ });
    return Object.entries(counts).map(([key, val]) => ({ name: key, value: val }));
  }, [data]);

  const getDistribution = (field: keyof FailureRecord) => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
       const val = String(item[field]);
       const label = val.includes('-') ? val.split('-')[1].trim() : val;
       counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  };

  const modeData = useMemo(() => getDistribution('mode'), [data]);
  const mechData = useMemo(() => getDistribution('mechanism'), [data]);

  // Define quais dados mostrar na tabela (Limitado ou Tudo)
  const displayedData = isExpanded ? data : data.slice(0, ITEMS_PER_PAGE);

  const ConfidenceCard = ({ title, value }: { title: string, value: string }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center hover:shadow-md transition-shadow">
      <span className="text-xs font-bold text-slate-400 uppercase mb-1">{title}</span>
      <div className="flex items-end gap-1">
        <span className={`text-2xl font-bold ${parseFloat(value) > 85 ? 'text-emerald-600' : 'text-amber-500'}`}>
          {value}%
        </span>
        <span className="text-xs text-slate-400 mb-1">avg.</span>
      </div>
    </div>
  );

  const downloadHistory = () => {
    if (data.length === 0) return;
    const header = ["Date", "Tag", "Description", "Impact", "Mode", "Mechanism", "Detection", "Status", "Confidence"];
    const rows = data.map(r => [
      new Date(r.timestamp).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US'),
      r.tag, `"${r.description.replace(/"/g, '""')}"`, r.impactCode, r.mode, r.mechanism, r.detection, r.status, (r.confidence * 100).toFixed(1) + '%'
    ]);
    const separator = ','; 
    const csvContent = ["\uFEFF" + header.join(separator), ...rows.map(r => r.join(separator))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FailureMap_History_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. KPIs */}
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

        <div className="col-span-2 grid grid-cols-3 gap-2">
           <ConfidenceCard title="Mode Conf." value={avgConfMode} />
           <ConfidenceCard title="Mech. Conf." value={avgConfMech} />
           <ConfidenceCard title="Det. Conf." value={avgConfDet} />
        </div>
      </div>

      {/* 2. GRÁFICOS */}
      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">{t('dash_recent')}</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                {data.length} total
            </span>
          </div>
          
          <div className="flex gap-2">
              {/* BOTÃO CARREGAR HISTÓRICO DO BANCO */}
              <button 
                onClick={onLoadHistory} 
                className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
                title="Carregar análises salvas anteriormente do servidor"
              >
                <History className="w-4 h-4" /> Carregar Histórico
              </button>

              {/* BOTÃO DOWNLOAD CSV */}
              {data.length > 0 && (
                <button onClick={downloadHistory} className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                  <Download className="w-4 h-4" /> {t('btn_download')}
                </button>
              )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-4 w-24">{t('label_tag')}</th>
                <th className="p-4 w-20">Imp.</th>
                <th className="p-4 w-64">{t('label_desc')}</th>
                <th className="p-4">{t('label_mode')}</th>
                <th className="p-4">{t('label_mech')}</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedData.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">Nenhum registro encontrado.</td></tr>
              ) : (
                displayedData.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                    <td className="p-4 font-bold text-slate-900">{record.tag}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${record.impactCode === 'D' ? 'bg-red-100 text-red-700' : record.impactCode === 'S' ? 'bg-orange-100 text-orange-700' : record.impactCode === 'U' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                        {record.impactCode}
                      </span>
                    </td>
                    <td className="p-4"><div className="truncate max-w-[200px] text-slate-500" title={record.description}>{record.description}</div></td>
                    <td className="p-4 truncate max-w-[150px]" title={record.mode}>{record.mode}</td>
                    <td className="p-4 truncate max-w-[150px]">{record.mechanism}</td>
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
        
        {/* RODAPÉ DA TABELA: Botão Ver Mais / Ver Menos */}
        {data.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors px-6 py-2 rounded-full hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200"
                >
                    {isExpanded ? (
                        <> {t('btn_view_less')} <ChevronUp className="w-4 h-4" /> </>
                    ) : (
                        <> {t('btn_view_all')} ({data.length - ITEMS_PER_PAGE} +) <ChevronDown className="w-4 h-4" /> </>
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
