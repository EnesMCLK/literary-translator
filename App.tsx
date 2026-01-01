
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Play, Pause, AlertCircle, CheckCircle2, 
  Settings, Sliders, Tags, Loader2, Clock, CircleDot, 
  History, BrainCircuit, Sparkles, ChevronRight,
  ShieldCheck, Info, FileText, XCircle, RefreshCw, Check, Globe, X,
  Zap, BarChart3, Scale, ShieldAlert, Activity, BookOpen, User, Trash2, StepForward,
  Key, LayoutDashboard, Database, Link2, Menu, Lock, Unlock, ExternalLink, Eye, EyeOff,
  BookType
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { processEpub, TranslationProgress, TranslationSettings, ResumeInfo } from './services/epubService';
import { ProgressBar } from './components/ProgressBar';
import { LogViewer } from './components/LogViewer';

export type UILanguage = 'tr' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'pt' | 'nl' | 'pl' | 'hi' | 'vi';

interface HistoryItem {
  id: string;
  timestamp: string;
  filename: string;
  sourceLang: string;
  targetLang: string;
  modelId: string;
  wordCount?: number;
  status: 'completed' | 'partial' | 'failed';
  settingsSnapshot: TranslationSettings;
}

const AVAILABLE_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'div', 'span', 'em', 'strong'];
const DEFAULT_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'div'];

const LANG_CODE_TO_LABEL: Record<string, string> = {
  tr: 'Turkish', en: 'English', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian',
  ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', pt: 'Portuguese',
  nl: 'Dutch', pl: 'Polish', hi: 'Hindi', vi: 'Vietnamese'
};

const LANGUAGES_DATA = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' }, { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' }, { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' }, { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' }, { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' }, { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' }, { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' }, { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }, { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' }
];

const STRINGS_REGISTRY: Record<string, any> = {
  tr: {
    historyTitle: "ÇEVİRİ GEÇMİŞİ", clearHistory: "Tümünü Temizle", noHistory: "Kayıt yok",
    modelLabel: "MODEL SEÇİMİ", uploadLabel: "EPUB YÜKLEME", uploadPlaceholder: "Dosya sürükle veya seç",
    sourceLang: "KAYNAK DİL", targetLang: "HEDEF DİL", creativity: "YARATICILIK", htmlTags: "HTML ETİKETLERİ",
    systemMonitor: "Sistem İzleyici", startBtn: "Çeviriyi Başlat", resumeBtn: "Kaldığı Yerden Devam Et", stopBtn: "Durdur", downloadBtn: "EPUB İNDİR", pdfBtn: "PDF İNDİR",
    tokens: "TOKEN", speed: "HIZ", eta: "KALAN", processing: "İşleniyor", idle: "Hazır",
    title: "Edebi EPUB Çevirmeni", description: "Profesyonel Edebi Çeviri Motoru", settingsTitle: "AYARLAR VE KONFİGÜRASYON",
    restoreSettings: "Geri Yükle", selectLang: "DİL SEÇİN", error: "HATA", apiStatus: "API DURUMU",
    freeMode: "ÜCRETSİZ MOD", paidMode: "PRO MOD", connectAiStudio: "AI STUDIO BAĞLAN", billingInfo: "Gelişmiş modeller için Paid Key gereklidir.",
    lockedModel: "Bağlantı Gerekli", checkKey: "Doğrulanıyor...", verifyBtn: "AKTİF ET", manualKeyLabel: "MANUEL ANAHTAR",
    manualKeyPlaceholder: "API Anahtarınızı buraya yapıştırın...", aiAnalysis: "YAPAY ZEKA ANALİZİ", preparing: "HAZIRLIK BEKLENİYOR",
    systemLogsReady: "Sistem Girişleri Bekleniyor...", verifyingError: "Doğrulama hatası!", literal: "Sadık", creative: "Yaratıcı",
    quotaError: "KOTA DOLDU: Lütfen yaklaşık 60 saniye bekleyin. Çeviri durduruldu, kaldığınız yerden devam edebilirsiniz."
  },
  en: {
    historyTitle: "TRANSLATION HISTORY", clearHistory: "Clear All", noHistory: "No history",
    modelLabel: "MODEL SELECTION", uploadLabel: "UPLOAD EPUB", uploadPlaceholder: "Drag or select file",
    sourceLang: "SOURCE LANG", targetLang: "TARGET LANG", creativity: "CREATIVITY", htmlTags: "HTML TAGS",
    systemMonitor: "System Monitor", startBtn: "Start Translation", resumeBtn: "Resume Translation", stopBtn: "Stop", downloadBtn: "DOWNLOAD EPUB", pdfBtn: "DOWNLOAD PDF",
    tokens: "TOKENS", speed: "SPEED", eta: "ETA", processing: "Processing", idle: "Idle",
    title: "Literary EPUB Translator", description: "Professional Literary Translation Engine", settingsTitle: "SETTINGS & CONFIG",
    restoreSettings: "Restore", selectLang: "SELECT LANGUAGE", error: "ERROR", apiStatus: "API STATUS",
    freeMode: "FREE MODE", paidMode: "PRO MODE", connectAiStudio: "CONNECT AI STUDIO", billingInfo: "Paid Key required for PRO models.",
    lockedModel: "Locked", checkKey: "Checking...", verifyBtn: "VERIFY", manualKeyLabel: "MANUAL KEY",
    manualKeyPlaceholder: "Paste your API key...", aiAnalysis: "AI ANALYSIS", preparing: "AWAITING PREP",
    systemLogsReady: "Waiting for logs...", verifyingError: "Key error!", literal: "Literal", creative: "Creative",
    quotaError: "QUOTA EXCEEDED: Please wait about 60 seconds. Translation paused, you can resume later."
  }
};

