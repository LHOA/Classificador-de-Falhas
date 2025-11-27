// src/App.tsx (Versão com Sincronização de Limite ao Recarregar)
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import QuotaModal from './components/QuotaModal';
import { FailureRecord, TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { registrarUsuarioNoBackend } from './services/aiService';

// Defina o limite aqui também para facilitar a manutenção
const GLOBAL_USAGE_LIMIT = 30;

type UserStatus = 'needs_register' | 'registered' | 'limit_reached';

const AppContent: React.FC = () => {
  const { t } = useLanguage(); 
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);
  
  // Estado inicial 'needs_register' até provar o contrário
  const [userStatus, setUserStatus] = useState<UserStatus>('needs_register');
  // Começa true para garantir que a verificação ocorra antes de liberar
  const [showModal, setShowModal] = useState(true); 
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  
  const [isRegisteringBackend, setIsRegisteringBackend] = useState(false);

  // --- NOVA LÓGICA DE INICIALIZAÇÃO ---
  useEffect(() => {
    const checkUserStatusOnLoad = async () => {
        const email = localStorage.getItem('user_email');
        const name = localStorage.getItem('user_name');
        
        if (email && name) {
            // Se tem dados locais, vamos SINCRONIZAR com o backend para ver o uso real
            try {
                setIsRegisteringBackend(true); // Mostra loading se o modal estiver aberto
                const response = await registrarUsuarioNoBackend(email, name);
                
                // VERIFICAÇÃO CRUCIAL: O backend diz que já passou do limite?
                if (response.total_uses >= GLOBAL_USAGE_LIMIT) {
                    setUserStatus('limit_reached');
                    setShowModal(false); // Fecha o modal de registro
                    setShowLimitMessage(true); // Abre o modal de bloqueio imediatamente
                } else {
                    // Se não passou do limite, está liberado
                    setUserStatus('registered');
                    setShowModal(false);
                    setShowLimitMessage(false);
                }
            } catch (error) {
                console.error("Erro ao sincronizar usuário ao iniciar:", error);
                // Se der erro na sincronização (ex: sem internet), mantemos como 'needs_register' por segurança
                // ou poderíamos deixar passar, mas é mais seguro bloquear.
                setUserStatus('needs_register');
                setShowModal(true);
            } finally {
                setIsRegisteringBackend(false);
            }
        } else {
            // Se não tem dados locais, precisa registrar
            setUserStatus('needs_register');
            setShowModal(true);
        }
    };

    checkUserStatusOnLoad();
  }, []);
  // ------------------------------------

  const handleShowRegister = () => {
    // Se já estiver bloqueado, não adianta mostrar o registro, mostra o bloqueio
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
        // O registro inicial também retorna o uso, mas assumimos que é 0 se for novo
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
        alert("Houve um problema ao conectar com o servidor de registro. Tente novamente em instantes.");
        console.error("Falha no registro:", error);
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

  const isQuotaEnforced = userStatus === 'limit_reached';
  const disableClassifier = userStatus === 'needs_register'; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
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
