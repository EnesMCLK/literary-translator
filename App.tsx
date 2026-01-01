
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Play, Pause, AlertCircle, CheckCircle2, 
  Settings, Sliders, Tags, Loader2, Clock, CircleDot, 
  History, BrainCircuit, Sparkles, ChevronRight,
  ShieldCheck, Info, FileText, XCircle, RefreshCw, Check, Globe, X,
  Zap, BarChart3, Scale, ShieldAlert, Activity, BookOpen, User, Trash2, StepForward,
  Key, LayoutDashboard, Database, Link2, Menu, Lock, Unlock, ExternalLink, Eye, EyeOff,
  BookType, Sun, Moon, Copyright, Heart, Shield, Gavel, ChevronDown, ChevronUp
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
  { code: 'ja', label: '日本語', flag: '日本語' }, { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' }, { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' }, { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }, { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' }
];

const STRINGS_REGISTRY: Record<string, any> = {
  tr: {
    historyTitle: "ÇEVİRİ GEÇMİŞİ", clearHistory: "Tümünü Temizle", noHistory: "Kayıt yok",
    modelLabel: "MODEL SEÇİMİ", uploadLabel: "EPUB YÜKLEME", uploadPlaceholder: "Dosya sürükle veya seç",
    sourceLang: "KAYNAK DİL", targetLang: "HEDEF DİL", creativity: "YARATICILIK", htmlTags: "HTML ETİKETLERİ",
    systemMonitor: "Sistem İzleyici", startBtn: "Çeviriyi Başlat", resumeBtn: "Devam Et", stopBtn: "Durdur", downloadBtn: "EPUB İNDİR", pdfBtn: "PDF İNDİR",
    tokens: "TOKEN", speed: "HIZ", eta: "KALAN", processing: "İşleniyor", idle: "Hazır",
    title: "Edebi EPUB Çevirmeni", description: "Profesyonel Edebi Çeviri Motoru", settingsTitle: "AYARLAR VE KONFİGÜRASYON",
    restoreSettings: "Geri Yükle", selectLang: "DİL SEÇİN", error: "HATA", apiStatus: "API DURUMU",
    freeMode: "ÜCRETSİZ MOD", paidMode: "PRO MOD", connectAiStudio: "AI STUDIO BAĞLAN", billingInfo: "Gelişmiş modeller için Paid Key gereklidir.",
    lockedModel: "Bağlantı Gerekli", checkKey: "Doğrulanıyor...", verifyBtn: "AKTİF ET", manualKeyLabel: "MANUEL ANAHTAR",
    manualKeyPlaceholder: "API Anahtarınızı buraya yapıştırın...", aiAnalysis: "YAPAY ZEKA ANALİZİ", preparing: "HAZIRLIK BEKLENİYOR",
    systemLogsReady: "Sistem Girişleri Bekleniyor...", verifyingError: "Doğrulama hatası!", literal: "Sadık", creative: "Yaratıcı",
    quotaError: "KOTA DOLDU: Lütfen yaklaşık 60 saniye bekleyin. Çeviri durduruldu, kaldığınız yerden devam edebilirsiniz.",
    interfaceSettings: "ARAYÜZ AYARLARI", themeMode: "TEMA MODU", appLanguage: "UYGULAMA DİLİ",
    copyright: "2024 AI Literary EPUB Translator. Tüm hakları saklıdır.", madeWith: "Gemini AI ile sevgiyle yapıldı.", learnMore: "Bilgi Al",
    legalWarningTitle: "YASAL SORUMLULUK REDDİ VE KULLANIM KOŞULLARI",
    legalWarningText: "Bu yazılım ('Araç'), kullanıcıların EPUB formatındaki içerikleri yapay zeka desteğiyle yerelleştirmesine olanak tanıyan deneysel bir yardımcı programdır. İşbu Aracı kullanarak aşağıdaki hususları peşinen kabul etmiş sayılırsınız:",
    legalPoints: [
      "Fikri Mülkiyet: İşlenen her türlü içeriğin (EPUB) telif haklarına uygunluğundan ve yasal statüsünden münhasıran kullanıcı sorumludur.",
      "Kişisel Kullanım: Bu araç ticari amaç gütmez; yalnızca kişisel, hobi veya eğitim amaçlı kullanım için tasarlanmıştır.",
      "Sorumluluk Sınırı: Geliştiriciler, aracın kullanımından doğabilecek veri kayıpları, telif hakkı ihlalleri veya doğrudan/dolaylı hiçbir zarardan sorumlu tutulamaz.",
      "Yasal Bağlayıcılık: Servisin kullanılması, bu şartların ve tüm hukuki sonuçların kullanıcı tarafından tam muvafakat ile kabul edildiği anlamına gelir."
    ]
  },
  en: {
    historyTitle: "TRANSLATION HISTORY", clearHistory: "Clear All", noHistory: "No history",
    modelLabel: "MODEL SELECTION", uploadLabel: "UPLOAD EPUB", uploadPlaceholder: "Drag or select file",
    sourceLang: "SOURCE LANG", targetLang: "TARGET LANG", creativity: "CREATIVITY", htmlTags: "HTML TAGS",
    systemMonitor: "System Monitor", startBtn: "Start Translation", resumeBtn: "Resume", stopBtn: "Stop", downloadBtn: "DOWNLOAD EPUB", pdfBtn: "DOWNLOAD PDF",
    tokens: "TOKENS", speed: "SPEED", eta: "ETA", processing: "Processing", idle: "Idle",
    title: "Literary EPUB Translator", description: "Professional Literary Translation Engine", settingsTitle: "SETTINGS & CONFIG",
    restoreSettings: "Restore", selectLang: "SELECT LANGUAGE", error: "ERROR", apiStatus: "API STATUS",
    freeMode: "FREE MODE", paidMode: "PRO MOD", connectAiStudio: "CONNECT AI STUDIO", billingInfo: "Paid Key required for PRO models.",
    lockedModel: "Locked", checkKey: "Checking...", verifyBtn: "VERIFY", manualKeyLabel: "MANUAL KEY",
    manualKeyPlaceholder: "Paste your API key...", aiAnalysis: "AI ANALYSIS", preparing: "AWAITING PREP",
    systemLogsReady: "Waiting for logs...", verifyingError: "Key error!", literal: "Literal", creative: "Creative",
    quotaError: "QUOTA EXCEEDED: Please wait about 60 seconds. Translation paused, you can resume later.",
    interfaceSettings: "INTERFACE SETTINGS", themeMode: "THEMODE", appLanguage: "APP LANGUAGE",
    copyright: "2024 AI Literary EPUB Translator. All rights reserved.", madeWith: "Made with love with Gemini AI.", learnMore: "Learn More",
    legalWarningTitle: "LEGAL DISCLAIMER & TERMS OF SERVICE",
    legalWarningText: "This software ('Tool') is an experimental utility designed to assist users in localizing EPUB content via AI. By utilizing this Tool, you explicitly acknowledge and agree to the following terms:",
    legalPoints: [
      "Intellectual Property: Users are solely responsible for ensuring that all processed content complies with relevant copyright laws and international treaties.",
      "Non-Commercial Use: This tool is strictly for personal, non-commercial, and educational purposes.",
      "Limitation of Liability: The developers shall not be held liable for any data loss, copyright infringement, or direct/indirect damages resulting from the use of this Tool.",
      "Acceptance of Terms: Use of this service constitutes full consent to these terms and the acceptance of all associated legal consequences."
    ]
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
  const [isLegalExpanded, setIsLegalExpanded] = useState(false);
  
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
          setProgress(prev => ({
            ...p,
            logs: p.logs.length > 0 ? p.logs : prev.logs
          }));
          
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
            
            {/* Interface Settings Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={12}/> {t.interfaceSettings}</label>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-5">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase">{t.themeMode}</span>
                   <button 
                    onClick={() => setIsDarkMode(!isDarkMode)} 
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-indigo-600 transition-all hover:scale-105 active:scale-95"
                   >
                     {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                     <span className="text-[10px] font-black uppercase">{isDarkMode ? 'LIGHT' : 'DARK'}</span>
                   </button>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase">{t.appLanguage}</span>
                   <button 
                    onClick={() => setIsLangModalOpen(true)} 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
                   >
                     <Globe size={14} />
                     <span className="text-[10px] font-black uppercase">{uiLang.toUpperCase()}</span>
                   </button>
                </div>
              </div>
            </div>

            {/* API Status Section - Improved Dark Mode UI */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={12}/> {t.apiStatus}</label>
              <div className={`p-5 rounded-[2rem] border-2 transition-all duration-500 shadow-lg ${
                hasPaidKey 
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500/50' 
                  : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/50'
              }`}>
                <div className="flex items-center justify-between mb-5">
                   <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${hasPaidKey ? 'bg-green-500 animate-pulse shadow-green-500/50' : 'bg-amber-500 shadow-amber-500/50'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${hasPaidKey ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-300'}`}>
                        {hasPaidKey ? t.paidMode : t.freeMode}
                      </span>
                   </div>
                   <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    {hasPaidKey ? <Unlock size={14} className="text-indigo-500" /> : <Lock size={14} className="text-slate-400 dark:text-slate-500" />}
                   </div>
                </div>
                
                <button 
                  onClick={handleConnectAiStudio} 
                  className="w-full flex items-center justify-center gap-2.5 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 mb-6 group"
                >
                  <Zap size={14} className="group-hover:animate-pulse" fill="currentColor"/> 
                  {t.connectAiStudio}
                </button>

                <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ml-1">{t.manualKeyLabel}</label>
                  <div className="relative group">
                      <input 
                        type={showKey ? "text" : "password"} 
                        value={manualKey} 
                        onChange={(e) => setManualKey(e.target.value)} 
                        placeholder={t.manualKeyPlaceholder} 
                        className="w-full bg-slate-50 dark:bg-slate-900/80 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-4 pr-12 text-[12px] font-mono outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner text-slate-700 dark:text-slate-200" 
                      />
                      <button 
                        onClick={() => setShowKey(!showKey)} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors p-1.5"
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                  </div>
                  
                  <button 
                    onClick={() => verifyApiKey()} 
                    disabled={isVerifying || !manualKey} 
                    className="w-full py-4 bg-slate-900 dark:bg-indigo-600/90 hover:bg-black dark:hover:bg-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-40 transition-all shadow-lg"
                  >
                    {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} 
                    {isVerifying ? t.checkKey : t.verifyBtn}
                  </button>
                </div>
                
                <div className="mt-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 text-center leading-relaxed px-4 flex flex-col items-center gap-1.5">
                  <span>{t.billingInfo}</span>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-black uppercase text-[8px]"
                  >
                    {t.learnMore} <ExternalLink size={10} />
                  </a>
                </div>
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
                        ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/10' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    {m.locked && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/70 flex items-center justify-center backdrop-blur-[1px]">
                         <Lock size={12} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black ${settings.modelId === m.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>{m.name}</span>
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

      {/* Navigation - Ultra Minimalist for Maximum Title Space */}
      <nav className="h-16 md:h-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center px-4 md:px-6">
        <div className="flex-1 flex justify-start items-center">
          <button 
            onClick={() => setIsLeftDrawerOpen(true)} 
            className="p-2 md:p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:rounded-2xl transition-all text-slate-500 active:scale-90 shrink-0"
            title={t.historyTitle}
          >
            <History size={20} className="md:w-6 md:h-6" />
          </button>
        </div>
        
        <div className="flex flex-col items-center flex-shrink min-w-0 px-2 group overflow-hidden">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
            <span className="text-2xl md:text-4xl group-hover:scale-110 transition-transform shrink-0">📖</span>
            <div className="flex flex-col items-center min-w-0">
              <h1 className="font-black tracking-tight text-sm md:text-xl uppercase bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 truncate w-full text-center leading-tight">
                {t.title}
              </h1>
              <p className="hidden lg:block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.description}</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex justify-end items-center">
          <button 
            onClick={() => setIsRightDrawerOpen(true)} 
            className="p-2 md:p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg md:rounded-2xl text-indigo-600 hover:bg-indigo-100 active:scale-90 transition-all shrink-0"
            title={t.settingsTitle}
          >
            <Settings size={20} className="md:w-6 md:h-6" />
          </button>
        </div>
      </nav>

      {/* Status Bar - FIXED below nav */}
      <div className="w-full fixed top-16 md:top-20 left-0 right-0 z-40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-2 md:py-3.5 flex items-center justify-center">
          <div className="w-full max-w-6xl flex items-center justify-between gap-2 md:gap-6 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-3 md:gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 md:gap-2.5">
                    <div className={`w-2 md:w-2.5 h-2 md:h-2.5 rounded-full ${hasPaidKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}></div>
                    <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{hasPaidKey ? t.paidMode : t.freeMode}</span>
                  </div>
                  <div className="h-3 md:h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                  <div className="flex items-center gap-1.5 md:gap-2"><BarChart3 size={12} className="text-indigo-500 md:w-3.5 md:h-3.5" /><span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">{t.tokens}:</span><span className="text-[10px] md:text-xs font-black italic whitespace-nowrap">{progress.usage?.totalTokens.toLocaleString() || 0}</span></div>
              </div>
              <div className="flex items-center gap-3 md:gap-6 shrink-0">
                  <div className="flex items-center gap-1.5 md:gap-2"><Activity size={12} className="text-blue-500 md:w-3.5 md:h-3.5" /><span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">{t.speed}:</span><span className="text-[10px] md:text-xs font-black italic whitespace-nowrap">{isProcessing ? `${progress.wordsPerSecond?.toFixed(1)} w/s` : '--'}</span></div>
                  <div className="flex items-center gap-1.5 md:gap-2"><Clock size={12} className="text-amber-500 md:w-3.5 md:h-3.5" /><span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">{t.eta}:</span><span className="text-[10px] md:text-xs font-black italic whitespace-nowrap">{isProcessing ? `${progress.etaSeconds}s` : '--'}</span></div>
              </div>
          </div>
      </div>

      <main className="flex-1 pt-32 md:pt-36 flex flex-col items-center">
        <div className="w-full max-w-5xl px-6 py-6 md:py-12 space-y-8 md:space-y-12">
            <section className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 p-6 md:p-12 space-y-8 md:space-y-10 shadow-xl">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.uploadLabel}</label>
                  <div className="relative group cursor-pointer">
                    <input type="file" accept=".epub" onChange={(e) => { const f = e.target.files?.[0]; if(f) { setFile(f); setDownloadUrl(null); setPdfDownloadUrl(null); } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className={`py-12 md:py-16 border-3 border-dashed rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all duration-500 ${file ? 'bg-indigo-50/20 border-indigo-500 scale-[1.01]' : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                      <Upload size={32} className={file ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600'} />
                      <span className="text-sm md:text-base font-black text-slate-600 dark:text-slate-600 px-6 text-center leading-tight">{file ? file.name : t.uploadPlaceholder}</span>
                      {file && <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.sourceLang}</label>
                    <select value={settings.sourceLanguage} onChange={(e) => setSettings({...settings, sourceLanguage: e.target.value})} className="w-full p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-black text-sm outline-none focus:border-indigo-500 transition-all appearance-none shadow-sm">
                      {LANG_CODE_TO_LABEL && Object.values(LANG_CODE_TO_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                      <option value="Automatic">Automatic</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.targetLang}</label>
                    <select value={settings.targetLanguage} onChange={(e) => setSettings({...settings, targetLanguage: e.target.value})} className="w-full p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-black text-sm outline-none focus:border-indigo-500 transition-all appearance-none shadow-sm">
                      {LANG_CODE_TO_LABEL && Object.values(LANG_CODE_TO_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-6">
                  {!isProcessing && !downloadUrl && (
                    <div className="w-full flex flex-col gap-4">
                        <button onClick={() => startTranslation(false)} disabled={!file} className="w-full py-5 md:py-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl md:rounded-[2rem] font-black text-lg md:text-xl shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"><Play className="inline mr-3" size={24} md:size={28} fill="currentColor"/> {t.startBtn}</button>
                        {resumeData && resumeData.filename === file?.name && (
                            <button onClick={() => startTranslation(true)} className="w-full py-4 md:py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl md:rounded-[1.5rem] font-black text-xs md:text-sm shadow-xl transition-all flex items-center justify-center gap-3"><StepForward size={18} md:size={20}/> {t.resumeBtn}</button>
                        )}
                    </div>
                  )}
                  {isProcessing && (
                    <div className="w-full space-y-6 md:space-y-8 py-4">
                       <ProgressBar progress={progress.currentPercent} />
                       <button onClick={() => abortControllerRef.current?.abort()} className="mx-auto block px-10 md:px-14 py-3 rounded-full border-2 border-red-500/20 text-red-500 font-black text-[9px] md:text-[10px] uppercase hover:bg-red-50 dark:hover:bg-red-950/20 transition-all tracking-widest">{t.stopBtn}</button>
                    </div>
                  )}
                  {downloadUrl && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full animate-fade-scale">
                      <a href={downloadUrl} download={`translated_${file?.name}`} className="flex items-center justify-center gap-4 p-5 md:p-7 bg-green-600 text-white rounded-[2rem] md:rounded-[2.5rem] font-black shadow-2xl hover:bg-green-700 transition-all text-lg md:text-xl"><Download size={24} md:size={28} /> {t.downloadBtn}</a>
                      <a href={pdfDownloadUrl || '#'} download={`translated_${file?.name?.replace('.epub', '')}.pdf`} className="flex items-center justify-center gap-4 p-5 md:p-7 bg-slate-800 text-white rounded-[2rem] md:rounded-[2.5rem] font-black shadow-2xl hover:bg-slate-900 transition-all border border-slate-700 text-lg md:text-xl"><FileText size={24} md:size={28} /> {t.pdfBtn}</a>
                    </div>
                  )}
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
              <section className="md:col-span-5 bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 md:p-10 space-y-6 shadow-sm relative overflow-hidden group">
                <div className="flex items-center gap-3 text-indigo-600"><Sparkles size={18} md:size={20}/> <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em]">{t.aiAnalysis}</h3></div>
                <div className="min-h-[120px] md:min-h-[160px] flex flex-col justify-center">
                    {progress.strategy ? (
                    <div className="space-y-4 md:space-y-5 animate-fade-scale">
                        <div className="px-4 md:px-5 py-2 md:py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl md:rounded-2xl inline-block border border-indigo-100 shadow-sm"><p className="text-[9px] md:text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{progress.strategy.genre_translated}</p></div>
                        <p className="text-xs md:text-sm italic text-slate-500 dark:text-slate-400 leading-relaxed serif">"{progress.strategy.strategy_translated}"</p>
                    </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 md:gap-5 opacity-20 py-8 md:py-10"><BrainCircuit size={40} md:size={45} className="animate-pulse" /><p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">{t.preparing}</p></div>
                    )}
                </div>
              </section>
              <section className="md:col-span-7 bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 md:p-10 flex flex-col h-[300px] md:h-[360px] shadow-sm">
                <div className="flex items-center gap-3 text-slate-400 mb-4 md:mb-6 border-b border-slate-50 dark:border-slate-800 pb-4 md:pb-5"><Activity size={18} md:size={20}/> <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em]">{t.systemMonitor}</h3></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] md:text-[11px]"><LogViewer logs={progress.logs} readyText={t.systemLogsReady} /></div>
              </section>
            </div>

            {/* Legal Warning Card - Interactive Toggle */}
            <section 
              onClick={() => setIsLegalExpanded(!isLegalExpanded)}
              className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 transition-all duration-500 p-8 md:p-12 shadow-2xl mb-24 relative overflow-hidden cursor-pointer group hover:border-indigo-400 ${isLegalExpanded ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-slate-100 dark:border-slate-800'}`}
            >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Gavel size={120} />
                </div>
                <div className="flex flex-col gap-8 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className={`p-4 transition-colors duration-500 rounded-[1.5rem] shadow-xl ${isLegalExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-950 dark:bg-slate-800 text-slate-400'}`}>
                              <Shield size={24} />
                          </div>
                          <h4 className={`text-[14px] md:text-[16px] font-black uppercase tracking-[0.2em] border-b-2 pb-1 transition-colors ${isLegalExpanded ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500' : 'text-slate-900 dark:text-white border-transparent'}`}>
                            {t.legalWarningTitle}
                          </h4>
                      </div>
                      <div className="p-2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                        {isLegalExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                        <p className={`text-[12px] md:text-[14px] leading-relaxed font-bold italic transition-colors ${isLegalExpanded ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                          {t.legalWarningText}
                        </p>
                        
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-700 overflow-hidden ${isLegalExpanded ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                          {t.legalPoints.map((point: string, idx: number) => (
                            <div key={idx} className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all">
                                <div className="text-indigo-500 font-black text-sm pt-0.5">{idx + 1}.</div>
                                <p className="text-[11px] md:text-[12px] leading-snug font-medium text-slate-600 dark:text-slate-300">
                                  {point}
                                </p>
                            </div>
                          ))}
                        </div>
                    </div>

                    {!isLegalExpanded && (
                      <div className="flex items-center justify-center gap-2 animate-pulse py-2">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t.learnMore}</span>
                      </div>
                    )}

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3">
                        <Heart size={14} className="text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.madeWith}</span>
                    </div>
                </div>
            </section>
        </div>
      </main>

      {/* Language Modal (Used from Interface Settings) */}
      {isLangModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-fade-scale">
            <div className="flex justify-between items-center mb-6 md:mb-10"><h3 className="text-xl md:text-3xl font-black">{t.selectLang}</h3><button onClick={() => setIsLangModalOpen(false)} className="p-2 md:p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all hover:rotate-90"><X /></button></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-5 overflow-y-auto max-h-[60vh] p-1 md:p-2 custom-scrollbar">
              {LANGUAGES_DATA.map(l => (
                <button 
                  key={l.code} 
                  onClick={() => { setUiLang(l.code as UILanguage); setIsLangModalOpen(false); localStorage.setItem('lit-trans-ui-lang', l.code) }} 
                  className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-2 flex flex-col items-center gap-2 md:gap-4 transition-all duration-500 ${uiLang === l.code ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-2xl scale-105' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                >
                  <span className="text-3xl md:text-5xl">{l.flag}</span><span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-6 animate-shake">
          <div className="bg-red-600 text-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_rgba(220,38,38,0.4)] flex items-center gap-4 md:gap-5 border border-white/20">
            <div className="p-2 md:p-3 bg-white/20 rounded-xl md:rounded-2xl"><AlertCircle size={20} md:size={24} /></div>
            <div className="flex-1"><h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest">{error.title}</h4><p className="text-[10px] md:text-[11px] leading-snug opacity-95 mt-1">{error.message}</p></div>
            <button onClick={() => setError(null)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg md:rounded-xl transition-colors"><X size={16} md:size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
