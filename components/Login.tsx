
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface Props {
  onLoginSuccess: (token: string | null, user: User) => void;
}

// NOTE: Use your actual Client ID from the Google Cloud Console.
const GOOGLE_CLIENT_ID = "895719380290-4lrnm3o2t6m474knno9e539u29dirpt1.apps.googleusercontent.com";

const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const checkGsi = setInterval(() => {
      if ((window as any).google?.accounts?.oauth2) {
        setIsGsiLoaded(true);
        clearInterval(checkGsi);
      }
    }, 100);
    return () => clearInterval(checkGsi);
  }, []);

  const handleGoogleLogin = () => {
    if (!email.trim()) {
      alert("Please enter your work email first for context.");
      return;
    }

    if (!isGsiLoaded) {
      alert("Google Identity Services is loading. Please wait.");
      return;
    }

    setIsAuthenticating(true);

    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/tasks',
      callback: (response: any) => {
        setIsAuthenticating(false);
        if (response.access_token) {
          onLoginSuccess(response.access_token, {
            email: email.toLowerCase(),
            provider: 'google'
          });
        } else if (response.error) {
          console.error("OAuth Error:", response.error);
          alert(`Authentication failed: ${response.error_description || response.error}`);
        }
      },
    });

    client.requestAccessToken();
  };

  const handleEmailOnlyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // Simulation mode (no access_token provided)
      onLoginSuccess(null, { email: email.toLowerCase(), provider: 'email' });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-2xl shadow-indigo-100/50">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">MeetGenius Access</h2>
          <p className="text-slate-500 mt-2 font-medium">Enterprise authentication is required for secure Gmail API dispatch.</p>
        </div>

        <form onSubmit={handleEmailOnlyLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Work Email</label>
            <input
              type="email"
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
              placeholder="jane.doe@enterprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className={`w-full flex items-center justify-center gap-4 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${isAuthenticating
              ? 'bg-slate-100 text-slate-400 cursor-wait'
              : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/10 shadow-slate-100'
              }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {isAuthenticating ? 'Connecting...' : 'Connect with Google'}
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-300"><span className="bg-white px-4">Limited Access</span></div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all opacity-60 hover:opacity-100"
          >
            Session Only (No Dispatch)
          </button>
        </form>

        <p className="mt-8 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
          Requesting <code className="text-indigo-600">gmail.send</code> scope. <br />
          Identity handled by Google Identity Services.
        </p>
      </div>
    </div>
  );
};

export default Login;
