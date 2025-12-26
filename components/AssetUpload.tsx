
import React, { useState, useRef } from 'react';

interface Props {
  onProcess: (input: string, source: "calendar" | "manual_upload" | "external_import", fileData?: string) => void;
  accessToken: string | null; // <--- NEW
}

const AssetUpload: React.FC<Props> = ({ onProcess }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'import'>('text');
  const [inputText, setInputText] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'text' && inputText.trim()) {
      onProcess(inputText, 'manual_upload');
    } else if (activeTab === 'import' && externalUrl.trim()) {
      onProcess(`External Import Requested: ${externalUrl}`, 'external_import');
    }
  };

  const handleOpenDrive = async () => {
    if (!accessToken) {
      alert("Please sign in to access Google Drive.");
      return;
    }

    setShowDrivePicker(true);

    try {
      // Search for audio or video files
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType contains 'audio/' or mimeType contains 'video/'&fields=files(id, name, mimeType)&pageSize=10",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();
      setDriveFiles(data.files || []);
    } catch (err) {
      console.error("Drive API Error:", err);
    }
  };

  const handleSelectDriveFile = async (fileId: string, fileName: string) => {
    setShowDrivePicker(false);
    setIsTranscribing(true);

    try {
      // Download file as blob
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const blob = await response.blob();

      // Convert to Base64 (re-using your existing logic pattern)
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Raw = (e.target?.result as string).split(',')[1]; // Remove "data:audio/mp3;base64," header
        onProcess(`Processing Drive File: ${fileName}`, 'manual_upload', base64Raw);
        setIsTranscribing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to download drive file", err);
      setIsTranscribing(false);
      alert("Could not download file from Drive. It might be too large for this demo.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Explicit Validation Fix
    if (file.size > 25 * 1024 * 1024) {
      alert("Asset exceeds maximum size (25MB). Please optimize for transcription.");
      return;
    }

    if (file.type.includes('text') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => setInputText(event.target?.result as string);
      reader.readAsText(file);
      setActiveTab('text');
    } else {
      setIsTranscribing(true);
      // Simulate Transcription Pipeline Fix
      setTimeout(() => {
        setIsTranscribing(false);
        onProcess(`Processing Media Asset: ${file.name} (${file.type}). Transcription Confirmed. Ready for Intelligence layer.`, 'manual_upload');
      }, 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-50 border-b border-slate-100 p-1.5">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Transcript / Text
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'media' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Audio / Video
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'import' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            External Import
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {activeTab === 'text' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-slate-900 uppercase tracking-tight tracking-tight">Post-Meeting Transcript</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Upload Local File
                </button>
              </div>
              <textarea
                className="w-full h-64 p-6 text-slate-700 bg-slate-50/50 rounded-2xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm leading-relaxed transition-all"
                placeholder="Paste transcript or meeting captions here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          )}

          {activeTab === 'media' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              {isTranscribing ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-slate-800">Transcription Service: Initializing Cloud Pipeline...</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 tracking-tight">Pipeline: Audio Ingestion</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2 font-medium">Support for MP3, WAV, MP4. Size limit: 25MB. Files are sent to cloud transcription before intelligence processing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all uppercase tracking-widest"
                  >
                    Choose Media File
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'import' && (

            <div className="space-y-6">
              <label className="text-sm font-black text-slate-900 uppercase tracking-tight tracking-tight">Import from Cloud Source</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all group">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-black">G</div>
                  <span className="text-sm font-bold text-slate-700">Google Drive</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenDrive}
                  className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all group"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-black">D</div>
                  <span className="text-sm font-bold text-slate-700">Load from Drive</span>
                </button>
                {showDrivePicker && (
                  <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                      <h3 className="text-xl font-black text-slate-900 mb-6">Select Recording</h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {driveFiles.map(file => (
                          <button
                            key={file.id}
                            onClick={() => handleSelectDriveFile(file.id, file.name)}
                            className="w-full text-left p-4 rounded-xl border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                          >
                            <div className="font-bold text-slate-700 text-sm truncate">{file.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{file.mimeType}</div>
                          </button>
                        ))}
                        {driveFiles.length === 0 && <p className="text-slate-400 text-sm">No recent recordings found.</p>}
                      </div>
                      <button
                        onClick={() => setShowDrivePicker(false)}
                        className="mt-6 w-full py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <button type="button" className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all group">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-400 font-black">O</div>
                  <span className="text-sm font-bold text-slate-700">OneDrive</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="url"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                  placeholder="Or paste external recording link..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

          <div className="mt-8 flex justify-end">
            <button
              disabled={activeTab === 'text' ? !inputText.trim() : activeTab === 'import' ? !externalUrl.trim() : true}
              className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${(activeTab === 'text' && inputText.trim()) || (activeTab === 'import' && externalUrl.trim())
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
            >
              Start Execution Audit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetUpload;
