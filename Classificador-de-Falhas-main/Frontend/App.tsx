import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import { FailureRecord, TabView } from './types';
// 1. Importar o Contexto
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// 2. Criamos um componente interno para segurar a lógica
// Isso é necessário para podermos usar o hook 'useLanguage' aqui dentro
const AppContent: React.FC = () => {
  const { t } = useLanguage(); // Hook de tradução
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);

  const addRecord = (record: FailureRecord) => {
    setHistory(prev => [record, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  const addBatchRecords = (records: FailureRecord[]) => {
    setHistory(prev => [...records, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  // Função auxiliar para pegar o título traduzido baseado na aba
  const getTitle = () => {
    switch (currentTab) {
      case TabView.DASHBOARD: return t('nav_dashboard');
      case TabView.CLASSIFIER: return t('nav_classifier');
      case TabView.BATCH: return t('nav_batch');
      case TabView.DICTIONARY: return t('nav_dictionary');
      default: return 'Failure Map';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar agora já tem acesso ao contexto por estar dentro do Provider */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-7xl mx-auto">
            {/* Breadcrumb / Header - Agora Traduzido */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 capitalize">
                {getTitle()}
              </h2>
            </div>

            {currentTab === TabView.DASHBOARD && <Dashboard data={history} />}
            {currentTab === TabView.CLASSIFIER && <Classifier onSave={addRecord} />}
            {currentTab === TabView.BATCH && <BatchProcessor onBatchComplete={addBatchRecords} />}
            {currentTab === TabView.DICTIONARY && <Dictionary />}
           </div>
        </main>
      </div>
    </div>
  );
};

// 3. O Componente Principal App apenas fornece o Contexto
const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
