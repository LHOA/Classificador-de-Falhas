// src/components/ClassificationResult.tsx (Versão Compacta e Editável)
import React from 'react';
import { CheckCircle, Save, X, Activity, Settings, Search, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET } from '../constants';

interface ClassificationResultProps {
  resultApi: RespostaAPI; // Todos os dados da API
  selected: { mode: any, mech: any, det: any }; // A seleção atual
  setSelected: React.Dispatch<React.SetStateAction<{ mode: any, mech: any, det: any } | null>>;
  onSave: () => void;
  onCancel: () => void;
}

const ClassificationResult: React.FC<ClassificationResultProps> = ({ resultApi, selected, setSelected, onSave, onCancel }) => {
  const { t, language } = useLanguage();

  const getLabel = (map: any, code: string) => {
    if (!map || !code) return code;
    if (map[code] && map[code][language]) {
        return map[code][language];
    }
    return code;
  };

  // Função para atualizar a seleção quando o usuário muda um dropdown
  const handleSelectionChange = (type: 'mode' | 'mech' | 'det', code: string) => {
    let dataList;
    if (type === 'mode') dataList = resultApi.modo;
    else if (type === 'mech') dataList = resultApi.mecanismo;
    else dataList = resultApi.deteccao;

    // Encontra o objeto completo baseado no código selecionado
    const newSelection = dataList.find((item: any) => item.codigo === code);
    
    if (newSelection) {
        setSelected(prev => prev ? ({ ...prev, [type]: newSelection }) : null);
    }
  };

  // Componente interno do Card Editável
  const ResultCardEditable = ({ title, icon: Icon, dataList, map, colorClass, selectedItem, type }: any) => {
    const confidence = (selectedItem.confianca * 100).toFixed(1);
    const isHighConfidence = Number(confidence) > 80;

    return (
      // Reduzido padding para p-5
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-2 ${colorClass} bg-opacity-10 rounded-bl-xl`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">{title}</h4>
        
        {/* Dropdown de Seleção */}
        <div className="relative mb-3">
            <select
                value={selectedItem.codigo}
                onChange={(e) => handleSelectionChange(type, e.target.value)}
                className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all truncate cursor-pointer hover:bg-slate-100"
            >
                {dataList.map((item: any) => (
                    <option key={item.codigo} value={item.codigo}>
                        {getLabel(map, item.codigo)} ({(item.confianca * 100).toFixed(0)}%)
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-slate-600" />
        </div>

        <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">Code: {selectedItem.codigo}</p>
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{t('conf')}</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${isHighConfidence ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${confidence}%` }}></div>
                    </div>
                    <span className={`text-sm font-bold ${isHighConfidence ? 'text-emerald-600' : 'text-amber-600'}`}>{confidence}%</span>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    // Reduzido padding para p-6
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 h-full shadow-inner relative">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
        <CheckCircle className="w-6 h-6" />
      </div>

      <h3 className="text-xl font-bold text-slate-800 text-center mb-2 mt-2">{t('results_title')}</h3>
      <p className="text-slate-600 text-center mb-6 text-sm">Se necessário, clique nas opções abaixo para alterar.</p>

      {/* Reduzido gap-4 */}
      <div className="space-y-4 mb-6">
        <ResultCardEditable 
            title={t('label_mode')} 
            icon={Activity} 
            dataList={resultApi.modo} 
            map={MAP_MODE} 
            colorClass="text-indigo-600"
            selectedItem={selected.mode}
            type="mode"
        />
        <ResultCardEditable 
            title={t('label_mech')} 
            icon={Settings} 
            dataList={resultApi.mecanismo} 
            map={MAP_MECH} 
            colorClass="text-emerald-600" 
            selectedItem={selected.mech}
            type="mech"
        />
        <ResultCardEditable 
            title={t('label_det')} 
            icon={Search} 
            dataList={resultApi.deteccao} 
            map={MAP_DET} 
            colorClass="text-sky-600" 
            selectedItem={selected.det}
            type="det"
        />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onSave}
          // Reduzido padding e tamanho de fonte
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          <Save className="w-5 h-5" /> {t('btn_save')}
        </button>
        
        <button
          onClick={onCancel}
          // Reduzido padding e tamanho de fonte
          className="w-full bg-white border-2 border-slate-300 text-slate-600 font-bold py-2.5 px-6 rounded-xl hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <X className="w-5 h-5" /> {t('btn_cancel_edit')}
        </button>
      </div>
    </div>
  );
};

export default ClassificationResult;
