
import React, { useState, useEffect } from 'react';
import { OrchestrationData, GraphMailPayload, User } from '../types';

interface Props {
  orchestration: OrchestrationData;
  user: User;
  accessToken: string | null;
}

const MeetingResults: React.FC<Props> = ({ orchestration, user, accessToken }) => {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'mail'>('intelligence');
  const [localPayloads, setLocalPayloads] = useState<GraphMailPayload[]>([]);
  const [isDispatchingAll, setIsDispatchingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{ title: string, detail: string } | null>(null);

  const {
    blocking_error,
    email_execution_intent,
    next_actions,
    shared_meeting_template,
    meeting_metadata,
  } = orchestration;

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

  /**
   * Encodes string to URL-safe Base64 for Gmail API
   */
  const base64UrlEncode = (str: string): string => {
    const utf8Str = unescape(encodeURIComponent(str));
    return btoa(utf8Str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  /**
   * Constructs RFC 2822 compliant MIME message
   */
  const createMimeMessage = (to: string, subject: string, htmlBody: string): string => {
    const lines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset="utf-8"',
      'MIME-Version: 1.0',
      '',
      htmlBody
    ];
    return lines.join('\n');
  };

  /**
   * Executable Dispatch Logic: Real Gmail API Call
   */
  const handleSendMail = async (id: string) => {
    const payload = localPayloads.find(p => p.id === id);
    if (!payload) return;

    if (!accessToken) {
      setErrorMessage({
        title: "Access Denied",
        detail: "Dispatch failed: No valid Google OAuth session found. Please sign out and sign in again with Google to send emails."
      });
      return;
    }

    setLocalPayloads(prev => prev.map(p => p.id === id ? { ...p, status: 'SENDING' } : p));
    setErrorMessage(null);

    try {
      const mimeMessage = createMimeMessage(payload.to, payload.subject, payload.body.content);
      const encodedMessage = base64UrlEncode(mimeMessage);

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const msg = errorData.error?.message || "Internal Gmail API Failure.";

        if (response.status === 401) {
          throw new Error("AUTH_EXPIRED: Your security session has expired. Please re-authenticate.");
        } else if (response.status === 403) {
          throw new Error("ACCESS_DENIED: Your token lacks 'gmail.send' permissions.");
        }

        throw new Error(msg);
      }

      setLocalPayloads(prev => prev.map(p => p.id === id ? { ...p, status: 'SENT' } : p));
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : "Network failure during dispatch.";
      console.error("Mail Dispatch Failure:", errorStr);

      setLocalPayloads(prev => prev.map(p => p.id === id ? { ...p, status: 'FAILED' } : p));

      setErrorMessage({
        title: "Dispatch Failure",
        detail: errorStr
      });
    }
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

  // In MeetingResults.tsx

  const handleSyncToCalendar = async () => {
    if (!accessToken || !shared_meeting_template?.action_items) return;

    // 1. Filter items that have an owner/deadline to avoid junk events
    const tasksToSync = shared_meeting_template.action_items.filter(item => item.task && item.deadline);

    let successCount = 0;

    for (const item of tasksToSync) {
      try {
        // 2. Simple date parsing (Assumes LLM returns YYYY-MM-DD, otherwise defaults to tomorrow)
        let startDate = new Date(item.deadline || Date.now() + 86400000);
        let endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

        const event = {
          summary: `Action: ${item.task}`,
          description: `Owner: ${item.owner || 'Unassigned'}\nConfidence: ${item.confidence_score}`,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };

        // 3. Call Google Calendar API
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (response.ok) successCount++;
      } catch (error) {
        console.error("Calendar Sync Failed for item:", item, error);
      }
    }

    alert(`Successfully synced ${successCount} tasks to your Google Calendar!`);
  };

  // In MeetingResults.tsx

  // In MeetingResults.tsx

  const handleSyncToGoogleTasks = async () => {
    if (!accessToken || !shared_meeting_template) return;

    let successCount = 0;
    const now = new Date();
    const dueString = now.toISOString(); // Sets it for TODAY

    // ---------------------------------------------------------
    // 1. Create the "Meeting Summary" Task (The Agenda View)
    // ---------------------------------------------------------
    const agendaNotes = [
      `📅 Meeting: ${meeting_metadata.meeting_title}`,
      `📝 Summary: ${shared_meeting_template.summary}`,
      ``,
      `📋 Agenda Items:`,
      ...shared_meeting_template.agenda_items.map(a => `• ${a}`),
      ``,
      `Generated by MeetGenius`
    ].join('\n');

    try {
      await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `📖 Summary: ${meeting_metadata.meeting_title || 'Meeting Notes'}`,
          notes: agendaNotes,
          due: dueString, // Appears on Calendar Grid
          status: "needsAction"
        }),
      });
      successCount++;
    } catch (error) {
      console.error("Failed to create summary task", error);
    }

    // ---------------------------------------------------------
    // 2. Create Individual Tasks for Action Items (The Todos)
    // ---------------------------------------------------------
    const todos = shared_meeting_template.action_items;

    for (const item of todos) {
      try {
        const taskPayload = {
          title: `⚡ ${item.task}`, // The main todo text
          notes: `Owner: ${item.owner || 'You'}\nConfidence: ${item.confidence_score}`,
          due: dueString,
          status: "needsAction"
        };

        const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskPayload),
        });

        if (response.ok) successCount++;
      } catch (error) {
        console.error("Tasks Sync Failed:", error);
      }
    }

    alert(`✅ Created ${successCount} items in your Calendar!\n\n1. Look for the "Summary" task for the Agenda.\n2. Look for the "⚡" tasks for your Todos.`);
  };

  const allSent = localPayloads.length > 0 && localPayloads.every(p => p.status === 'SENT');

  return (
    <div className="flex flex-col gap-10">
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl animate-in fade-in slide-in-from-left-4">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-red-800 uppercase tracking-widest mb-1">{errorMessage.title}</h4>
                <p className="text-sm font-medium text-red-600 leading-relaxed max-w-xl">{errorMessage.detail}</p>
              </div>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex bg-white border border-slate-200 p-2 rounded-2xl w-fit shadow-sm self-center lg:self-start">
        <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} label="Outcome Intelligence" />
        <TabButton active={activeTab === 'mail'} onClick={() => setActiveTab('mail')} label={`Dispatch Queue (${localPayloads.length})`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-4 space-y-8">
          <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative group">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Execution Identity</h3>
            <div className="space-y-6">
              <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Authenticated SENDER</p>
                <p className="text-sm font-bold truncate">{user.email}</p>
              </div>
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-tight">
                <span className="text-slate-400">Target Protocol</span>
                <span className="text-indigo-400">{accessToken ? 'Gmail API Enabled' : 'Local Sandbox Only'}</span>
              </div>
              <button
                disabled={isDispatchingAll || allSent || localPayloads.length === 0}
                onClick={handleDispatchAll}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mt-4 shadow-xl ${allSent ? 'bg-green-600 text-white shadow-green-500/20' : isDispatchingAll ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                  }`}
              >
                {allSent ? 'Execution Complete ✓' : isDispatchingAll ? 'Dispatching...' : 'Dispatch All Emails'}
              </button>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSyncToGoogleTasks}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Create Google Tasks
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Meeting Meta</h3>
            <div className="space-y-4">
              <MetaInfo label="Meeting Title" value={meeting_metadata?.meeting_title || "Untitled"} />
              <MetaInfo label="Date" value={meeting_metadata?.meeting_date || "Today"} />
              <MetaInfo label="Attendees" value={`${meeting_metadata?.attendees.length || 0} participants`} />
            </div>
          </section>
        </div>

        <div className="xl:col-span-8">
          {activeTab === 'intelligence' && shared_meeting_template && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-sm relative">
                <div className="absolute top-0 right-0 pt-8 pr-12">
                  <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">Intelligence Record</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Executive Record</h3>
                <p className="text-xl font-medium text-slate-600 leading-relaxed italic border-l-4 border-indigo-500 pl-8 mb-12">
                  {shared_meeting_template.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <SectionCard title="Agenda / Topics" icon="M4 6h16M4 12h16M4 18h7">
                    <ul className="space-y-4">
                      {shared_meeting_template.agenda_items.map((item, i) => (
                        <li key={i} className="text-sm font-bold text-slate-700 flex gap-3">
                          <span className="text-indigo-400">{i + 1}.</span> {item}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                  <SectionCard title="Key Decisions" icon="M5 13l4 4L19 7" color="amber">
                    <ul className="space-y-4">
                      {shared_meeting_template.decisions.map((item, i) => (
                        <li key={i} className="text-sm font-bold text-slate-800 flex gap-3">
                          <span className="text-amber-500">✦</span> {item}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mail' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Executable Dispatch Queue</h3>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Post-Meeting Automation</span>
              </div>

              <div className="space-y-6">
                {localPayloads.map((mail) => (
                  <div key={mail.id} className={`bg-white rounded-3xl border transition-all duration-500 overflow-hidden ${mail.status === 'SENT' ? 'border-green-200 shadow-xl shadow-green-100/20' : mail.status === 'FAILED' ? 'border-red-200 shadow-xl shadow-red-100/10' : 'border-slate-200 shadow-sm'}`}>
                    <div className={`px-8 py-4 border-b flex justify-between items-center ${mail.status === 'SENT' ? 'bg-green-50 border-green-100' : mail.status === 'FAILED' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${mail.status === 'SENT' ? 'bg-green-500' : mail.status === 'FAILED' ? 'bg-red-500' : mail.status === 'SENDING' ? 'bg-indigo-500 animate-ping' : 'bg-slate-400'}`}></div>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Recipient: {mail.to}</span>
                      </div>
                      <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${mail.status === 'SENT' ? 'bg-green-100 text-green-700 border-green-200' :
                        mail.status === 'FAILED' ? 'bg-red-100 text-red-700 border-red-200' :
                          mail.status === 'SENDING' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                            'bg-white border-slate-200 text-slate-400'
                        }`}>
                        {mail.status}
                      </div>
                    </div>
                    <div className="p-10">
                      <div className="mb-8">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject Line</p>
                        <p className="text-lg font-bold text-slate-900">{mail.subject}</p>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner max-h-80 overflow-y-auto prose prose-indigo max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: mail.body.content }} />
                        </div>
                      </div>
                      {(mail.status === 'STAGED' || mail.status === 'FAILED') && (
                        <div className="mt-8 flex justify-end">
                          <button
                            onClick={() => handleSendMail(mail.id)}
                            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                          >
                            {mail.status === 'FAILED' ? 'Retry Dispatch' : 'Confirm & Send'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
  >
    {label}
  </button>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; icon: string; color?: 'indigo' | 'amber' }> = ({ title, children, icon, color = 'indigo' }) => (
  <div className={`p-8 rounded-3xl border ${color === 'indigo' ? 'bg-indigo-50/30 border-indigo-100' : 'bg-amber-50/30 border-amber-100'}`}>
    <h4 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-3 ${color === 'indigo' ? 'text-indigo-600' : 'text-amber-600'}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={icon} /></svg>
      {title}
    </h4>
    {children}
  </div>
);

const MetaInfo: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <span className="text-sm font-bold text-slate-700">{value}</span>
  </div>
);

export default MeetingResults;
