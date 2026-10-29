import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import { TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.CLASSIFIER);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getTitle = () => {
    switch (currentTab) {
      case TabView.DASHBOARD: return t('nav_dashboard');
      case TabView.CLASSIFIER: return t('nav_classifier');
      case TabView.BATCH: return t('nav_batch');
      case TabView.DICTIONARY: return t('nav_dictionary');
      default: return t('app_title');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden animate-in fade-in">
      <div className={`fixed inset-y-0 left-0 z-30 w-full max-w-[280px] md:max-w-none md:w-64 bg-slate-900 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} onCloseMobile={() => setIsSidebarOpen(false)} />
      </div>
      {isSidebarOpen && (<div className="fixed inset-0 z-20 bg-slate-900/50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>)}

      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <header className="md:hidden h-16 flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-slate-100"><Menu className="h-6 w-6" /></button>
          <span className="text-xl font-bold text-slate-900">{getTitle()}</span>
          <div className="w-6 h-6"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 hidden md:block">
              <h2 className="text-2xl font-bold text-slate-900 capitalize">{getTitle()}</h2>
            </div>

            {currentTab === TabView.DASHBOARD && <Dashboard />}
            {currentTab === TabView.CLASSIFIER && (
              <Classifier onSave={() => setCurrentTab(TabView.DASHBOARD)} />
            )}
            {currentTab === TabView.BATCH && (
              <BatchProcessor
                onBatchComplete={() => setCurrentTab(TabView.DASHBOARD)}
                onGoToDashboard={() => setCurrentTab(TabView.DASHBOARD)}
              />
            )}
            {currentTab === TabView.DICTIONARY && <Dictionary />}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
