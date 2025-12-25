
import React, { useState, useCallback } from 'react';
import { runCorrectiveOrchestration } from './geminiService';
import { OrchestrationData, AppStatus, User } from './types';
import Header from './components/Header';
import AssetUpload from './components/AssetUpload';
import MeetingResults from './components/MeetingResults';
import Login from './components/Login';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [data, setData] = useState<OrchestrationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setStatus(AppStatus.IDLE);
  };

  const handleLogout = () => {
    setUser(null);
    setData(null);
    setStatus(AppStatus.IDLE);
  };

  const handleProcessInput = async (input: string, source: "calendar" | "manual_upload" | "external_import") => {
    if (!user) {
      setStatus(AppStatus.AUTH_REQUIRED);
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setError(null);
    
    try {
      // Determine if input is audio based on the input text content (since AssetUpload passes descriptions for media)
      const isAudio = input.includes("Processing Media Asset:");
      
      const result = await runCorrectiveOrchestration(
        input, 
        user.email, 
        user.provider, 
        isAudio
      );
      
      setData(result);
      setStatus(AppStatus.COMPLETED);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected failure occurred in the intelligence layer.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = useCallback(() => {
    setData(null);
    setStatus(AppStatus.IDLE);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 mt-12">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <>
            {status === AppStatus.IDLE && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <div className="mb-12 text-center max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 mb-6">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Identity Verified: {user.email}
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Meeting Intelligence & Workflow Automation</h2>
                  <p className="text-slate-500 mt-4 text-xl leading-relaxed">Corrective orchestration for high-stakes enterprise meetings. Built for Outlook execution.</p>
                </div>
                <AssetUpload onProcess={handleProcessInput} />
              </div>
            )}

            {status === AppStatus.PROCESSING && (
              <div className="flex flex-col items-center justify-center py-40 space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-24 h-24 border-8 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl animate-pulse rotate-45"></div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight tracking-tight">Corrective Engine Active</h3>
                  <p className="text-slate-500 mt-2 text-lg">Validating assets, identity, and integration readiness...</p>
                </div>
              </div>
            )}

            {status === AppStatus.ERROR && (
              <div className="max-w-2xl mx-auto mt-12 bg-white border border-red-100 rounded-[2.5rem] p-12 text-center shadow-2xl shadow-red-100/30">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-3xl mb-8">
                  <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-900">Intelligence Failure</h3>
                <p className="text-slate-500 mt-4 text-lg">{error}</p>
                <button 
                  onClick={handleReset}
                  className="mt-10 px-12 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-sm"
                >
                  Restart Session
                </button>
              </div>
            )}

            {status === AppStatus.COMPLETED && data && (
              <div className="animate-in fade-in zoom-in-95 duration-700">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                  <div>
                    <button 
                      onClick={handleReset}
                      className="flex items-center text-xs font-black text-slate-400 hover:text-indigo-600 transition-all uppercase tracking-widest mb-3 group"
                    >
                      <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Analyze New Meeting
                    </button>
                    <div className="flex items-center gap-3">
                      <h2 className="text-4xl font-black text-slate-900 tracking-tighter tracking-tighter">Corrective Audit Report</h2>
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Workflow Validated</span>
                    </div>
                  </div>
                  <div className="flex gap-4 w-full lg:w-auto">
                    <button className="flex-1 lg:flex-initial px-8 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                      Export Fix Logs
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="flex-1 lg:flex-initial px-8 py-4 bg-slate-100 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
                <MeetingResults orchestration={data} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
