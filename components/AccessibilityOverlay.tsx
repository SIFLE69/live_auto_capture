
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TTSConfig, PlaybackStatus } from '../types';

interface AccessibilityOverlayProps {
  selectedText: string;
  onClose: () => void;
}

const AccessibilityOverlay: React.FC<AccessibilityOverlayProps> = ({ selectedText: initialText, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentText, setCurrentText] = useState(initialText);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [config, setConfig] = useState<TTSConfig>({
    voice: '',
    speed: 1.0,
    volume: 1.0
  });

  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
    currentWordIndex: -1
  });

  const synth = useRef<SpeechSynthesis>(window.speechSynthesis);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic active word
  useEffect(() => {
    if (scrollRef.current && status.currentWordIndex >= 0) {
      const activeEl = scrollRef.current.querySelector(`[data-index="${status.currentWordIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [status.currentWordIndex]);

  // Load available system voices
  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = synth.current.getVoices();
      setVoices(availableVoices);
      // Set default voice if not set
      if (availableVoices.length > 0 && !config.voice) {
        // Prefer a good English voice if available
        const defaultVoice = availableVoices.find(v => v.lang.startsWith('en') && !v.name.includes('Microsoft')) || availableVoices[0];
        setConfig(prev => ({ ...prev, voice: defaultVoice.name }));
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [config.voice]);

  // Focus-based Auto-Capture logic with better sanitization
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const cleaned = text?.trim();
        if (cleaned && cleaned.length > 3 && cleaned !== currentText.trim()) {
          setCurrentText(cleaned);
          resetReader();
          setIsOpen(true);
          // Auto-start if it's new capture
          setTimeout(() => speakChunk(0), 400);
        }
      } catch (err) {
        console.debug("Clipboard restricted or unchanged.");
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentText]);

  useEffect(() => {
    if (initialText && initialText.trim()) {
      setCurrentText(initialText.trim());
      resetReader();
      setIsOpen(true);
      speakChunk(0);
    }
  }, [initialText]);

  const chunks = useMemo(() => {
    if (!currentText) return [];
    // Only return non-empty chunks
    return (currentText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [currentText])
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }, [currentText]);

  const allWords = useMemo(() => currentText.split(/\s+/).filter(w => w.length > 0), [currentText]);

  // Calculate word offset for a given chunk index
  const getWordOffsetForChunk = useCallback((chunkIdx: number) => {
    let offset = 0;
    for (let i = 0; i < chunkIdx; i++) {
      if (chunks[i]) {
        offset += chunks[i].split(/\s+/).filter(w => w.length > 0).length;
      }
    }
    return offset;
  }, [chunks]);

  const stopAudio = useCallback(() => {
    synth.current.cancel();
    setStatus(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const resetReader = useCallback(() => {
    stopAudio();
    setStatus({ isPlaying: false, currentTime: 0, duration: 0, progress: 0, currentWordIndex: -1 });
    setCurrentChunkIndex(0);
  }, [stopAudio]);

  const speakChunk = useCallback((index: number) => {
    if (index >= chunks.length) return;

    synth.current.cancel(); // Stop any previous speech

    const textToSpeak = chunks[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Configure utterance
    const selectedVoice = voices.find(v => v.name === config.voice);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = config.speed;
    utterance.volume = config.volume;

    utterance.onstart = () => {
      setStatus(prev => ({ ...prev, isPlaying: true }));
    };

    utterance.onend = () => {
      handleNextChunk(index);
    };

    utterance.onerror = (e) => {
      console.error("Audio error", e);
      setStatus(prev => ({ ...prev, isPlaying: false }));
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        // Calculate which word in the chunk this is
        const textBeforeBox = textToSpeak.substring(0, charIndex);
        const wordsInChunkBefore = textBeforeBox.split(/\s+/).filter(w => w.length > 0).length;

        const globalOffset = getWordOffsetForChunk(index);
        const globalIndex = globalOffset + wordsInChunkBefore;

        setStatus(prev => ({
          ...prev,
          currentWordIndex: globalIndex,
          progress: Math.min(((globalIndex + 1) / allWords.length) * 100, 100)
        }));
      }
    };

    utteranceRef.current = utterance;
    synth.current.speak(utterance);
    setCurrentChunkIndex(index);
  }, [chunks, config, voices, allWords.length, getWordOffsetForChunk]);

  const handleNextChunk = (currentIndex: number) => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < chunks.length) {
      speakChunk(nextIdx);
    } else {
      setStatus(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const handleToggle = () => {
    if (synth.current.speaking) {
      if (synth.current.paused) {
        synth.current.resume();
        setStatus(prev => ({ ...prev, isPlaying: true }));
      } else {
        synth.current.pause();
        setStatus(prev => ({ ...prev, isPlaying: false }));
      }
    } else {
      speakChunk(currentChunkIndex);
    }
  };

  return (
    <>
      <div
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-700 ${isOpen ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
        onClick={() => setIsOpen(true)}
      >
        <button className="bg-white/5 border border-white/10 w-10 h-32 rounded-l-2xl flex flex-col items-center justify-center gap-4 backdrop-blur-2xl shadow-2xl">
          <i className="fas fa-waveform text-blue-500 text-xs"></i>
          <span className="[writing-mode:vertical-lr] text-[8px] font-bold tracking-[0.3em] uppercase opacity-30">Reader</span>
        </button>
      </div>

      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[340px] z-50 macos-glass rounded-[1.8rem] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>

        <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="traffic-light bg-[#ff5f56] scale-75"></div>
            <div className="traffic-light bg-[#ffbd2e] scale-75"></div>
            <div className="traffic-light bg-[#27c93f] scale-75"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status.isPlaying ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
              {status.isPlaying ? 'Reading' : 'Ready'}
            </span>
          </div>
          <button onClick={() => { stopAudio(); setIsOpen(false); }} className="w-5 h-5 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity">
            <i className="fas fa-times text-[10px]"></i>
          </button>
        </div>

        <div ref={scrollRef} className="px-5 py-4 overflow-y-auto h-64 scroll-smooth mask-linear-fade custom-scrollbar">
          <div className="flex flex-wrap gap-x-1.5 gap-y-2 leading-relaxed justify-center text-center">
            {allWords.length > 0 ? (
              allWords.map((word, i) => {
                const isActive = status.currentWordIndex === i;
                const isPast = status.currentWordIndex > i;

                return (
                  <span
                    key={i}
                    data-index={i}
                    className={`transition-all duration-300 cursor-pointer hover:text-white ${isActive
                      ? 'text-white text-lg font-bold scale-110 shadow-current drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                      : isPast
                        ? 'text-white/80 scale-100 font-medium'
                        : 'text-white/20 scale-95 font-normal blur-[0.5px]'
                      }`}
                    onClick={() => {
                      // TODO: Implement seek to word functionality if desired
                    }}
                  >
                    {word}
                  </span>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
                <i className="fas fa-music text-3xl opacity-50"></i>
                <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for text...</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 pt-1 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden relative">
              <div
                className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-white/20 tabular-nums w-6">{Math.round(status.progress)}%</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button onClick={resetReader} className="w-8 h-8 rounded-lg macos-card flex items-center justify-center text-[10px] text-white/40 hover:text-white transition-all active:scale-90">
                <i className="fas fa-redo-alt"></i>
              </button>
              <div className="h-8 px-2.5 rounded-lg macos-card flex items-center justify-center text-[9px] font-black text-blue-500 tracking-tighter">
                {config.speed}x
              </div>
            </div>

            <button
              onClick={handleToggle}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform active:scale-90 ${'bg-blue-600 shadow-[0_10px_25px_rgba(0,122,255,0.4)] hover:bg-blue-500'
                }`}
            >
              <i className={`fas ${status.isPlaying ? 'fa-pause' : 'fa-play'} text-white text-lg ${status.isPlaying ? '' : 'ml-0.5'}`}></i>
            </button>

            <div className="flex gap-1.5">
              <select
                value={config.voice}
                onChange={(e) => setConfig(prev => ({ ...prev, voice: e.target.value }))}
                className="bg-white/5 text-white/40 text-[9px] font-black uppercase py-2 px-2 rounded-lg border-none outline-none appearance-none cursor-pointer max-w-[80px]"
              >
                {voices.map(v => (
                  <option key={v.name} value={v.name}>{v.name.slice(0, 10)}..</option>
                ))}
              </select>
              <button
                onClick={() => setConfig(prev => ({ ...prev, speed: prev.speed >= 2 ? 1 : prev.speed + 0.5 }))}
                className="w-8 h-8 rounded-lg macos-card flex items-center justify-center text-[10px] text-white/40"
              >
                <i className="fas fa-gauge-high"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 sm:hidden transition-opacity" onClick={() => setIsOpen(false)} />}
    </>
  );
};

export default AccessibilityOverlay;
