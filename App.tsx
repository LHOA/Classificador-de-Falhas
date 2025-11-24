import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import { FailureRecord, TabView } from './types';

const App: React.FC = () => {
  // Authentication state removed as requested
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);

  const addRecord = (record: FailureRecord) => {
    setHistory(prev => [record, ...prev]);
    setCurrentTab(TabView.DASHBOARD); // Redirect to dashboard to see result
  };

  const addBatchRecords = (records: FailureRecord[]) => {
    setHistory(prev => [...records, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-7xl mx-auto">
            {/* Breadcrumb / Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 capitalize">
                {currentTab === TabView.DASHBOARD ? 'Analytical Overview' : 
                 currentTab === TabView.CLASSIFIER ? 'AI Classifier' : 
                 currentTab === TabView.BATCH ? 'Batch Processing' : 'Code Dictionary'}
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

export default App;