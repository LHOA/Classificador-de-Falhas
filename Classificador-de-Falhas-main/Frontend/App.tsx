// src/App.tsx (Versão com Registro no Backend Conectado)
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import QuotaModal from './components/QuotaModal';
import { FailureRecord, TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
// IMPORTANTE: Importar a nova função do serviço
import { registrarUsuarioNoBackend } from './services/aiService';

type UserStatus = 'needs_register' | 'registered' | 'limit_reached';

const AppContent: React.FC = () => {
  const { t } = useLanguage(); 
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);
  
  const [userStatus, setUserStatus] = useState<UserStatus>('needs_register');
  const [showModal, setShowModal] = useState(false);
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  
  // NOVO ESTADO: Para controlar o loading durante o registro no servidor
  const [isRegisteringBackend, setIsRegisteringBackend] = useState(false);

  // --- 1. Verifica Registro na Inicialização ---
  useEffect(() => {
    const email = localStorage.getItem('user_email');
    
    if (email) {
        setUserStatus('registered');
        setShowModal(false);
    } else {
        setUserStatus('needs_register');
        setShowModal(true);
    }
  }, []);

  // Handlers de Quota
  const handleShowRegister = () => {
    setUserStatus('needs_register');
    setShowModal(true);
  };
  
  const handleShowLimitReached = () => {
    setUserStatus('limit_reached');
    setShowLimitMessage(true);
  };

  // --- CORREÇÃO PRINCIPAL AQUI: Função agora é ASYNC ---
  const handleRegisterSuccess = async (email: string, name: string) => {
    // 1. Inicia estado de loading
    setIsRegisteringBackend(true);

    try {
        // 2. Tenta registrar no servidor Python (aguarda a resposta)
        await registrarUsuarioNoBackend(email, name);

        // 3. Se deu certo, salva no navegador
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_name', name);
        
        // 4. Atualiza a tela
        setUserStatus('registered');
        setShowModal(false);
        setShowLimitMessage(false);

    } catch (error) {
        // Se der erro no servidor, mostramos um alerta (simples por enquanto)
        alert("Houve um problema ao conectar com o servidor de registro. Tente novamente em instantes.");
        console.error("Falha no registro:", error);
        // Não salvamos no localStorage se falhou no backend
    } finally {
        // 5. Finaliza o loading, independente de sucesso ou erro
        setIsRegisteringBackend(false);
    }
  };

  // Funções de Dados
  const addRecord = (record: FailureRecord) => {
    setHistory(prev => [record, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  const addBatchRecords = (records: FailureRecord[]) => {
    setHistory(prev => [...records, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  const getTitle = () => {
    switch (currentTab) {
      case TabView.DASHBOARD: return t('nav_dashboard');
      case TabView.CLASSIFIER: return t('nav_classifier');
      case TabView.BATCH: return t('nav_batch');
      case TabView.DICTIONARY: return t('nav_dictionary');
      default: return t('app_title');
    }
  };

  const isQuotaEnforced = userStatus === 'limit_reached';
  const disableClassifier = userStatus === 'needs_register'; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* <Header /> */}
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {disableClassifier && !showModal && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-lg animate-bounce">
                    Clique para Registrar e Acessar
                </button>
             </div>
           )}

           <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 capitalize">
                {getTitle()}
              </h2>
            </div>

            {currentTab === TabView.DASHBOARD && <Dashboard data={history} />}
            
            {currentTab === TabView.CLASSIFIER && (
              <Classifier 
                onSave={addRecord} 
                onShowRegister={handleShowRegister} 
                onShowLimitReached={handleShowLimitReached} 
                isQuotaEnforced={isQuotaEnforced || disableClassifier}
              />
            )}
            
            {currentTab === TabView.BATCH && (
              <BatchProcessor 
                 onBatchComplete={addBatchRecords}
                 onShowRegister={handleShowRegister}
                 onShowLimitReached={handleShowLimitReached}
              />
            )}
            
            {currentTab === TabView.DICTIONARY && <Dictionary />}
           </div>
        </main>
      </div>
      
      {/* Modais */}
      {showModal && userStatus === 'needs_register' && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => {}} 
          showContactMessage={false}
          // Passamos o estado de loading para o modal
          isRegistering={isRegisteringBackend}
        />
      )}
      
      {showLimitMessage && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => setShowLimitMessage(false)}
          showContactMessage={true}
          // No caso de limite atingido, o registro é instantâneo (só fecha o modal), não precisa de loading
          isRegistering={false} 
        />
      )}
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
