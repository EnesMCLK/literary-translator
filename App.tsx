
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Play, Pause, AlertCircle, CheckCircle2, 
  Settings, Sliders, Tags, Loader2, Clock, CircleDot, 
  History, BrainCircuit, Sparkles, ChevronRight,
  ShieldCheck, Info, FileText, XCircle, RefreshCw, Check, Globe, X,
  Zap, BarChart3, Scale, ShieldAlert, Activity, BookOpen, User, Trash2, StepForward,
  Key, LayoutDashboard, Database, Link2, Menu, Lock, Unlock, ExternalLink, Eye, EyeOff,
  BookType, Sun, Moon, Copyright, Heart, Shield, Gavel, ChevronDown, ChevronUp, Wand2
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
    systemMonitor: "Sistem İzleyici", startBtn: "Çeviriyi Başlat", resumeBtn: "Devam Et", stopBtn: "Durdur", downloadBtn: "EPUB İNDİR",
    tokens: "TOKEN", speed: "HIZ", eta: "KALAN", processing: "İşleniyor", idle: "Hazır",
    title: "Edebi EPUB Çevirmeni", description: "Profesyonel Edebi Çeviri Engine", settingsTitle: "AYARLAR VE KONFİGÜRASYON",
    restoreSettings: "Geri Yükle", selectLang: "DİL SEÇİN", error: "HATA", apiStatus: "API DURUMU",
    freeMode: "ÜCRETSİZ MOD", paidMode: "PRO MOD", connectAiStudio: "AI STUDIO BAĞLAN", billingInfo: "Gelişmiş modeller için Paid Key gereklidir.",
    lockedModel: "Bağlantı Gerekli", checkKey: "Doğrulanıyor...", verifyBtn: "AKTİF ET", manualKeyLabel: "MANUEL ANAHTAR",
    manualKeyPlaceholder: "API Anahtarınızı buraya yapıştırın...", aiAnalysis: "YAPAY ZEKA ANALİZİ", preparing: "HAZIRLIK BEKLENİYOR",
    systemLogsReady: "Sistem Girişleri Bekleniyor...", verifyingError: "Doğrulama hatası!", literal: "Sadık", creative: "Yaratıcı",
    quotaError: "KOTA DOLDU: Lütfen yaklaşık 60 saniye bekleyin. Çeviri durduruldu, kaldığınız yerden devam edebilirsiniz.",
    interfaceSettings: "ARAYÜZ AYARLARI", themeMode: "TEMA MODU", appLanguage: "UYGULAMA DİLİ",
    copyright: "2024 AI Literary EPUB Translator. Tüm hakları saklıdır.", learnMore: "BİLGİ AL",
    aiOptimized: "AI OPTİMİZE EDİLDİ",
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
    historyTitle: "TRANSLATION HISTORY", clearHistory: "Clear All", noHistory: "No records",
    modelLabel: "MODEL SELECTION", uploadLabel: "UPLOAD EPUB", uploadPlaceholder: "Drag or select file",
    sourceLang: "SOURCE LANG", targetLang: "TARGET LANG", creativity: "CREATIVITY", htmlTags: "HTML TAGS",
    systemMonitor: "System Monitor", startBtn: "Start Translation", resumeBtn: "Resume", stopBtn: "Stop", downloadBtn: "DOWNLOAD EPUB",
    tokens: "TOKENS", speed: "SPEED", eta: "REMAINING", processing: "Processing", idle: "Ready",
    title: "Literary EPUB Translator", description: "Professional Literary Translation Engine", settingsTitle: "SETTINGS & CONFIGURATION",
    restoreSettings: "Restore", selectLang: "SELECT LANGUAGE", error: "ERROR", apiStatus: "API STATUS",
    freeMode: "FREE MODE", paidMode: "PRO MODE", connectAiStudio: "CONNECT AI STUDIO", billingInfo: "Paid Key is required for advanced models.",
    lockedModel: "Connection Required", checkKey: "Verifying...", verifyBtn: "ACTIVATE", manualKeyLabel: "MANUAL KEY",
    manualKeyPlaceholder: "Paste your API Key here...", aiAnalysis: "AI ANALYSIS", preparing: "AWAITING PREPARATION",
    systemLogsReady: "Waiting for System Logs...", verifyingError: "Verification error!", literal: "Faithful", creative: "Creative",
    quotaError: "QUOTA EXCEEDED: Please wait about 60 seconds.",
    interfaceSettings: "INTERFACE SETTINGS", themeMode: "THEME MODE", appLanguage: "APP LANGUAGE",
    copyright: "2024 AI Literary EPUB Translator. All rights reserved.", learnMore: "INFO",
    aiOptimized: "AI OPTIMIZED",
    legalWarningTitle: "LEGAL DISCLAIMER & TERMS OF USE",
    legalWarningText: "This software ('Tool') is an experimental utility. By using it, you agree to:",
    legalPoints: [
      "IP: User is responsible for copyright compliance.",
      "Personal Use: Hobby or education only.",
      "Liability: Developers are not responsible for damages.",
      "Binding: Usage constitutes full consent."
    ]
  },
  it: {
    historyTitle: "CRONOLOGIA TRADUZIONI", clearHistory: "Cancella Tutto", noHistory: "Nessun record",
    modelLabel: "SELEZIONE MODELLO", uploadLabel: "CARICA EPUB", uploadPlaceholder: "Trascina o seleziona file",
    sourceLang: "LINGUA ORIGINE", targetLang: "LINGUA DESTINAZIONE", creativity: "CREATIVITÀ", htmlTags: "TAG HTML",
    systemMonitor: "Monitor di Sistema", startBtn: "Avvia Traduzione", resumeBtn: "Riprendi", stopBtn: "Ferma", downloadBtn: "SCARICA EPUB",
    tokens: "TOKEN", speed: "VELOCITÀ", eta: "RIMANENTE", processing: "In corso", idle: "Pronto",
    title: "Traduttore EPUB Letterario", description: "Motore di Traduzione Letteraria Professionale", settingsTitle: "IMPOSTAZIONI & CONFIGURAZIONE",
    restoreSettings: "Ripristina", selectLang: "SELEZIONA LINGUA", error: "ERRORE", apiStatus: "STATO API",
    freeMode: "MODALITÀ GRATUITA", paidMode: "MODALITÀ PRO", connectAiStudio: "CONNETTI AI STUDIO", billingInfo: "Chiave a pagamento richiesta per modelli PRO.",
    lockedModel: "Connessione Richiesta", checkKey: "Verifica...", verifyBtn: "ATTIVA", manualKeyLabel: "CHIAVE MANUALE",
    manualKeyPlaceholder: "Incolla la tua chiave API...", aiAnalysis: "ANALISI IA", preparing: "IN ATTESA",
    systemLogsReady: "In attesa dei log...", verifyingError: "Errore di verifica!", literal: "Fedele", creative: "Creativo",
    quotaError: "QUOTA SUPERATA: Attendere 60 secondi.",
    interfaceSettings: "IMPOSTAZIONI INTERFACCIA", themeMode: "MODALITÀ TEMA", appLanguage: "LINGUA APP",
    copyright: "2024 AI Literary EPUB Translator. Tutti i diritti riservati.", learnMore: "INFO",
    aiOptimized: "OTTIMIZZATO IA",
    legalWarningTitle: "ESCLUSIONE DI RESPONSABILITÀ LEGALE",
    legalWarningText: "Questo software è un'utilità sperimentale. Usandolo, accetti:",
    legalPoints: ["IP: L'utente è responsabile del copyright.", "Uso Personale: Solo hobby o educazione.", "Responsabilità: Sviluppatori non responsabili per danni.", "Vincolo: L'uso costituisce consenso."]
  },
  ru: {
    historyTitle: "ИСТОРИЯ ПЕРЕВОДОВ", clearHistory: "Очистить все", noHistory: "Нет записей",
    modelLabel: "ВЫБОР МОДЕЛИ", uploadLabel: "ЗАГРУЗИТЬ EPUB", uploadPlaceholder: "Перетащите или выберите файл",
    sourceLang: "ИСХОДНЫЙ ЯЗЫК", targetLang: "ЯЗЫК ПЕРЕВОДА", creativity: "КРЕАТИВНОСТЬ", htmlTags: "HTML ТЕГИ",
    systemMonitor: "Системный монитор", startBtn: "Начать перевод", resumeBtn: "Продолжить", stopBtn: "Стоп", downloadBtn: "СКАЧАТЬ EPUB",
    tokens: "ТОКЕНЫ", speed: "СКОРОСТЬ", eta: "ОСТАЛОСЬ", processing: "Обработка", idle: "Готов",
    title: "Литературный EPUB переводчик", description: "Профессиональный движок литературного перевода", settingsTitle: "НАСТРОЙКИ И КОНФИГУРАЦИЯ",
    restoreSettings: "Восстановить", selectLang: "ВЫБРАТЬ ЯЗЫК", error: "ОШИБКА", apiStatus: "СТАТУС API",
    freeMode: "БЕСПЛАТНЫЙ РЕЖИМ", paidMode: "PRO РЕЖИМ", connectAiStudio: "ПОДКЛЮЧИТЬ AI STUDIO", billingInfo: "Для PRO моделей нужен платный ключ.",
    lockedModel: "Требуется подключение", checkKey: "Проверка...", verifyBtn: "АКТИВИРОВАТЬ", manualKeyLabel: "РУЧНОЙ КЛЮЧ",
    manualKeyPlaceholder: "Вставьте ваш API ключ...", aiAnalysis: "ИИ АНАЛИЗ", preparing: "ПОДГОТОВКА",
    systemLogsReady: "Ожидание логов...", verifyingError: "Ошибка проверки!", literal: "Буквальный", creative: "Творческий",
    quotaError: "КВОТА ПРЕВЫШЕНА: Подождите 60 секунд.",
    interfaceSettings: "НАСТРОЙКИ ИНТЕРФЕЙСА", themeMode: "ТЕМНЫЙ РЕЖИМ", appLanguage: "ЯЗЫК ПРИЛОЖЕНИЯ",
    copyright: "2024 AI Literary EPUB Translator. Все права защищены.", learnMore: "ИНФО",
    aiOptimized: "ОПТИМИЗИРОВАНО ИИ",
    legalWarningTitle: "ЮРИДИЧЕСКИЙ ОТКАЗ ОТ ОТВЕТСТВЕННОСТИ",
    legalWarningText: "Это экспериментальное ПО. Используя его, вы соглашаетесь с тем, что:",
    legalPoints: ["ИС: Пользователь отвечает за соблюдение авторских прав.", "Личное использование: Только для хобби или обучения.", "Ответственность: Разработчики не несут ответственности за ущерб.", "Согласие: Использование означает полное согласие."]
  },
  zh: {
    historyTitle: "翻译历史", clearHistory: "清除全部", noHistory: "无记录",
    modelLabel: "模型选择", uploadLabel: "上传 EPUB", uploadPlaceholder: "拖拽或选择文件",
    sourceLang: "源语言", targetLang: "目标语言", creativity: "创造力", htmlTags: "HTML 标签",
    systemMonitor: "系统监控", startBtn: "开始翻译", resumeBtn: "继续", stopBtn: "停止", downloadBtn: "下载 EPUB",
    tokens: "代币", speed: "速度", eta: "剩余时间", processing: "处理中", idle: "就绪",
    title: "文学 EPUB 翻译器", description: "专业文学翻译引擎", settingsTitle: "设置与配置",
    restoreSettings: "还原", selectLang: "选择语言", error: "错误", apiStatus: "API 状态",
    freeMode: "免费模式", paidMode: "专业模式", connectAiStudio: "连接 AI STUDIO", billingInfo: "专业模型需要付费密钥。",
    lockedModel: "需要连接", checkKey: "验证中...", verifyBtn: "激活", manualKeyLabel: "手动密钥",
    manualKeyPlaceholder: "在此粘贴您的 API 密钥...", aiAnalysis: "AI 分析", preparing: "准备中",
    systemLogsReady: "等待系统日志...", verifyingError: "验证错误！", literal: "直译", creative: "意译",
    quotaError: "配额超出：请等待 60 秒。",
    interfaceSettings: "界面设置", themeMode: "主题模式", appLanguage: "应用语言",
    copyright: "2024 AI Literary EPUB Translator. 保留所有权利。", learnMore: "详情",
    aiOptimized: "AI 已优化",
    legalWarningTitle: "法律声明与使用条款",
    legalWarningText: "本软件为实验性工具。使用即表示您同意：",
    legalPoints: ["知识产权：用户负责版权合规性。", "个人使用：仅限个人爱好或教育。", "责任限制：开发者不对损害负责。", "法律效力：使用即视为完全同意。"]
  },
  ko: {
    historyTitle: "번역 기록", clearHistory: "전체 삭제", noHistory: "기록 없음",
    modelLabel: "모델 선택", uploadLabel: "EPUB 업로드", uploadPlaceholder: "파일을 끌어오거나 선택",
    sourceLang: "출발어", targetLang: "도착어", creativity: "창의성", htmlTags: "HTML 태그",
    systemMonitor: "시스템 모니터", startBtn: "번역 시작", resumeBtn: "재개", stopBtn: "중지", downloadBtn: "EPUB 다운로드",
    tokens: "토큰", speed: "속도", eta: "남은 시간", processing: "처리 중", idle: "준비 완료",
    title: "문학 EPUB 번역기", description: "전문 문학 번역 엔진", settingsTitle: "설정 및 구성",
    restoreSettings: "복구", selectLang: "언어 선택", error: "오류", apiStatus: "API 상태",
    freeMode: "무료 모드", paidMode: "프로 모드", connectAiStudio: "AI STUDIO 연결", billingInfo: "프로 모델은 유료 키가 필요합니다.",
    lockedModel: "연결 필요", checkKey: "확인 중...", verifyBtn: "활성화", manualKeyLabel: "수동 키",
    manualKeyPlaceholder: "API 키를 입력하세요...", aiAnalysis: "AI 분석", preparing: "준비 대기 중",
    systemLogsReady: "시스템 로그 대기 중...", verifyingError: "인증 오류!", literal: "직역", creative: "의역",
    quotaError: "할당량 초과: 60초간 대기하세요.",
    interfaceSettings: "인터페이스 설정", themeMode: "테마 모드", appLanguage: "앱 언어",
    copyright: "2024 AI Literary EPUB Translator. 모든 권리 보유.", learnMore: "정보",
    aiOptimized: "AI 최적화 완료",
    legalWarningTitle: "법적 고지 및 이용 약관",
    legalWarningText: "이 소프트웨어는 실험용 도구입니다. 사용 시 다음 사항에 동의하게 됩니다:",
    legalPoints: ["IP: 사용자는 저작권 준수 책임이 있습니다.", "개인 용도: 취미 또는 교육용 전용.", "책임 제한: 개발자는 손해에 책임을 지지 않습니다.", "구속력: 사용은 전체 동의를 의미합니다."]
  },
  ar: {
    historyTitle: "سجل الترجمة", clearHistory: "مسح الكل", noHistory: "لا يوجد سجل",
    modelLabel: "اختيار النموذج", uploadLabel: "رفع EPUB", uploadPlaceholder: "اسحب أو اختر ملفاً",
    sourceLang: "اللغة الأصل", targetLang: "اللغة الهدف", creativity: "الإبداع", htmlTags: "علامات HTML",
    systemMonitor: "مراقب النظام", startBtn: "بدء الترجمة", resumeBtn: "استئناف", stopBtn: "إيقاف", downloadBtn: "تحميل EPUB",
    tokens: "الرموز", speed: "السرعة", eta: "المتبقي", processing: "جاري المعالجة", idle: "جاهز",
    title: "مترجم EPUB الأدبي", description: "محرك ترجمة أدبي احترافي", settingsTitle: "الإعدادات والتكوين",
    restoreSettings: "استعادة", selectLang: "اختر اللغة", error: "خطأ", apiStatus: "حالة API",
    freeMode: "الوضع المجاني", paidMode: "الوضع الاحترافي", connectAiStudio: "اتصال AI STUDIO", billingInfo: "مفتاح مدفوع مطلوب للنماذج المتقدمة.",
    lockedModel: "الاتصال مطلوب", checkKey: "جاري التحقق...", verifyBtn: "تفعيل", manualKeyLabel: "مفتاح يدوي",
    manualKeyPlaceholder: "ألصق مفتاح API هنا...", aiAnalysis: "تحليل الذكاء الاصطناعي", preparing: "في انتظار التحضير",
    systemLogsReady: "في انتظار سجلات النظام...", verifyingError: "خطأ في التحقق!", literal: "حرفي", creative: "إبداعي",
    quotaError: "تجاوز الحصة: يرجى الانتظار 60 ثانية.",
    interfaceSettings: "إعدادات الواجهة", themeMode: "وضع المظهر", appLanguage: "لغة التطبيق",
    copyright: "2024 AI Literary EPUB Translator. جميع الحقوق محفوظة.", learnMore: "معلومات",
    aiOptimized: "محسن بالذكاء الاصطناعي",
    legalWarningTitle: "إخلاء المسؤولية القانونية وشروط الاستخدام",
    legalWarningText: "هذا البرنامج أداة تجريبية. باستخدامه، فإنك توافق على:",
    legalPoints: ["الملكية: المستخدم مسؤول عن حقوق النشر.", "الاستخدام الشخصي: للهواية والتعليم فقط.", "المسؤولية: المطورون غير مسؤولين عن الأضرار.", "الإلزام: الاستخدام يعني الموافقة الكاملة."]
  },
  pt: {
    historyTitle: "HISTÓRICO DE TRADUÇÃO", clearHistory: "Limpar Tudo", noHistory: "Sem registros",
    modelLabel: "SELEÇÃO DE MODELO", uploadLabel: "CARREGAR EPUB", uploadPlaceholder: "Arraste ou selecione o arquivo",
    sourceLang: "IDIOMA ORIGEM", targetLang: "IDIOMA DESTINO", creativity: "CRIATIVIDADE", htmlTags: "TAGS HTML",
    systemMonitor: "Monitor do Sistema", startBtn: "Iniciar Tradução", resumeBtn: "Retomar", stopBtn: "Parar", downloadBtn: "BAIXAR EPUB",
    tokens: "TOKENS", speed: "VELOCIDADE", eta: "RESTANTE", processing: "Processando", idle: "Pronto",
    title: "Tradutor Literário de EPUB", description: "Motor de Tradução Literária Profissional", settingsTitle: "AJUSTES & CONFIGURAÇÃO",
    restoreSettings: "Restaurar", selectLang: "SELECIONAR IDIOMA", error: "ERRO", apiStatus: "STATUS DA API",
    freeMode: "MODO GRATUITO", paidMode: "MODO PRO", connectAiStudio: "CONECTAR AI STUDIO", billingInfo: "Chave paga necessária para modelos PRO.",
    lockedModel: "Conexão Necessária", checkKey: "Verificando...", verifyBtn: "ATIVAR", manualKeyLabel: "CHAVE MANUAL",
    manualKeyPlaceholder: "Cole sua chave API aqui...", aiAnalysis: "ANÁLISE IA", preparing: "AGUARDANDO",
    systemLogsReady: "Aguardando logs...", verifyingError: "Erro de verificação!", literal: "Fiel", creative: "Criativo",
    quotaError: "COTA EXCEDIDA: Aguarde 60 segundos.",
    interfaceSettings: "AJUSTES DE INTERFACE", themeMode: "MODO DE TEMA", appLanguage: "IDIOMA DO APP",
    copyright: "2024 AI Literary EPUB Translator. Todos os direitos reservados.", learnMore: "INFO",
    aiOptimized: "IA OTIMIZADA",
    legalWarningTitle: "AVISO LEGAL E TERMOS DE USO",
    legalWarningText: "Este software é uma utilidade experimental. Ao usá-lo, você concorda que:",
    legalPoints: ["PI: O usuário é responsável pelos direitos autorais.", "Uso Pessoal: Apenas hobby ou educação.", "Responsabilidade: Desenvolvedores não respondem por danos.", "Vínculo: O uso constitui consentimento total."]
  },
  nl: {
    historyTitle: "VERTALING GESCHIEDENIS", clearHistory: "Alles Wissen", noHistory: "Geen records",
    modelLabel: "MODEL SELECTIE", uploadLabel: "EPUB UPLOADEN", uploadPlaceholder: "Sleep of selecteer bestand",
    sourceLang: "BRONTAAL", targetLang: "DOELTAAL", creativity: "CREATIVITEIT", htmlTags: "HTML TAGS",
    systemMonitor: "Systeemmonitor", startBtn: "Start Vertaling", resumeBtn: "Hervatten", stopBtn: "Stop", downloadBtn: "EPUB DOWNLOADEN",
    tokens: "TOKENS", speed: "SNELHEID", eta: "RESTEREND", processing: "Verwerken", idle: "Gereed",
    title: "Literaire EPUB Vertaler", description: "Professionele Literaire Vertaalmachine", settingsTitle: "INSTELLINGEN & CONFIGURATIE",
    restoreSettings: "Herstellen", selectLang: "SELECTEER TAAL", error: "FOUT", apiStatus: "API STATUS",
    freeMode: "GRATIS MODUS", paidMode: "PRO MODUS", connectAiStudio: "VERBIND AI STUDIO", billingInfo: "Betaalde sleutel vereist voor PRO modellen.",
    lockedModel: "Verbinding Vereist", checkKey: "Verifiëren...", verifyBtn: "ACTIVEREN", manualKeyLabel: "HANDMATIGE SLEUTEL",
    manualKeyPlaceholder: "Plak hier je API-sleutel...", aiAnalysis: "AI ANALYSE", preparing: "VOORBEREIDEN",
    systemLogsReady: "Wachten op systeemlogs...", verifyingError: "Verificatiefout!", literal: "Letterlijk", creative: "Creatief",
    quotaError: "QUOTA OVERSCHREDEN: Wacht 60 seconden.",
    interfaceSettings: "INTERFACE INSTELLINGEN", themeMode: "THEMA MODUS", appLanguage: "APP TAAL",
    copyright: "2024 AI Literary EPUB Translator. Alle rechten voorbehouden.", learnMore: "INFO",
    aiOptimized: "AI GEOPTIMALISEERD",
    legalWarningTitle: "JURIDISCHE DISCLAIMER & GEBRUIKSVOORWAARDEN",
    legalWarningText: "Deze software is experimenteel. Door gebruik stemt u in met:",
    legalPoints: ["IE: Gebruiker is verantwoordelijk voor auteursrecht.", "Persoonlijk gebruik: Alleen hobby of educatie.", "Aansprakelijkheid: Ontwikkelaars niet aansprakelijk voor schade.", "Binding: Gebruik vormt volledige instemming."]
  },
  pl: {
    historyTitle: "HISTORIA TŁUMACZEŃ", clearHistory: "Wyczyść wszystko", noHistory: "Brak wpisów",
    modelLabel: "WYBÓR MODELU", uploadLabel: "PRZEŚLIJ EPUB", uploadPlaceholder: "Przeciągnij lub wybierz plik",
    sourceLang: "JĘZYK ŹRÓDŁOWY", targetLang: "JĘZYK DOCELOWY", creativity: "KREATYWNOŚĆ", htmlTags: "TAGI HTML",
    systemMonitor: "Monitor systemu", startBtn: "Rozpocznij tłumaczenie", resumeBtn: "Wznów", stopBtn: "Zatrzymaj", downloadBtn: "POBIERZ EPUB",
    tokens: "TOKENY", speed: "PRĘDKOŚĆ", eta: "POZOSTAŁO", processing: "Przetwarzanie", idle: "Gotowe",
    title: "Literacki Tłumacz EPUB", description: "Profesjonalny Silnik Tłumaczeń Literackich", settingsTitle: "USTAWIENIA I KONFIGURACJA",
    restoreSettings: "Przywróć", selectLang: "WYBIERZ JĘZYK", error: "BŁĄD", apiStatus: "STATUS API",
    freeMode: "TRYB BEZPŁATNY", paidMode: "TRYB PRO", connectAiStudio: "POŁĄCZ Z AI STUDIO", billingInfo: "Płatny klucz wymagany dla modeli PRO.",
    lockedModel: "Wymagane połączenie", checkKey: "Weryfikacja...", verifyBtn: "AKTYWUJ", manualKeyLabel: "KLUCZ RĘCZNY",
    manualKeyPlaceholder: "Wklej tutaj klucz API...", aiAnalysis: "ANALIZA AI", preparing: "PRZYGOTOWANIE",
    systemLogsReady: "Oczekiwanie na logi...", verifyingError: "Błąd weryfikacji!", literal: "Dosłowne", creative: "Kreatywne",
    quotaError: "LIMIT PRZEKROCZONY: Odczekaj 60 sekund.",
    interfaceSettings: "USTAWIENIA INTERFEJSU", themeMode: "TRYB MOTYWU", appLanguage: "JĘZYK APLIKACJI",
    copyright: "2024 AI Literary EPUB Translator. Wszelkie prawa zastrzeżone.", learnMore: "INFO",
    aiOptimized: "ZOPTYMALIZOWANE PRZEZ AI",
    legalWarningTitle: "ZASTRZEŻENIA PRAWNE I WARUNKI UŻYTKOWANIA",
    legalWarningText: "To oprogramowanie jest eksperymentalne. Korzystając z niego, zgadzasz się na:",
    legalPoints: ["IP: Użytkownik odpowiada za prawa autorskie.", "Użytek osobisty: Tylko hobby lub nauka.", "Odpowiedzialność: Deweloperzy nie odpowiadają za szkody.", "Wiążące: Użycie oznacza pełną zgodę."]
  },
  hi: {
    historyTitle: "अनुवाद इतिहास", clearHistory: "सभी साफ़ करें", noHistory: "कोई रिकॉर्ड नहीं",
    modelLabel: "मॉडल चयन", uploadLabel: "EPUB अपलोड करें", uploadPlaceholder: "फ़ाइल खींचें या चुनें",
    sourceLang: "स्रोत भाषा", targetLang: "लक्ष्य भाषा", creativity: "रचनात्मकता", htmlTags: "HTML टैग",
    systemMonitor: "सिस्टम मॉनिटर", startBtn: "अनुवाद शुरू करें", resumeBtn: "फिर से शुरू करें", stopBtn: "रोकें", downloadBtn: "EPUB डाउनलोड करें",
    tokens: "टोकन", speed: "गति", eta: "शेष समय", processing: "प्रसंस्करण", idle: "तैयार",
    title: "साहित्यिक EPUB अनुवादक", description: "पेशेवर साहित्यिक अनुवाद इंजन", settingsTitle: "सेटिंग्स और कॉन्फ़िगरेशन",
    restoreSettings: "पुनर्स्थापित करें", selectLang: "भाषा चुनें", error: "त्रुटि", apiStatus: "API स्थिति",
    freeMode: "मुफ़्त मोड", paidMode: "प्रो मोड", connectAiStudio: "AI STUDIO कनेक्ट करें", billingInfo: "प्रो मॉडल के लिए भुगतान कुंजी आवश्यक है।",
    lockedModel: "कनेक्शन आवश्यक", checkKey: "सत्यापित किया जा रहा है...", verifyBtn: "सक्रिय करें", manualKeyLabel: "मैनुअल कुंजी",
    manualKeyPlaceholder: "अपनी API कुंजी यहाँ पेस्ट करें...", aiAnalysis: "AI विश्लेषण", preparing: "तैयारी की प्रतीक्षा",
    systemLogsReady: "सिस्टम लॉग की प्रतीक्षा है...", verifyingError: "सत्यापन त्रुटि!", literal: "शाब्दिक", creative: "रचनात्मक",
    quotaError: "कोटा समाप्त: कृपया 60 सेकंड प्रतीक्षा करें।",
    interfaceSettings: "इंटरफ़ेस सेटिंग्स", themeMode: "थीम मोड", appLanguage: "ऐप भाषा",
    copyright: "2024 AI Literary EPUB Translator. सर्वाधिकार सुरक्षित।", learnMore: "जानकारी",
    aiOptimized: "AI अनुकूलित",
    legalWarningTitle: "कानूनी अस्वीकरण और उपयोग की शर्तें",
    legalWarningText: "यह सॉफ्टवेयर एक प्रयोगात्मक उपयोगिता है। इसके उपयोग से, आप सहमत हैं:",
    legalPoints: ["बौद्धिक संपदा: कॉपीराइट अनुपालन के लिए उपयोगकर्ता जिम्मेदार है।", "व्यक्तिगत उपयोग: केवल शौक या शिक्षा के लिए।", "दायित्व: डेवलपर्स नुकसान के लिए जिम्मेदार नहीं हैं।", "बाध्यकारी: उपयोग का अर्थ पूर्ण सहमति है।"]
  },
  vi: {
    historyTitle: "LỊCH SỬ DỊCH", clearHistory: "Xóa tất cả", noHistory: "Không có bản ghi",
    modelLabel: "CHỌN MÔ HÌNH", uploadLabel: "TẢI EPUB LÊN", uploadPlaceholder: "Kéo hoặc chọn tệp",
    sourceLang: "NGÔN NGỮ NGUỒN", targetLang: "NGÔN NGỮ ĐÍCH", creativity: "SÁNG TẠO", htmlTags: "THẺ HTML",
    systemMonitor: "Giám sát hệ thống", startBtn: "Bắt đầu dịch", resumeBtn: "Tiếp tục", stopBtn: "Dừng", downloadBtn: "TẢI EPUB VỀ",
    tokens: "TOKEN", speed: "TỐC ĐỘ", eta: "CÒN LẠI", processing: "Đang xử lý", idle: "Sẵn sàng",
    title: "Trình dịch EPUB văn học", description: "Động cơ dịch thuật văn học chuyên nghiệp", settingsTitle: "CÀI ĐẶT & CẤU HÌNH",
    restoreSettings: "Khôi phục", selectLang: "CHỌN NGÔN NGỮ", error: "LỖI", apiStatus: "TRẠNG THÁI API",
    freeMode: "CHẾ ĐỘ MIỄN PHÍ", paidMode: "CHẾ ĐỘ PRO", connectAiStudio: "KẾT NỐI AI STUDIO", billingInfo: "Cần khóa trả phí cho mô hình PRO.",
    lockedModel: "Yêu cầu kết nối", checkKey: "Đang xác minh...", verifyBtn: "KÍCH HOẠT", manualKeyLabel: "KHÓA THỦ CÔNG",
    manualKeyPlaceholder: "Dán khóa API của bạn vào đây...", aiAnalysis: "PHÂN TÍCH AI", preparing: "ĐANG CHUẨN BỊ",
    systemLogsReady: "Đang chờ nhật ký hệ thống...", verifyingError: "Lỗi xác minh!", literal: "Sát nghĩa", creative: "Sáng tạo",
    quotaError: "HẾT HẠN MỨC: Vui lòng chờ 60 giây.",
    interfaceSettings: "CÀI ĐẶT GIAO DIỆN", themeMode: "CHẾ ĐỘ CHỦ ĐỀ", appLanguage: "NGÔN NGỮ ỨNG DỤNG",
    copyright: "2024 AI Literary EPUB Translator. Bảo lưu mọi quyền.", learnMore: "THÔNG TIN",
    aiOptimized: "ĐÃ TỐI ƯU AI",
    legalWarningTitle: "TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM PHÁP LÝ",
    legalWarningText: "Phần mềm này là một tiện ích thử nghiệm. Bằng cách sử dụng, bạn đồng ý:",
    legalPoints: ["SHTT: Người dùng chịu trách nhiệm về bản quyền.", "Sử dụng cá nhân: Chỉ cho sở thích hoặc giáo dục.", "Trách nhiệm: Nhà phát triển không chịu trách nhiệm về thiệt hại.", "Ràng buộc: Việc sử dụng cấu thành sự đồng ý hoàn toàn."]
  }
};

