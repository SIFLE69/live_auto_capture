
import React, { useState, useEffect } from 'react';
import AccessibilityOverlay from './components/AccessibilityOverlay';

const App: React.FC = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  
  const [content] = useState(`
    Universal Text Capture is now active. You no longer need to manually paste your text. Simply copy any content from your web browser, WhatsApp, or email, and return here.
    
    The Reader Pro "Mini Island" will automatically detect the new text in your clipboard and begin a high-fidelity narration instantly. This creates a seamless workflow for consuming long-form content on the move.
    
    For local testing, you can also select any paragraph on this page. The system will prioritize your current selection and provide real-time word synchronization as shown in the controller below.
  `);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection && selection.length > 5) {
        setSelectedText(selection);
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col relative overflow-hidden select-text">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-blue-600/5 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-white/[0.02] rounded-full blur-[100px]"></div>
      </div>

      <main className="flex-1 max-w-xl mx-auto w-full px-8 py-20 relative z-10 overflow-y-auto custom-scrollbar safe-pt content-fade">
        <div className="space-y-16 py-12">
          <div className="space-y-5">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Live <br/><span className="text-white/20">Auto-Capture.</span>
            </h1>
            <div className="flex items-center gap-3">
              <div className="w-8 h-0.5 bg-blue-600 rounded-full"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">Clipboard Monitoring On</span>
            </div>
          </div>

          <div className="prose prose-invert prose-xl max-w-none text-white/40 font-medium leading-[1.8] selection:bg-blue-600/40 selection:text-white">
            {content.split('\n\n').map((para, i) => (
              <p key={i} className="mb-12 transition-all hover:text-white/70 cursor-text">{para}</p>
            ))}
          </div>

          <div className="pt-24 opacity-20 flex flex-col items-center gap-6">
            <div className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center">
              <i className="fas fa-fingerprint text-xs"></i>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.5em]">Optimized for macOS Mobile</p>
          </div>
        </div>
      </main>

      <AccessibilityOverlay 
        selectedText={selectedText} 
        onClose={() => setSelectedText('')} 
      />

      {/* Dynamic Sync Notification */}
      {!selectedText && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-6 py-2.5 macos-glass rounded-full border border-white/10 flex items-center gap-3 shadow-2xl">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Monitoring System Clipboard</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
