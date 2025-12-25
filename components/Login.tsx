
import React, { useState } from 'react';
import { User } from '../types';

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');

  const handleSocialLogin = (provider: 'google' | 'microsoft') => {
    // Simulate OAuth flow
    if (email.trim()) {
      onLogin({ email: email.toLowerCase(), provider });
    } else {
      alert("Please enter your work email first for context.");
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin({ email: email.toLowerCase(), provider: 'email' });
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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identity Required</h2>
          <p className="text-slate-500 mt-2 font-medium">Authentication is mandatory for Outlook integration and secure orchestration.</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-6">
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
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            Continue with Email
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or SSO</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 transition-all group"
          >
            <div className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center text-red-600 font-black text-xs group-hover:bg-red-100">G</div>
            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Google</span>
          </button>
          <button 
            onClick={() => handleSocialLogin('microsoft')}
            className="flex items-center justify-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 transition-all group"
          >
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-xs group-hover:bg-blue-100">M</div>
            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Microsoft</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