// Fill missing languages with English as fallback
LANGUAGES_DATA.forEach(lang => {
  if (!STRINGS_REGISTRY[lang.code]) {
    STRINGS_REGISTRY[lang.code] = { ...STRINGS_REGISTRY['en'] };
  }
});

const STORAGE_KEY_HISTORY = 'lit-trans-history';
const STORAGE_KEY_RESUME = 'lit-trans-resume-v2';

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return '--';
  if (seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

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
  const [isCreativityOptimized, setIsCreativityOptimized] = useState(false);
  
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
    setIsCreativityOptimized(false);
    abortControllerRef.current = new AbortController();
    try {
      const { epubBlob } = await processEpub(
        file, 
        { ...settings, uiLang }, 
        (p) => {
          setProgress(prev => {
            if (p.strategy && !prev.strategy) {
               const recommendedTemp = p.strategy.detected_creativity_level;
               setSettings(s => ({ ...s, temperature: recommendedTemp }));
               setIsCreativityOptimized(true);
            }
            return { ...p, logs: p.logs.length > 0 ? p.logs : prev.logs };
          });
          if (p.lastZipPathIndex !== undefined && p.lastNodeIndex !== undefined && p.translatedNodes) {
             const res: ResumeInfo = { filename: file.name, zipPathIndex: p.lastZipPathIndex, nodeIndex: p.lastNodeIndex, translatedNodes: p.translatedNodes, settings: settings };
             localStorage.setItem(STORAGE_KEY_RESUME, JSON.stringify(res));
          }
        }, 
        abortControllerRef.current.signal,
        isResuming ? resumeData || undefined : undefined
      );
      setDownloadUrl(URL.createObjectURL(epubBlob));
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={12}/> {t.interfaceSettings}</label>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-5">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase">{t.themeMode}</span>
                   <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-indigo-600 transition-all hover:scale-105 active:scale-95">
                     {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                     <span className="text-[10px] font-black uppercase">{isDarkMode ? 'LIGHT' : 'DARK'}</span>
                   </button>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase">{t.appLanguage}</span>
                   <button onClick={() => setIsLangModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-sm transition-all hover:bg-indigo-700 active:scale-95">
                     <Globe size={14} />
                     <span className="text-[10px] font-black uppercase">{uiLang.toUpperCase()}</span>
                   </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={12}/> {t.apiStatus}</label>
              <div className={`p-5 rounded-[2rem] border-2 transition-all duration-500 shadow-lg ${hasPaidKey ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500/50' : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/50'}`}>
                <div className="flex items-center justify-between mb-5">
                   <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${hasPaidKey ? 'bg-green-500 animate-pulse shadow-green-500/50' : 'bg-amber-500 shadow-amber-500/50'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${hasPaidKey ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-300'}`}>{hasPaidKey ? t.paidMode : t.freeMode}</span>
                   </div>
                   <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    {hasPaidKey ? <Unlock size={14} className="text-indigo-500" /> : <Lock size={14} className="text-slate-400 dark:text-slate-500" />}
                   </div>
                </div>
                <button onClick={handleConnectAiStudio} className="w-full flex items-center justify-center gap-2.5 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[11px] uppercase transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 mb-6 group">
                  <Zap size={14} className="group-hover:animate-pulse" fill="currentColor"/> {t.connectAiStudio}
                </button>
                <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ml-1">{t.manualKeyLabel}</label>
                  <div className="relative group">
                      <input type={showKey ? "text" : "password"} value={manualKey} onChange={(e) => setManualKey(e.target.value)} placeholder={t.manualKeyPlaceholder} className="w-full bg-slate-50 dark:bg-slate-900/80 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-4 pr-12 text-[12px] font-mono outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner text-slate-700 dark:text-slate-200" />
                      <button onClick={() => setShowKey(!showKey)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors p-1.5">{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                  <button onClick={() => verifyApiKey()} disabled={isVerifying || !manualKey} className="w-full py-4 bg-slate-900 dark:bg-indigo-600/90 hover:bg-black dark:hover:bg-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-40 transition-all shadow-lg">
                    {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {isVerifying ? t.checkKey : t.verifyBtn}
                  </button>
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
                  <button key={m.id} disabled={m.locked} onClick={() => setSettings({...settings, modelId: m.id})} className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${settings.modelId === m.id ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                    {m.locked && <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/70 flex items-center justify-center backdrop-blur-[1px]"><Lock size={12} className="text-slate-400 dark:text-slate-500" /></div>}
                    <div className="flex justify-between items-center"><span className={`text-[10px] font-black ${settings.modelId === m.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>{m.name}</span>{settings.modelId === m.id && <Check size={12} className="text-indigo-500" />}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Navigation */}
      <nav className="h-16 md:h-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center px-4 md:px-6">
        <div className="flex-1 flex justify-start items-center">
          <button onClick={() => setIsLeftDrawerOpen(true)} className="p-2 md:p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:rounded-2xl transition-all text-slate-500 active:scale-90 shrink-0"><History size={20} className="md:w-6 md:h-6" /></button>
        </div>
        <div className="flex flex-col items-center flex-shrink min-w-0 px-2 group overflow-hidden">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
            <span className="text-2xl md:text-4xl group-hover:scale-110 transition-transform shrink-0">📖</span>
            <div className="flex flex-col items-center min-w-0">
              <h1 className="font-black tracking-tight text-sm md:text-xl uppercase bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 truncate w-full text-center leading-tight">{t.title}</h1>
              <p className="hidden lg:block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.description}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-end items-center">
          <button onClick={() => setIsRightDrawerOpen(true)} className="p-2 md:p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg md:rounded-2xl text-indigo-600 hover:bg-indigo-100 active:scale-90 transition-all shrink-0"><Settings size={20} className="md:w-6 md:h-6" /></button>
        </div>
      </nav>

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
                  <div className="flex items-center gap-1.5 md:gap-2"><Clock size={12} className="text-amber-500 md:w-3.5 md:h-3.5" /><span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase">{t.eta}:</span><span className="text-[10px] md:text-xs font-black italic whitespace-nowrap">{isProcessing ? formatDuration(progress.etaSeconds) : '--'}</span></div>
              </div>
          </div>
      </div>

      <main className="flex-1 pt-32 md:pt-36 flex flex-col items-center">
        <div className="w-full max-w-5xl px-6 py-6 md:py-12 space-y-8 md:space-y-12 flex flex-col items-center">
            <section className="w-full bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 p-6 md:p-12 space-y-8 md:space-y-10 shadow-xl">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] pl-2">{t.uploadLabel}</label>
                  <div className="relative group cursor-pointer">
                    <input type="file" accept=".epub" onChange={(e) => { const f = e.target.files?.[0]; if(f) { setFile(f); setDownloadUrl(null); setIsCreativityOptimized(false); } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className={`py-12 md:py-16 border-3 border-dashed rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all duration-500 shadow-inner ${file ? 'bg-indigo-50/20 dark:bg-indigo-500/10 border-indigo-500 scale-[1.01]' : 'bg-slate-50/50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                      <Upload size={32} className={`transition-colors duration-300 ${file ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-500'}`} />
                      <span className={`text-sm md:text-base font-black px-6 text-center leading-tight transition-colors duration-300 ${file ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'}`}>
                        {file ? file.name : t.uploadPlaceholder}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.sourceLang}</label><select value={settings.sourceLanguage} onChange={(e) => setSettings({...settings, sourceLanguage: e.target.value})} className="w-full p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-black text-sm outline-none focus:border-indigo-500 transition-all appearance-none shadow-sm">{Object.values(LANG_CODE_TO_LABEL).map(l => <option key={l} value={l}>{l}</option>)}<option value="Automatic">Automatic</option></select></div>
                  <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{t.targetLang}</label><select value={settings.targetLanguage} onChange={(e) => setSettings({...settings, targetLanguage: e.target.value})} className="w-full p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 font-black text-sm outline-none focus:border-indigo-500 transition-all appearance-none shadow-sm">{Object.values(LANG_CODE_TO_LABEL).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                </div>

                <div className="flex flex-col items-center gap-6">
                  {!isProcessing && !downloadUrl && (
                    <div className="w-full flex flex-col gap-4">
                        <button onClick={() => startTranslation(false)} disabled={!file} className="w-full py-5 md:py-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl md:rounded-[2rem] font-black text-lg md:text-xl shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"><Play className="inline mr-3" size={24} fill="currentColor"/> {t.startBtn}</button>
                        {resumeData && resumeData.filename === file?.name && (<button onClick={() => startTranslation(true)} className="w-full py-4 md:py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl md:rounded-[1.5rem] font-black text-xs md:text-sm shadow-xl transition-all flex items-center justify-center gap-3"><StepForward size={18}/> {t.resumeBtn}</button>)}
                    </div>
                  )}
                  {isProcessing && (<div className="w-full space-y-6 md:space-y-8 py-4"><ProgressBar progress={progress.currentPercent} /><button onClick={() => abortControllerRef.current?.abort()} className="mx-auto block px-10 md:px-14 py-3 rounded-full border-2 border-red-500/20 text-red-500 font-black text-[10px] uppercase hover:bg-red-50 dark:hover:bg-red-950/20 transition-all tracking-widest">{t.stopBtn}</button></div>)}
                  {downloadUrl && (
                    <div className="w-full animate-fade-scale">
                      <a href={downloadUrl} download={`translated_${file?.name}`} className="flex items-center justify-center gap-4 p-5 md:p-7 bg-green-600 text-white rounded-[2rem] md:rounded-[2.5rem] font-black shadow-2xl hover:bg-green-700 transition-all text-lg md:text-xl"><Download size={24} /> {t.downloadBtn}</a>
                    </div>
                  )}
                </div>
            </section>

            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
              <section className="md:col-span-5 bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 md:p-10 space-y-6 shadow-sm relative overflow-hidden group">
                <div className="flex items-center gap-3 text-indigo-600"><Sparkles size={18}/><h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em]">{t.aiAnalysis}</h3></div>
                <div className="min-h-[120px] md:min-h-[160px] flex flex-col justify-center">
                    {progress.strategy ? (
                    <div className="space-y-4 md:space-y-5 animate-fade-scale">
                        <div className="px-4 md:px-5 py-2 md:py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl md:rounded-2xl inline-block border border-indigo-100 shadow-sm"><p className="text-[9px] md:text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{progress.strategy.genre_translated}</p></div>
                        <p className="text-xs md:text-sm italic text-slate-500 dark:text-slate-400 leading-relaxed text-justify serif">"{progress.strategy.strategy_translated}"</p>
                    </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 md:gap-5 opacity-20 py-8 md:py-10"><BrainCircuit size={40} className="animate-pulse" /><p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">{t.preparing}</p></div>
                    )}
                </div>
              </section>
              <section className="md:col-span-7 bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 md:p-10 flex flex-col h-[300px] md:h-[360px] shadow-sm">
                <div className="flex items-center gap-3 text-slate-400 mb-4 md:mb-6 border-b border-slate-50 dark:border-slate-800 pb-4 md:pb-5"><Activity size={18}/> <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em]">{t.systemMonitor}</h3></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] md:text-[11px]"><LogViewer logs={progress.logs} readyText={t.systemLogsReady} /></div>
              </section>
            </div>

            <section onClick={() => setIsLegalExpanded(!isLegalExpanded)} className={`w-full max-w-[680px] bg-white dark:bg-[#1a1405] rounded-[2.5rem] md:rounded-[3rem] border-2 transition-all duration-700 p-5 md:p-8 shadow-[0_10px_40px_-15px_rgba(245,158,11,0.15)] mb-12 relative overflow-hidden cursor-pointer group select-none hover:shadow-[0_15px_50px_-10px_rgba(245,158,11,0.2)] ${isLegalExpanded ? 'border-amber-400 ring-4 ring-amber-500/5' : 'border-slate-100 dark:border-amber-900/10'}`}>
                <div className="absolute top-0 right-0 p-6 text-amber-900/5 dark:text-amber-100/5 pointer-events-none group-hover:scale-110 transition-transform duration-1000"><Gavel size={140} /></div>
                <div className="flex flex-col relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center transition-all duration-500 rounded-2xl md:rounded-[1.4rem] shadow-lg ${isLegalExpanded ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'}`}><Shield size={24} /></div>
                          <h4 className="text-[13px] md:text-[15px] font-black uppercase tracking-[0.12em] text-slate-800 dark:text-amber-100 leading-tight">{t.legalWarningTitle}</h4>
                      </div>
                      <div className={`p-1.5 transition-all duration-500 ${isLegalExpanded ? 'text-amber-600 rotate-180' : 'text-slate-400 group-hover:text-amber-500'}`}><ChevronDown size={20} strokeWidth={3} /></div>
                    </div>
                    <div className="space-y-3">
                        <p className={`text-[11px] md:text-[12px] leading-relaxed font-bold italic transition-all duration-500 text-justify ${isLegalExpanded ? 'text-slate-900 dark:text-amber-50' : 'text-slate-500 dark:text-amber-100/50'}`}>{t.legalWarningText}</p>
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-all duration-700 overflow-hidden ${isLegalExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          {t.legalPoints.map((point: string, idx: number) => (<div key={idx} className="flex gap-3 p-3 bg-slate-50/50 dark:bg-amber-950/10 rounded-xl border border-amber-100/50 dark:border-amber-800/20 hover:border-amber-400 transition-all"><div className="text-amber-500 font-black text-xs pt-0.5">{idx + 1}.</div><p className="text-[10px] md:text-[11px] leading-snug font-medium text-slate-600 dark:text-amber-100/80 text-justify">{point}</p></div>))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
      </main>

      {isLangModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-[0_40px_120px_rgba(0,0,0,0.5)] animate-fade-scale flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">{t.selectLang}</h3>
                <button onClick={() => setIsLangModalOpen(false)} className="p-3 md:p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all hover:rotate-90 text-slate-400"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-5 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
              {LANGUAGES_DATA.map(l => (
                <button 
                  key={l.code} 
                  onClick={() => { setUiLang(l.code as UILanguage); setIsLangModalOpen(false); localStorage.setItem('lit-trans-ui-lang', l.code) }} 
                  className={`group relative p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${uiLang === l.code ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-xl shadow-indigo-500/10 scale-[1.02]' : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700 hover:scale-[1.01]'}`}
                >
                  <span className="text-3xl md:text-5xl transition-transform duration-500 group-hover:scale-110 select-none">{l.flag}</span>
                  <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest text-center transition-colors ${uiLang === l.code ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                    {l.label}
                  </span>
                  {uiLang === l.code && (
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 p-1 bg-indigo-500 rounded-full text-white shadow-lg">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-6 animate-shake">
          <div className="bg-red-600 text-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_rgba(220,38,38,0.4)] flex items-center gap-4 md:gap-5 border border-white/20"><div className="p-2 md:p-3 bg-white/20 rounded-xl md:rounded-2xl"><AlertCircle size={20} /></div><div className="flex-1"><h4 className="font-black text-[10px] md:text-xs uppercase tracking-widest">{error.title}</h4><p className="text-[10px] md:text-[11px] leading-snug opacity-95 mt-1">{error.message}</p></div><button onClick={() => setError(null)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg md:rounded-xl transition-colors"><X size={16} /></button></div>
        </div>
      )}
    </div>
  );
}
