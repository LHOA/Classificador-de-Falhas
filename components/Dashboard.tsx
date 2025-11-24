import React, { useMemo } from 'react';
import { FailureRecord } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { AlertTriangle, CheckCircle, BrainCircuit, AlertOctagon, HelpCircle, Info } from 'lucide-react';

interface DashboardProps {
  data: FailureRecord[];
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  // Compute Metrics
  const metrics = useMemo(() => {
    const total = data.length;
    const critical = data.filter(d => d.impactCode === 'D').length;
    const humanCorrected = data.filter(d => d.status === 'Human').length;
    const avgConfidence = total > 0 
      ? data.reduce((acc, curr) => acc + curr.confidence, 0) / total 
      : 0;

    // Chart Data: Impact Distribution
    const impactCounts = data.reduce((acc, curr) => {
      acc[curr.impactCode] = (acc[curr.impactCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const impactData = Object.entries(impactCounts).map(([key, value]) => ({
      name: key, value
    }));

    // Chart Data: Top 5 Mechanisms
    const mechCounts = data.reduce((acc, curr) => {
      const simpleName = curr.mechanism.split('(')[0].trim().substring(0, 20);
      acc[simpleName] = (acc[simpleName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mechData = Object.entries(mechCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 5);

    return { total, critical, humanCorrected, avgConfidence, impactData, mechData };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
        <div className="bg-slate-100 p-6 rounded-full mb-4">
          <BrainCircuit className="w-12 h-12 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-600">No data available yet</h3>
        <p className="text-sm">Start classifying failures to see analytics here.</p>
      </div>
    );
  }

  const renderConfidenceBadge = (value: number) => {
    // Determine color based on confidence level
    let colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (value < 0.7) colorClass = "text-amber-700 bg-amber-50 border-amber-200";
    if (value < 0.5) colorClass = "text-red-700 bg-red-50 border-red-200";

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ml-2 ${colorClass}`}>
        {(value * 100).toFixed(0)}%
      </span>
    );
  };

  const getImpactBadge = (code: string, label: string) => {
    let styles = "bg-slate-100 text-slate-800 border-slate-200";
    if (code === 'D') styles = "bg-red-100 text-red-800 border-red-200";
    else if (code === 'S') styles = "bg-orange-100 text-orange-800 border-orange-200";
    else if (code === 'U') styles = "bg-yellow-100 text-yellow-800 border-yellow-200";

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${styles}`}>
            {code} - {label.split('(')[1]?.replace(')', '') || label}
        </span>
    );
  };

  const TableHeaderWithTooltip = ({ label, tooltipText }: { label: string, tooltipText: string }) => (
    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider group relative cursor-help">
      <div className="flex items-center gap-1">
        {label}
        <Info className="w-3.5 h-3.5 text-slate-400" />
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none">
        {tooltipText}
        <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </th>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Records</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Critical Failures</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">{metrics.critical}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertOctagon className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Human Correction Rate</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {metrics.total > 0 ? ((metrics.humanCorrected / metrics.total) * 100).toFixed(1) : 0}%
              </h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Avg AI Confidence</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {(metrics.avgConfidence * 100).toFixed(1)}%
              </h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impact Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="text-lg font-bold text-slate-800 mb-6">Failure Impact Distribution</h4>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.impactData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metrics.impactData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Mechanisms */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="text-lg font-bold text-slate-800 mb-6">Top 5 Failure Mechanisms</h4>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.mechData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DETAILED HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
           <h4 className="text-lg font-bold text-slate-800">Recent Classifications History</h4>
           <span className="text-xs text-slate-500 italic">Showing last {data.length} records</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Date / Tag
                </th>
                
                <TableHeaderWithTooltip 
                  label="Failure Impact" 
                  tooltipText="Severidade da falha (Input Manual)" 
                />
                
                <TableHeaderWithTooltip 
                  label="Failure Mode" 
                  tooltipText="O modo/como a falha se manifestou." 
                />
                
                <TableHeaderWithTooltip 
                  label="Failure Mechanism" 
                  tooltipText="O que pode ter causado a falha." 
                />
                
                <TableHeaderWithTooltip 
                  label="Detection Method" 
                  tooltipText="Como a falha pode ter sido detectada." 
                />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {data.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{record.tag}</span>
                      <span className="text-xs text-slate-500">{record.timestamp.toLocaleDateString()}</span>
                    </div>
                  </td>
                  
                  {/* Impact (User Input) */}
                  <td className="px-6 py-4">
                    {getImpactBadge(record.impactCode, record.impact)}
                  </td>

                  {/* Failure Mode */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-sm text-slate-700 font-medium">{record.modeCode}</span>
                        {renderConfidenceBadge(record.confidenceMode)}
                      </div>
                      <span className="text-xs text-slate-500 truncate max-w-[150px]" title={record.mode}>
                        {record.mode.length > 25 ? record.mode.substring(0, 25) + '...' : record.mode}
                      </span>
                    </div>
                  </td>

                  {/* Mechanism */}
                  <td className="px-6 py-4">
                     <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-sm text-slate-700 font-medium">{record.mechanismCode}</span>
                        {renderConfidenceBadge(record.confidenceMech)}
                      </div>
                      <span className="text-xs text-slate-500 truncate max-w-[150px]" title={record.mechanism}>
                        {record.mechanism.length > 25 ? record.mechanism.substring(0, 25) + '...' : record.mechanism}
                      </span>
                    </div>
                  </td>

                  {/* Detection */}
                  <td className="px-6 py-4">
                     <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-sm text-slate-700 font-medium">{record.detectionCode}</span>
                        {renderConfidenceBadge(record.confidenceDet)}
                      </div>
                      <span className="text-xs text-slate-500 truncate max-w-[150px]" title={record.detection}>
                        {record.detection.length > 25 ? record.detection.substring(0, 25) + '...' : record.detection}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;