
import React, { useState, useEffect } from 'react';
import { OrchestrationData, GraphMailPayload } from '../types';

interface Props {
  orchestration: OrchestrationData;
}

const MeetingResults: React.FC<Props> = ({ orchestration }) => {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'mail'>('intelligence');
  const [localPayloads, setLocalPayloads] = useState<GraphMailPayload[]>([]);
  const [isDispatchingAll, setIsDispatchingAll] = useState(false);
  
  const { 
    blocking_error,
    transcription_diagnostic,
    next_allowed_step,
    transcript_preview,
    outlook_fix,
    email_execution_intent,
    next_actions,
    shared_meeting_template,
  } = orchestration;

  // Initialize local payloads from intent
  useEffect(() => {
    if (email_execution_intent?.emails) {
      setLocalPayloads(
        email_execution_intent.emails.map((e, idx) => ({
          ...e,
          id: `email-${idx}`,
          saveToSentItems: true,
          status: 'STAGED'
        }))
      );
    }
  }, [email_execution_intent]);

  const handleSendMail = async (id: string) => {
    setLocalPayloads(prev => prev.map(p => p.id === id ? { ...p, status: 'SENDING' } : p));
    
    // Simulate API Execution (POST /me/sendMail)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLocalPayloads(prev => prev.map(p => p.id === id ? { ...p, status: 'SENT' } : p));
  };

  const handleDispatchAll = async () => {
    setIsDispatchingAll(true);
    for (const payload of localPayloads) {
      if (payload.status !== 'SENT') {
        await handleSendMail(payload.id);
      }
    }
    setIsDispatchingAll(false);
  };

  const allSent = localPayloads.length > 0 && localPayloads.every(p => p.status === 'SENT');

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Tab Navigation */}
      {!blocking_error.is_blocking && !email_execution_intent.blocking_error.is_blocking && (
        <div className="flex bg-white border border-slate-200 p-1 rounded-2xl w-fit shadow-sm">
          <button 
            onClick={() => setActiveTab('intelligence')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'intelligence' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Intelligence Report
          </button>
          <button 
            onClick={() => setActiveTab('mail')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'mail' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Email Queue ({localPayloads.length})
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Enforcement & Diagnostics Sidebar */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* BLOCKING ERROR PANEL */}
          {(blocking_error.is_blocking || email_execution_intent.blocking_error.is_blocking) && (
            <section className="bg-red-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-red-200 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h3 className="text-xl font-black uppercase tracking-tight">Execution Blocked</h3>
              </div>
              <p className="font-bold text-sm leading-relaxed text-red-100">
                {blocking_error.reason || email_execution_intent.blocking_error.reason || "A critical step in the orchestration failed."}
              </p>
            </section>
          )}

          {/* SENDER IDENTITY PANEL */}
          {!blocking_error.is_blocking && (
            <section className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Authenticated Sender</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Authenticated Email</p>
                  <p className="text-sm font-bold truncate">{email_execution_intent.sender.email}</p>
                </div>
                <div className="flex justify-between text-xs font-bold pt-2">
                  <span className="text-slate-400">Auth Provider</span>
                  <span className="uppercase text-indigo-400">{email_execution_intent.sender.auth_provider}</span>
                </div>
                <button 
                  disabled={isDispatchingAll || allSent || localPayloads.length === 0}
                  onClick={handleDispatchAll}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mt-6 ${
                    allSent ? 'bg-green-600 text-white' : isDispatchingAll ? 'bg-slate-800 text-slate-500 animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                  }`}
                >
                  {allSent ? 'All Dispatched ✓' : isDispatchingAll ? 'Processing...' : 'Dispatch Individual Emails'}
                </button>
              </div>
            </section>
          )}

          {/* TRANSCRIPTION DIAGNOSTIC */}
          {transcription_diagnostic && transcription_diagnostic.pipeline_state === "BLOCKED" && (
            <section className="bg-white rounded-[2rem] p-8 border border-red-200 shadow-sm">
              <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-6">Pipeline Failure</h3>
              <div className="space-y-3">
                <DiagnosticCheck label="Access" pass={transcription_diagnostic.diagnosis.audio_access_ok} />
                <DiagnosticCheck label="Format" pass={transcription_diagnostic.diagnosis.format_supported} />
                <DiagnosticCheck label="API" pass={transcription_diagnostic.diagnosis.transcription_called} />
              </div>
            </section>
          )}

          {/* Correctives */}
          <section className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Pipeline Correctives</h3>
            <ul className="space-y-3">
              {next_actions.map((action, i) => (
                <li key={i} className="flex gap-3 text-xs font-bold text-slate-700 items-start">
                  <span className="text-indigo-500 mt-1">→</span>
                  {action}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Main Orchestration Panel */}
        <div className="xl:col-span-8 space-y-10">
          {!blocking_error.is_blocking && activeTab === 'intelligence' && shared_meeting_template && (
            <div className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="mb-12">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Transcript Preview</h3>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-xs text-slate-500 max-h-40 overflow-y-auto mb-8">
                  {transcript_preview || "No transcript preview available."}
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Intelligence Record</h3>
                <p className="text-2xl font-bold text-slate-800 leading-relaxed italic border-l-8 border-indigo-500 pl-8 py-2 bg-indigo-50/30 rounded-r-2xl">
                  {shared_meeting_template.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    Agenda Points
                  </h4>
                  <div className="space-y-4">
                    {shared_meeting_template.agenda_items.map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                        <span className="text-xs font-black text-indigo-400">{String(i+1).padStart(2, '0')}</span>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Final Decisions
                  </h4>
                  <div className="space-y-4">
                    {shared_meeting_template.decisions.map((item, i) => (
                      <div key={i} className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50 text-sm font-bold text-slate-800 leading-relaxed">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!blocking_error.is_blocking && activeTab === 'mail' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Email Execution Intent</h3>
                <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  {localPayloads.length} Recipients Staged
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {localPayloads.length > 0 ? (
                  localPayloads.map((mail, i) => (
                    <div key={mail.id} className={`bg-white rounded-3xl border transition-all duration-500 ${mail.status === 'SENT' ? 'border-green-200 shadow-green-50' : 'border-slate-200 shadow-sm'} overflow-hidden`}>
                      <div className={`px-8 py-4 border-b flex justify-between items-center ${mail.status === 'SENT' ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${mail.status === 'SENT' ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                             To: {mail.to}
                           </span>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          mail.status === 'SENT' ? 'bg-green-100 text-green-700 border-green-200' :
                          mail.status === 'SENDING' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                          {mail.status}
                        </div>
                      </div>
                      <div className="p-8">
                         <div className="mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject</p>
                            <p className="text-lg font-bold text-slate-900">{mail.subject}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Body (HTML Payload)</p>
                            <div className="bg-slate-900 text-indigo-300 p-6 rounded-2xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner max-h-48 overflow-y-auto">
                              {mail.body.content}
                            </div>
                         </div>
                         {mail.status === 'STAGED' && (
                           <div className="mt-6 flex justify-end">
                              <button 
                                onClick={() => handleSendMail(mail.id)}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                              >
                                Send Executable
                              </button>
                           </div>
                         )}
                         {mail.status === 'SENT' && (
                           <div className="mt-6 flex items-center justify-end gap-2 text-green-600">
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             <span className="text-xs font-black uppercase tracking-widest">Successfully Dispatched</span>
                           </div>
                         )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                    <p className="text-slate-400 font-bold italic">No email payloads generated. Verify attendee extraction.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DiagnosticCheck: React.FC<{ label: string; pass: boolean }> = ({ label, pass }) => (
  <div className="flex items-center justify-between text-[11px] font-bold">
    <span className="text-slate-500">{label}</span>
    <span className={pass ? 'text-green-600' : 'text-red-600'}>{pass ? 'OK' : 'FAIL'}</span>
  </div>
);

const StatusBadge: React.FC<{ success: boolean }> = ({ success }) => (
  <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${success ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
    {success ? 'Pass' : 'Block'}
  </div>
);

const PipelineItem: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${active ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-800 opacity-30'}`}>
    <span className="text-xs font-bold">{label}</span>
    {active ? (
      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
    ) : (
      <div className="w-4 h-4 border-2 border-slate-700 rounded-full"></div>
    )}
  </div>
);

export default MeetingResults;
