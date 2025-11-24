import React from 'react';
import { BarChart, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { FailureRecord } from '../types';
// 1. Importar o hook
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  data: FailureRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  // 2. Usar o hook
  const { t } = useLanguage();

  const total = data.length;
  const critical = data.filter(r => r.impactCode === 'D').length;
  const humanModified = data.filter(r => r.status === 'Human').length;
  // Evita divisão por zero
  const accuracy = total > 0 ? ((total - humanModified) / total) * 100 : 100;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <BarChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
               {/* Se você quiser traduzir aqui, adicione 'dash_total' no LanguageContext ou use texto fixo */}
               Total Records
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{total}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Critical Failures</p>
            <h3 className="text-2xl font-bold text-slate-900">{critical}</h3>
          </div>
        </div>

        {/* ... Outros cards ... */}
      </div>

      {/* Tabela Recente */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Recent Analysis</h3>
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
                data.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{record.tag}</td>
                    {/* AQUI ESTÁ O SEGREDO: O record já vem traduzido do Classifier.tsx se você salvou corretamente! */}
                    <td className="p-4">{record.mode}</td>
                    <td className="p-4">{record.mechanism}</td>
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
