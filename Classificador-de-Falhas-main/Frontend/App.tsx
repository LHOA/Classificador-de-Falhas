// src/App.tsx (Versão com Bloqueio de Carregamento Inicial)
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react'; // Importando o ícone de loading
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import QuotaModal from './components/QuotaModal';
import { FailureRecord, TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { registrarUsuarioNoBackend } from './services/aiService';

// Limite global
const GLOBAL_USAGE_LIMIT = 30;

type UserStatus = 'needs_register' | 'registered' | 'limit_reached';

const AppContent: React.FC = () => {
  const { t } = useLanguage(); 
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);
  
  const [userStatus, setUserStatus] = useState<UserStatus>('needs_register');
  const [showModal, setShowModal] = useState(true); 
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  
  // --- NOVO ESTADO CRÍTICO: Carregamento Inicial ---
  // Começa TRUE para bloquear tudo até verificar o backend
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisteringBackend, setIsRegisteringBackend] = useState(false);

  // --- LÓGICA DE INICIALIZAÇÃO BLINDADA ---
  useEffect(() => {
    const checkUserStatusOnLoad = async () => {
        // Garante que estamos carregando
        setIsLoading(true);
        
        const email = localStorage.getItem('user_email');
        const name = localStorage.getItem('user_name');
        
        if (email && name) {
            try {
                // Pergunta ao backend o status atual
                const response = await registrarUsuarioNoBackend(email, name);
                
                if (response.total_uses >= GLOBAL_USAGE_LIMIT) {
                    setUserStatus('limit_reached');
                    setShowModal(false);
                    setShowLimitMessage(true);
                } else {
                    setUserStatus('registered');
                    setShowModal(false);
                    setShowLimitMessage(false);
                }
            } catch (error) {
                console.error("Erro ao sincronizar, forçando registro por segurança:", error);
                setUserStatus('needs_register');
                setShowModal(true);
            } finally {
                // --- O PULO DO GATO ---
                // Só libera a interface DEPOIS que o backend respondeu (ou deu erro)
                setIsLoading(false);
            }
        } else {
            // Se não tem dados locais, libera o loading e mostra o modal de registro
            setUserStatus('needs_register');
            setShowModal(true);
            setIsLoading(false);
        }
    };

    checkUserStatusOnLoad();
  }, []);
  // ------------------------------------

  const handleShowRegister = () => {
    if (userStatus === 'limit_reached') {
        setShowLimitMessage(true);
    } else {
        setUserStatus('needs_register');
        setShowModal(true);
    }
  };
  
  const handleShowLimitReached = () => {
    setUserStatus('limit_reached');
    setShowLimitMessage(true);
  };

  const handleRegisterSuccess = async (email: string, name: string) => {
    setIsRegisteringBackend(true);
    try {
        const response = await registrarUsuarioNoBackend(email, name);
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_name', name);
        
        if (response.total_uses >= GLOBAL_USAGE_LIMIT) {
             setUserStatus('limit_reached');
             setShowLimitMessage(true);
        } else {
             setUserStatus('registered');
             setShowLimitMessage(false);
        }
        setShowModal(false);

    } catch (error) {
        alert("Houve um problema ao conectar com o servidor de registro.");
    } finally {
        setIsRegisteringBackend(false);
    }
  };

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

  // --- BLOQUEIO TOTAL DURANTE O CARREGAMENTO ---
  if (isLoading) {
    return (
        <div className="flex h-screen bg-slate-50 items-center justify-center">
            <div className="text-center animate-in fade-in duration-500">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Iniciando Failure Map...</h2>
                <p className="text-slate-500 text-sm mt-2">Verificando credenciais e status do servidor.</p>
            </div>
        </div>
    );
  }
  // ---------------------------------------------

  const isQuotaEnforced = userStatus === 'limit_reached';
  const disableClassifier = userStatus === 'needs_register'; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden animate-in fade-in">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {disableClassifier && !showModal && !showLimitMessage && (
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
                isQuotaEnforced={isQuotaEnforced}
              />
            )}
            
            {currentTab === TabView.BATCH && (
              <BatchProcessor 
                 onBatchComplete={addBatchRecords}
                 onShowRegister={handleShowRegister}
                 onShowLimitReached={handleShowLimitReached}
                 isRegistered={userStatus === 'registered'}
              />
            )}
            
            {currentTab === TabView.DICTIONARY && <Dictionary />}
           </div>
        </main>
      </div>
      
      {/* Modais */}
      {showModal && userStatus === 'needs_register' && !showLimitMessage && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => {}} 
          showContactMessage={false}
          isRegistering={isRegisteringBackend}
        />
      )}
      
      {showLimitMessage && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => setShowLimitMessage(false)}
          showContactMessage={true}
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