const STORAGE_KEY_HISTORY = 'lit-trans-history';
const STORAGE_KEY_RESUME = 'lit-trans-resume-v2';

export default function App() {
  const [uiLang, setUiLang] = useState<UILanguage>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasPaidKey, setHasPaidKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeInfo | null>(null);
  
  const currentStrings = STRINGS_REGISTRY[uiLang] || STRINGS_REGISTRY['en'];
  const t = { ...STRINGS_REGISTRY['en'], ...currentStrings };

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [settings, setSettings] = useState<TranslationSettings>({
    temperature: 0.3,
    targetTags: DEFAULT_TAGS,
    sourceLanguage: 'Automatic',
    targetLanguage: 'Turkish',
    modelId: 'gemini-flash-lite-latest',
    uiLang: 'en'
  });

  const [progress, setProgress] = useState<TranslationProgress>({
    currentFile: 0, totalFiles: 0, currentPercent: 0, status: 'idle',
    logs: [], wordsPerSecond: 0, totalProcessedWords: 0
  });

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<{title: string, message: string} | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const targetLabel = LANG_CODE_TO_LABEL[uiLang] || 'Turkish';
    setSettings(prev => ({ ...prev, uiLang, targetLanguage: targetLabel }));
  }, [uiLang]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const initializeApp = async () => {
    let initialLang = localStorage.getItem('lit-trans-ui-lang') as UILanguage;
    if (!initialLang) {
      const browserLang = navigator.language.split('-')[0] as UILanguage;
      initialLang = STRINGS_REGISTRY[browserLang] ? browserLang : 'tr';
    }
    setUiLang(initialLang);
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedResume = localStorage.getItem(STORAGE_KEY_RESUME);
    if (savedResume) {
      try { setResumeData(JSON.parse(savedResume)); } catch {}
    }

    setIsInitializing(false);
  };

  useEffect(() => { initializeApp(); }, []);

  const verifyApiKey = async (explicitKey?: string) => {
    setIsVerifying(true);
    const keyToTest = explicitKey || manualKey || (manualKey ? '' : (process.env.API_KEY || ''));
    if (!keyToTest) { setIsVerifying(false); return; }
    try {
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'ping' });
      if (response.text) {
        setHasPaidKey(true);
        (window as any).manualApiKey = keyToTest;
        setSettings(prev => ({ ...prev, modelId: 'gemini-3-flash-preview' }));
      }
    } catch {
      setHasPaidKey(false);
      setError({ title: t.error, message: t.verifyingError });
    } finally { setIsVerifying(false); }
  };

  const handleConnectAiStudio = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        if (await (window as any).aistudio.hasSelectedApiKey()) await verifyApiKey(process.env.API_KEY);
      } catch (err) { console.error(err); }
    }
  };

  const startTranslation = async (isResuming = false) => {
    if (!file) return;
    setIsProcessing(true);
    setDownloadUrl(null);
    setPdfDownloadUrl(null);
    abortControllerRef.current = new AbortController();
    
    try {
      const { epubBlob, pdfBlob } = await processEpub(
        file, 
        { ...settings, uiLang }, 
        (p) => {
          setProgress(p);
          if (p.lastZipPathIndex !== undefined && p.lastNodeIndex !== undefined && p.translatedNodes) {
             const res: ResumeInfo = {
                filename: file.name,
                zipPathIndex: p.lastZipPathIndex,
                nodeIndex: p.lastNodeIndex,
                translatedNodes: p.translatedNodes,
                settings: settings
             };
             localStorage.setItem(STORAGE_KEY_RESUME, JSON.stringify(res));
          }
        }, 
        abortControllerRef.current.signal,
        isResuming ? resumeData || undefined : undefined
      );

      setDownloadUrl(URL.createObjectURL(epubBlob));
      setPdfDownloadUrl(URL.createObjectURL(pdfBlob));
      
      const newHistoryItem: HistoryItem = { id: Date.now().toString(), filename: file.name, sourceLang: settings.sourceLanguage, targetLang: settings.targetLanguage, modelId: settings.modelId || 'gemini', timestamp: new Date().toLocaleString(), status: 'completed', settingsSnapshot: { ...settings } };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
      
      localStorage.removeItem(STORAGE_KEY_RESUME);
      setResumeData(null);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          setError({ title: t.error, message: t.quotaError });
        } else {
          setError({ title: t.error, message: err.message });
        }
      }
    } finally { setIsProcessing(false); }
  };

  const toggleTag = (tag: string) => {
    const currentTags = settings.targetTags;
    if (currentTags.includes(tag)) {
      setSettings({ ...settings, targetTags: currentTags.filter(t => t !== tag) });
    } else {
      setSettings({ ...settings, targetTags: [...currentTags, tag] });
    }
  };

  if (isInitializing) return <div className="h-screen flex items-center justify-center dark:bg-slate-950"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-all duration-300 flex flex-col relative overflow-hidden">
      {(isLeftDrawerOpen || isRightDrawerOpen) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] transition-opacity" onClick={() => { setIsLeftDrawerOpen(false); setIsRightDrawerOpen(false); }} />
      )}

      {/* History Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-slate-900 z-[80] shadow-2xl transition-transform duration-300 transform border-r border-slate-200 dark:border-slate-800 ${isLeftDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-black tracking-widest text-indigo-600 uppercase flex items-center gap-2"><History size={16}/> {t.historyTitle}</h3>
            <button onClick={() => setIsLeftDrawerOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30"><Database size={40} /><p className="text-[10px] font-black uppercase mt-4">{t.noHistory}</p></div>
            ) : (
              <>
                <button onClick={() => {setHistory([]); localStorage.removeItem(STORAGE_KEY_HISTORY)}} className="w-full py-2 text-[10px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg uppercase transition-colors mb-2">{t.clearHistory}</button>
                {history.map(item => (
                  <div key={item.id} onClick={() => { setSettings(item.settingsSnapshot); setIsLeftDrawerOpen(false); setIsRightDrawerOpen(true); }} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-400 cursor-pointer group relative">
                    <p className="text-[11px] font-black truncate text-slate-700 dark:text-slate-200">{item.filename}</p>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/50">
                        <span className="text-[9px] font-bold text-slate-400">{item.sourceLang} → {item.targetLang}</span>
                        <span className="text-[8px] font-black text-indigo-500 uppercase">{t.restoreSettings}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Settings Drawer */}
      <aside className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 z-[80] shadow-2xl transition-transform duration-300 transform border-l border-slate-200 dark:border-slate-800 ${isRightDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-black tracking-widest text-indigo-600 uppercase flex items-center gap-2"><Settings size={16}/> {t.settingsTitle}</h3>
            <button onClick={() => setIsRightDrawerOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={12}/> {t.apiStatus}</label>
              <div className={`p-5 rounded-3xl border-2 transition-all duration-500 ${hasPaidKey ? 'bg-indigo-50/30 border-indigo-500/50' : 'bg-slate-50 border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${hasPaidKey ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                      <span className="text-[10px] font-black uppercase">{hasPaidKey ? t.paidMode : t.freeMode}</span>
                   </div>
                   {hasPaidKey ? <Unlock size={14} className="text-indigo-500" /> : <Lock size={14} className="text-slate-400" />}
                </div>
                
                <button 
                  onClick={handleConnectAiStudio} 
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 mb-4"
                >
                  <Zap size={14} fill="currentColor"/> {t.connectAiStudio}
                </button>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.manualKeyLabel}</label>
                  <div className="relative group">
                      <input 
                        type={showKey ? "text" : "password"} 
                        value={manualKey} 
                        onChange={(e) => setManualKey(e.target.value)} 
                        placeholder={t.manualKeyPlaceholder} 
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 pl-4 pr-12 text-[11px] font-mono outline-none focus:border-indigo-500 transition-all shadow-inner" 
                      />
                      <button 
                        onClick={() => setShowKey(!showKey)} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors p-1"
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                  </div>
                  
                  <button 
                    onClick={() => verifyApiKey()} 
                    disabled={isVerifying || !manualKey} 
                    className="w-full py-3.5 bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 transition-all shadow-lg"
                  >
                    {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} 
                    {isVerifying ? t.checkKey : t.verifyBtn}
                  </button>
                </div>
                
                <p className="mt-3 text-[8px] font-medium text-slate-400 text-center px-2">{t.billingInfo}</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sliders size={12}/> {t.modelLabel}</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                    { id: 'gemini-flash-lite-latest', name: 'Gemini Lite', desc: 'Free (24/7)', locked: false },
                    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Balanced', locked: !hasPaidKey },
                    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', desc: 'Expert', locked: !hasPaidKey }
                ].map(m => (
                  <button 
                    key={m.id} 
                    disabled={m.locked} 
                    onClick={() => setSettings({...settings, modelId: m.id})} 
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${
                      settings.modelId === m.id 
                        ? 'border-indigo-500 bg-indigo-50/20' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    {m.locked && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center backdrop-blur-[1px]">
                         <Lock size={12} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black ${settings.modelId === m.id ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>{m.name}</span>
                        {settings.modelId === m.id && <Check size={12} className="text-indigo-500" />}
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tags size={12}/> {t.htmlTags}</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map(tag => (
                  <button 
                    key={tag} 
                    onClick={() => toggleTag(tag)} 
                    className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                      settings.targetTags.includes(tag) 
                        ? 'border-indigo-500 bg-indigo-500 text-white shadow-md' 
                        : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.creativity}</label><span className="text-[10px] font-black text-indigo-600">{settings.temperature}</span></div>
                <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase"><span>{t.literal}</span><span>{t.creative}</span></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Navigation */}
      <nav className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center px-6">
        <div className="flex-1 flex justify-start"><button onClick={() => setIsLeftDrawerOpen(true)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-500 active:scale-90"><History size={22}/></button></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group">
          <div className="flex items-center gap-4">
            <span className="text-4xl group-hover:scale-110 transition-transform">📖</span>
            <div className="flex flex-col items-center">
              <h1 className="font-black tracking-tight text-xl uppercase bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">{t.title}</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.description}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-end items-center gap-3">
          <button onClick={() => setIsLangModalOpen(true)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors"><Globe size={12}/> {uiLang.toUpperCase()}</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">{isDarkMode ? '☀️' : '🌙'}</button>
          <button onClick={() => setIsRightDrawerOpen(true)} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 hover:bg-indigo-100 active:scale-90 transition-all"><Settings size={22}/></button>
        </div>
      </nav>

      <main className="flex-1 pt-20 flex flex-col items-center">
        {/* Status Bar - Sticky with top-20 to sit below nav */}
        <div className="w-full sticky top-20 z-40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-3.5 flex items-center justify-center">
            <div className="w-full max-w-6xl flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${hasPaidKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}></div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{hasPaidKey ? t.paidMode : t.freeMode}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex items-center gap-2"><BarChart3 size={14} className="text-indigo-500" /><span className="text-[9px] font-black text-slate-400 uppercase">{t.tokens}:</span><span className="text-xs font-black italic">{progress.usage?.totalTokens.toLocaleString() || 0}</span></div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><Activity size={14} className="text-blue-500" /><span className="text-[9px] font-black text-slate-400 uppercase">{t.speed}:</span><span className="text-xs font-black italic">{isProcessing ? `${progress.wordsPerSecond?.toFixed(1)} w/s` : '--'}</span></div>
                    <div className="flex items-center gap-2"><Clock size={14} className="text-amber-500" /><span className="text-[9px] font-black text-slate-400 uppercase">{t.eta}:</span><span className="text-xs font-black italic">{isProcessing ? `${progress.etaSeconds}s` : '--'}</span></div>
                </div>
            </div>
        </div>

        <div className="w-full max-w-5xl px-6 py-12 space-y-12">
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-12 space-y-10 shadow-xl">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.uploadLabel}</label>
                  <div className="relative group cursor-pointer">
                    <input type="file" accept=".epub" onChange={(e) => { const f = e.target.files?.[0]; if(f) { setFile(f); setDownloadUrl(null); setPdfDownloadUrl(null); } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className={`py-16 border-3 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all duration-500 ${file ? 'bg-indigo-50/20 border-indigo-500 scale-[1.01]' : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                      <Upload size={36} className={file ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'} />
                      <span className="text-base font-black text-slate-600 dark:text-slate-600 px-6 text-center leading-tight">{file ? file.name : t.uploadPlaceholder}</span>
                      {file && <span className="text-[10px] font-bold text-slate-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.sourceLang}</label>
                    <select value={settings.sourceLanguage} onChange={(e) => setSettings({...settings, sourceLanguage: e.target.value})} className="w-full p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-black text-sm outline-none focus:border-indigo-500 transition-all appearance-none shadow-sm">
                      {LANG_CODE_TO_LABEL && Object.values(LANG_CODE_TO_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                      <option value="Automatic">Automatic</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.targetLang}</label>
                    <select value={settings.targetLanguage} onChange={(e) => setSettings({...settings, targetLanguage: e.target.value})} className="w-full p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-black text-sm outline-none focus:border-indigo-500 transition-all appearance-none shadow-sm">
                      {LANG_CODE_TO_LABEL && Object.values(LANG_CODE_TO_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-6">
                  {!isProcessing && !downloadUrl && (
                    <div className="w-full flex flex-col gap-4">
                        <button onClick={() => startTranslation(false)} disabled={!file} className="w-full py-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"><Play className="inline mr-3" size={28} fill="currentColor"/> {t.startBtn}</button>
                        {resumeData && resumeData.filename === file?.name && (
                            <button onClick={() => startTranslation(true)} className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-[1.5rem] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-3"><StepForward size={20}/> {t.resumeBtn}</button>
                        )}
                    </div>
                  )}
                  {isProcessing && (
                    <div className="w-full space-y-8 py-4">
                       <ProgressBar progress={progress.currentPercent} />
                       <button onClick={() => abortControllerRef.current?.abort()} className="mx-auto block px-14 py-3.5 rounded-full border-2 border-red-500/20 text-red-500 font-black text-[10px] uppercase hover:bg-red-50 dark:hover:bg-red-950/20 transition-all tracking-widest">{t.stopBtn}</button>
                    </div>
                  )}
                  {downloadUrl && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full animate-fade-scale">
                      <a href={downloadUrl} download={`translated_${file?.name}`} className="flex items-center justify-center gap-5 p-7 bg-green-600 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-green-700 transition-all text-xl"><Download size={28} /> {t.downloadBtn}</a>
                      <a href={pdfDownloadUrl || '#'} download={`translated_${file?.name?.replace('.epub', '')}.pdf`} className="flex items-center justify-center gap-5 p-7 bg-slate-800 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-slate-900 transition-all border border-slate-700 text-xl"><FileText size={28} /> {t.pdfBtn}</a>
                    </div>
                  )}
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
              <section className="md:col-span-5 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 space-y-6 shadow-sm relative overflow-hidden group">
                <div className="flex items-center gap-3.5 text-indigo-600"><Sparkles size={20}/> <h3 className="text-[12px] font-black uppercase tracking-[0.2em]">{t.aiAnalysis}</h3></div>
                <div className="min-h-[160px] flex flex-col justify-center">
                    {progress.strategy ? (
                    <div className="space-y-5 animate-fade-scale">
                        <div className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl inline-block border border-indigo-100 shadow-sm"><p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{progress.strategy.genre_translated}</p></div>
                        <p className="text-sm italic text-slate-500 dark:text-slate-400 leading-relaxed serif">"{progress.strategy.strategy_translated}"</p>
                    </div>
                    ) : (
                        <div className="flex flex-col items-center gap-5 opacity-20 py-10"><BrainCircuit size={45} className="animate-pulse" /><p className="text-[11px] font-black uppercase tracking-widest">{t.preparing}</p></div>
                    )}
                </div>
              </section>
              <section className="md:col-span-7 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-10 flex flex-col h-[360px] shadow-sm">
                <div className="flex items-center gap-3.5 text-slate-400 mb-6 border-b border-slate-50 dark:border-slate-800 pb-5"><Activity size={20}/> <h3 className="text-[12px] font-black uppercase tracking-[0.2em]">{t.systemMonitor}</h3></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px]"><LogViewer logs={progress.logs} readyText={t.systemLogsReady} /></div>
              </section>
            </div>
        </div>
      </main>

      {isLangModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[4rem] p-12 border border-slate-200 dark:border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-fade-scale">
            <div className="flex justify-between items-center mb-10"><h3 className="text-3xl font-black">{t.selectLang}</h3><button onClick={() => setIsLangModalOpen(false)} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all hover:rotate-90"><X /></button></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 overflow-y-auto max-h-[60vh] p-2 custom-scrollbar">
              {LANGUAGES_DATA.map(l => (
                <button 
                  key={l.code} 
                  onClick={() => { setUiLang(l.code as UILanguage); setIsLangModalOpen(false); localStorage.setItem('lit-trans-ui-lang', l.code) }} 
                  className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-500 ${uiLang === l.code ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-2xl scale-105' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                >
                  <span className="text-5xl">{l.flag}</span><span className="text-[11px] font-black uppercase tracking-widest">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-6 animate-shake">
          <div className="bg-red-600 text-white p-6 rounded-[2rem] shadow-[0_20px_60px_rgba(220,38,38,0.4)] flex items-center gap-5 border border-white/20">
            <div className="p-3 bg-white/20 rounded-2xl"><AlertCircle size={24} /></div>
            <div className="flex-1"><h4 className="font-black text-xs uppercase tracking-widest">{error.title}</h4><p className="text-[11px] leading-snug opacity-95 mt-1">{error.message}</p></div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
