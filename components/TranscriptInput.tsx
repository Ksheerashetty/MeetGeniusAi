
import React, { useState, useRef } from 'react';

interface Props {
  onProcess: (transcript: string) => void;
}

const TranscriptInput: React.FC<Props> = ({ onProcess }) => {
  const [transcript, setTranscript] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTranscript(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProcess(transcript);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-1 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload File (.txt, .md)
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".txt,.md,.json" 
            onChange={handleFileUpload} 
          />
        </div>
        
        <div className="relative">
          <textarea
            className="w-full h-80 p-6 text-slate-700 bg-transparent resize-none focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed"
            placeholder="Paste your meeting transcript here... (e.g., from Google Meet, Zoom, or Teams)"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          {!transcript && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col text-slate-300">
               <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v12a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v6h6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 11l-2 2 2 2m4-4l2 2-2 2" />
               </svg>
               <p className="text-sm font-medium">No transcript added yet</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={!transcript.trim()}
            className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 ${
              transcript.trim() 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Extract Outcomes
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default TranscriptInput;
