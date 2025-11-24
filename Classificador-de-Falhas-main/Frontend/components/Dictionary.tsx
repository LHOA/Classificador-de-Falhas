import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

type DictionaryTab = 'mode' | 'mech' | 'det' | 'impact';

const Dictionary: React.FC = () => {
  const { language, t } = useLanguage(); // Usa o idioma atual
  const [activeTab, setActiveTab] = useState<DictionaryTab>('mode');
  const [searchTerm, setSearchTerm] = useState('');

  // Seleciona o mapa correto com base na aba
  const getCurrentMap = () => {
    switch (activeTab) {
      case 'mode': return MAP_MODE;
      case 'mech': return MAP_MECH;
      case 'det': return MAP_DET;
      case 'impact': return MAP_IMPACTO;
      default: return MAP_MODE;
    }
  };

  const currentMap = getCurrentMap();

  // Filtra os itens baseado na busca e no idioma atual
  const filteredItems = Object.entries(currentMap).filter(([code, val]) => {
    // val é um objeto {pt: '...', en: '...'}
    // Precisamos buscar dentro do idioma correto
    const text = val[language].toLowerCase(); 
    const search = searchTerm.toLowerCase();
    return code.toLowerCase().includes(search) || text.includes(search);
  });

  const TabButton = ({ id, label }: { id: DictionaryTab, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${activeTab === id 
          ? 'bg-indigo-600 text-white shadow-md' 
          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header e Busca */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {language === 'pt' ? 'Catálogo ISO 14224' : 'ISO 14224 Catalog'}
              </h3>
              <p className="text-sm text-slate-500">
                {language === 'pt' ? 'Referência completa de códigos' : 'Complete code reference'}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={language === 'pt' ? "Buscar código ou descrição..." : "Search code or description..."}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Abas */}
        <div className="flex flex-wrap gap-2">
          <TabButton id="mode" label={t('label_mode')} />
          <TabButton id="mech" label={t('label_mech')} />
          <TabButton id="det" label={t('label_det')} />
          <TabButton id="impact" label={t('label_impact')} />
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-4 w-32">Code</th>
                <th className="p-4">Description ({language.toUpperCase()})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map(([code, val]) => (
                  <tr key={code} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600 bg-indigo-50/50">
                      {code}
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {val[language]} {/* Aqui exibe o texto correto */}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-slate-400">
                    {language === 'pt' ? 'Nenhum código encontrado.' : 'No codes found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dictionary;
