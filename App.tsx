
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
const DEFAULT_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'];

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
  },
  zh: {
    historyTitle: "翻译历史", clearHistory: "全部清除", noHistory: "暂无记录",
    modelLabel: "模型选择", uploadLabel: "上传 EPUB", uploadPlaceholder: "拖拽或选择文件",
    sourceLang: "源语言", targetLang: "目标语言", creativity: "创造力", htmlTags: "HTML 标签",
    systemMonitor: "系统监控", startBtn: "开始翻译", resumeBtn: "继续翻译", stopBtn: "停止", downloadBtn: "下载 EPUB", pdfBtn: "下载 PDF",
    tokens: "代币", speed: "速度", eta: "剩余时间", processing: "处理中", idle: "空闲",
    title: "文学 EPUB 翻译官", description: "专业文学翻译引擎", settingsTitle: "设置与配置",
    restoreSettings: "恢复", selectLang: "选择语言", error: "错误", apiStatus: "API 状态",
    freeMode: "免费模式", paidMode: "专业模式", connectAiStudio: "连接 AI STUDIO", billingInfo: "高级模型需要付费密钥",
    lockedModel: "未解锁", checkKey: "正在验证...", verifyBtn: "验证并激活", manualKeyLabel: "手动密钥",
    manualKeyPlaceholder: "在此粘贴 API 密钥...", aiAnalysis: "AI 分析", preparing: "正在准备",
    systemLogsReady: "等待系统日志...", verifyingError: "密钥验证失败", literal: "直译", creative: "意译",
    quotaError: "配额超限：请等待约 60 秒。翻译已暂停，您可以稍后继续。"
  },
  fr: {
    historyTitle: "HISTORIQUE", clearHistory: "Tout effacer", noHistory: "Aucun historique",
    modelLabel: "MODÈLE", uploadLabel: "CHARGER EPUB", uploadPlaceholder: "Glisser ou choisir un fichier",
    sourceLang: "LANGUE SOURCE", targetLang: "LANGUE CIBLE", creativity: "CRÉATIVITÉ", htmlTags: "TAGS HTML",
    systemMonitor: "Moniteur Système", startBtn: "Traduire", resumeBtn: "Reprendre la traduction", stopBtn: "Arrêter", downloadBtn: "TÉLÉCHARGER", pdfBtn: "PDF",
    tokens: "TOKENS", speed: "VITESSE", eta: "RESTANT", processing: "Traitement", idle: "Prêt",
    title: "Traducteur EPUB Littéraire", description: "Moteur de Traduction Littéraire", settingsTitle: "CONFIGURATION",
    restoreSettings: "Restaurer", selectLang: "CHOISIR LANGUE", error: "ERREUR", apiStatus: "STATUT API",
    freeMode: "MODE GRATUIT", paidMode: "MODE PRO", connectAiStudio: "LIER AI STUDIO", billingInfo: "Clé payante requise.",
    lockedModel: "Verrouillé", checkKey: "Vérification...", verifyBtn: "ACTIVER", manualKeyLabel: "CLÉ MANUELLE",
    manualKeyPlaceholder: "Collez votre clé ici...", aiAnalysis: "ANALYSE AI", preparing: "PRÉPARATION",
    systemLogsReady: "En attente de logs...", verifyingError: "Clé invalide!", literal: "Fidèle", creative: "Créatif",
    quotaError: "QUOTA ÉPUISÉ : Veuillez patienter environ 60 secondes. Traduction en pause."
  },
  de: {
    historyTitle: "VERLAUF", clearHistory: "Alle löschen", noHistory: "Kein Verlauf",
    modelLabel: "MODELLWAHL", uploadLabel: "EPUB HOCHLADEN", uploadPlaceholder: "Datei wählen",
    sourceLang: "QUELLSPRACHE", targetLang: "ZIELSPRACHE", creativity: "KREATIVITÄT", htmlTags: "HTML TAGS",
    systemMonitor: "System-Monitor", startBtn: "Starten", resumeBtn: "Fortsetzen", stopBtn: "Stopp", downloadBtn: "DOWNLOAD", pdfBtn: "PDF",
    tokens: "TOKENS", speed: "TEMPO", eta: "RESTZEIT", processing: "Läuft", idle: "Bereit",
    title: "Literarischer EPUB-Übersetzer", description: "Professionelle Literatur-Engine", settingsTitle: "EINSTELLUNGEN",
    restoreSettings: "Wiederherstellen", selectLang: "SPRACHE WÄHLEN", error: "FEHLER", apiStatus: "API STATUS",
    freeMode: "GRATIS MODUS", paidMode: "PRO MODUS", connectAiStudio: "AI STUDIO VERBINDEN", billingInfo: "Bezahl-Key erforderlich.",
    lockedModel: "Gesperrt", checkKey: "Prüfe...", verifyBtn: "AKTIVIEREN", manualKeyLabel: "MANUELLER KEY",
    manualKeyPlaceholder: "API-Key einfügen...", aiAnalysis: "KI ANALYSE", preparing: "BEREITE VOR",
    systemLogsReady: "Warte auf Logs...", verifyingError: "Key Fehler!", literal: "Wörtlich", creative: "Kreativ",
    quotaError: "QUOTA ÜBERSCHRITTEN: Bitte ca. 60 Sek. warten. Übersetzung pausiert."
  },
  es: {
    historyTitle: "HISTORIAL", clearHistory: "Borrar todo", noHistory: "Sin historial",
    modelLabel: "MODELO", uploadLabel: "SUBIR EPUB", uploadPlaceholder: "Subir archivo",
    sourceLang: "ORIGEN", targetLang: "DESTINO", creativity: "CREATIVIDAD", htmlTags: "ETIQUETAS HTML",
    systemMonitor: "Monitor", startBtn: "Iniciar", resumeBtn: "Reanudar", stopBtn: "Parar", downloadBtn: "DESCARGAR", pdfBtn: "PDF",
    tokens: "TOKENS", speed: "VELOCIDAD", eta: "FALTA", processing: "Procesando", idle: "Listo",
    title: "Traductor de EPUB Literario", description: "Motor Literario Profesional", settingsTitle: "AJUSTES",
    restoreSettings: "Restaurar", selectLang: "ELEGIR IDIOMA", error: "ERROR", apiStatus: "ESTADO API",
    freeMode: "MODO GRATIS", paidMode: "MODO PRO", connectAiStudio: "CONECTAR AI STUDIO", billingInfo: "Requiere llave de pago.",
    lockedModel: "Bloqueado", checkKey: "Verificando...", verifyBtn: "ACTIVAR", manualKeyLabel: "LLAVE MANUAL",
    manualKeyPlaceholder: "Pegue su API Key...", aiAnalysis: "ANÁLISIS AI", preparing: "PREPARANDO",
    systemLogsReady: "Esperando registros...", verifyingError: "Llave inválida!", literal: "Literal", creative: "Creativo",
    quotaError: "CUOTA EXCEDIDA: Espere unos 60 segundos. Traducción pausada."
  },
  ru: {
    historyTitle: "ИСТОРИЯ", clearHistory: "Очистить все", noHistory: "Нет истории",
    modelLabel: "ВЫБОР МОДЕЛИ", uploadLabel: "ЗАГРУЗИТЬ EPUB", uploadPlaceholder: "Выберите файл",
    sourceLang: "ИСТОЧНИК", targetLang: "ЦЕЛЬ", creativity: "КРЕАТИВНОСТЬ", htmlTags: "HTML ТЕГИ",
    systemMonitor: "Монитор системы", startBtn: "Начать перевод", resumeBtn: "Продолжить", stopBtn: "Стоп", downloadBtn: "СКАЧАТЬ", pdfBtn: "PDF",
    tokens: "ТОКЕНЫ", speed: "СКОРОСТЬ", eta: "ОСТАЛОСЬ", processing: "В процессе", idle: "Готов",
    title: "Литературный EPUB Переводчик", description: "Профессиональный движок", settingsTitle: "НАСТРОЙКИ",
    restoreSettings: "Восстановить", selectLang: "ВЫБОР ЯЗЫКА", error: "ОШИБКА", apiStatus: "СТАТУС API",
    freeMode: "БЕСПЛАТНО", paidMode: "PRO МОД", connectAiStudio: "AI STUDIO", billingInfo: "Нужен платный ключ.",
    lockedModel: "Заблокировано", checkKey: "Проверка...", verifyBtn: "АКТИВИРОВАТЬ", manualKeyLabel: "КЛЮЧ ВРУЧНУЮ",
    manualKeyPlaceholder: "Вставьте API ключ...", aiAnalysis: "AI АНАЛИЗ", preparing: "ПОДГОТОВКА",
    systemLogsReady: "Ожидание логов...", verifyingError: "Ошибка ключа!", literal: "Буквально", creative: "Творчески",
    quotaError: "КВОТА ИСЧЕРПАНА: Подождите около 60 секунд. Перевод приостановлен."
  },
  it: {
    historyTitle: "CRONOLOGIA", clearHistory: "Cancella tutto", noHistory: "Nessuna cronologia",
    modelLabel: "MODELLO", uploadLabel: "CARICA EPUB", uploadPlaceholder: "Trascina o scegli file",
    sourceLang: "LINGUA ORIGINE", targetLang: "LINGUA DESTINAZIONE", creativity: "CREATIVITÀ", htmlTags: "TAG HTML",
    systemMonitor: "Monitor di Sistema", startBtn: "Avvia Traduzione", resumeBtn: "Riprendi", stopBtn: "Ferma", downloadBtn: "SCARICA EPUB", pdfBtn: "PDF",
    tokens: "TOKEN", speed: "VELOCITÀ", eta: "RIMANENTE", processing: "In corso", idle: "Pronto",
    title: "Traduttore EPUB Letterario", description: "Motore di Traduzione Professionale", settingsTitle: "IMPOSTAZIONI",
    restoreSettings: "Ripristina", selectLang: "SCEGLI LINGUA", error: "ERRORE", apiStatus: "STATO API",
    freeMode: "MODALITÀ GRATUITA", paidMode: "MODALITÀ PRO", connectAiStudio: "CONNETTI AI STUDIO", billingInfo: "Chiave a pagamento richiesta.",
    lockedModel: "Bloccato", checkKey: "Verifica...", verifyBtn: "ATTIVA", manualKeyLabel: "CHIAVE MANUALE",
    manualKeyPlaceholder: "Incolla qui la tua API key...", aiAnalysis: "ANALISI AI", preparing: "PREPARAZIONE",
    systemLogsReady: "In attesa di log...", verifyingError: "Errore chiave!", literal: "Letterale", creative: "Creativa",
    quotaError: "QUOTA SUPERATA: Attendi circa 60 secondi. Traduzione in pausa."
  },
  ja: {
    historyTitle: "翻訳履歴", clearHistory: "すべて消去", noHistory: "履歴なし",
    modelLabel: "モデル選択", uploadLabel: "EPUBをアップロード", uploadPlaceholder: "ファイルをドラッグまたは選択",
    sourceLang: "元の言語", targetLang: "翻訳先の言語", creativity: "創造性", htmlTags: "HTMLタグ",
    systemMonitor: "システムモニター", startBtn: "翻訳を開始", resumeBtn: "再開する", stopBtn: "停止", downloadBtn: "EPUBをダウンロード", pdfBtn: "PDF",
    tokens: "トークン", speed: "速度", eta: "残り時間", processing: "処理中", idle: "待機中",
    title: "文学 EPUB 翻訳", description: "プロフェッショナル文学翻訳エンジン", settingsTitle: "設定と構成",
    restoreSettings: "復元", selectLang: "言語を選択", error: "エラー", apiStatus: "APIステータス",
    freeMode: "無料モード", paidMode: "プロモード", connectAiStudio: "AI STUDIOに接続", billingInfo: "有料キーが必要です。",
    lockedModel: "ロック中", checkKey: "確認中...", verifyBtn: "有効化", manualKeyLabel: "手動キー",
    manualKeyPlaceholder: "ここにAPIキーを貼り付けてください...", aiAnalysis: "AI分析", preparing: "準備中",
    systemLogsReady: "ログを待機中...", verifyingError: "キーエラー！", literal: "直訳", creative: "意訳",
    quotaError: "クォータ制限超過: 約60秒待機してください。翻訳を一時停止しました。"
  },
  ko: {
    historyTitle: "번역 기록", clearHistory: "모두 지우기", noHistory: "기록 없음",
    modelLabel: "모델 선택", uploadLabel: "EPUB 업로드", uploadPlaceholder: "파일 드래그 또는 선택",
    sourceLang: "원본 언어", targetLang: "대상 언어", creativity: "창의성", htmlTags: "HTML 태그",
    systemMonitor: "시스템 모니터", startBtn: "번역 시작", resumeBtn: "이어서 번역", stopBtn: "중지", downloadBtn: "EPUB 다운로드", pdfBtn: "PDF",
    tokens: "토큰", speed: "속도", eta: "남은 시간", processing: "처리 중", idle: "준비됨",
    title: "문학 EPUB 번역기", description: "전문 문학 번역 엔진", settingsTitle: "설정 및 구성",
    restoreSettings: "복원", selectLang: "언어 선택", error: "오류", apiStatus: "API 상태",
    freeMode: "무료 모드", paidMode: "프로 모드", connectAiStudio: "AI STUDIO 연결", billingInfo: "유료 키가 필요합니다.",
    lockedModel: "잠김", checkKey: "확인 중...", verifyBtn: "활성화", manualKeyLabel: "수동 키",
    manualKeyPlaceholder: "여기에 API 키를 붙여넣으세요...", aiAnalysis: "AI 분석", preparing: "준비 중",
    systemLogsReady: "로그 대기 중...", verifyingError: "키 오류!", literal: "직역", creative: "의역",
    quotaError: "할당량 초과: 약 60초 동안 기다려 주세요. 번역이 중지되었습니다."
  },
  ar: {
    historyTitle: "سجل الترجمة", clearHistory: "مسح الكل", noHistory: "لا يوجد سجل",
    modelLabel: "اختيار النموذج", uploadLabel: "تحميل EPUB", uploadPlaceholder: "اسحب أو اختر ملفاً",
    sourceLang: "اللغة المصدر", targetLang: "اللغة الهدف", creativity: "الإبداع", htmlTags: "علامات HTML",
    systemMonitor: "مراقب النظام", startBtn: "بدء الترجمة", resumeBtn: "استئناف", stopBtn: "إيقاف", downloadBtn: "تحميل EPUB", pdfBtn: "PDF",
    tokens: "التوكينز", speed: "السرعة", eta: "المتبقي", processing: "جاري المعالجة", idle: "جاهز",
    title: "مترجم EPUB الأدبي", description: "محرك ترجمة أدبية احترافية", settingsTitle: "الإعدادات",
    restoreSettings: "استعادة", selectLang: "اختر اللغة", error: "خطأ", apiStatus: "حالة API",
    freeMode: "الوضع المجاني", paidMode: "الوضع المدفوع", connectAiStudio: "اتصال AI STUDIO", billingInfo: "مفتاح مدفوع مطلوب.",
    lockedModel: "مغلق", checkKey: "جاري التحقق...", verifyBtn: "تفعيل", manualKeyLabel: "مفتاح يدوي",
    manualKeyPlaceholder: "ألصق مفتاح API هنا...", aiAnalysis: "تحليل AI", preparing: "جاري التحضير",
    systemLogsReady: "بانتظار السجلات...", verifyingError: "خطأ في المفتاح!", literal: "حرفي", creative: "إبداعي",
    quotaError: "تم تجاوز الحصة: يرجى الانتظار حوالي 60 ثانية. تم إيقاف الترجمة مؤقتاً."
  },
  pt: {
    historyTitle: "HISTÓRICO", clearHistory: "Limpar tudo", noHistory: "Sem histórico",
    modelLabel: "MODELO", uploadLabel: "CARREGAR EPUB", uploadPlaceholder: "Arraste ou escolha o arquivo",
    sourceLang: "IDIOMA ORIGEM", targetLang: "IDIOMA DESTINO", creativity: "CRIATIVIDADE", htmlTags: "TAGS HTML",
    systemMonitor: "Monitor de Sistema", startBtn: "Iniciar Tradução", resumeBtn: "Retomar", stopBtn: "Parar", downloadBtn: "BAIXAR EPUB", pdfBtn: "PDF",
    tokens: "TOKENS", speed: "VELOCIDADE", eta: "RESTANTE", processing: "Processando", idle: "Pronto",
    title: "Tradutor Literário de EPUB", description: "Motor de Tradução Literária Profissional", settingsTitle: "CONFIGURAÇÕES",
    restoreSettings: "Restaurar", selectLang: "ESCOLHER IDIOMA", error: "ERRO", apiStatus: "STATUS API",
    freeMode: "MODO GRÁTIS", paidMode: "MODO PRO", connectAiStudio: "CONNETAR AI STUDIO", billingInfo: "Chave paga necessária.",
    lockedModel: "Bloqueado", checkKey: "Verificando...", verifyBtn: "ATIVAR", manualKeyLabel: "CHAVE MANUAL",
    manualKeyPlaceholder: "Cole sua API key aqui...", aiAnalysis: "ANÁLISE AI", preparing: "PREPARANDO",
    systemLogsReady: "Aguardando logs...", verifyingError: "Erro na chave!", literal: "Literal", creative: "Criativa",
    quotaError: "COTA EXCEDIDA: Aguarde cerca de 60 segundos. Tradução pausada."
  },
  nl: {
    historyTitle: "GESCHIEDENIS", clearHistory: "Wis alles", noHistory: "Geen geschiedenis",
    modelLabel: "MODEL", uploadLabel: "EPUB UPLOADEN", uploadPlaceholder: "Sleep of kies bestand",
    sourceLang: "BRONTAAL", targetLang: "DOELTAAL", creativity: "CREATIVITEIT", htmlTags: "HTML TAGS",
    systemMonitor: "Systeemmonitor", startBtn: "Start Vertaling", resumeBtn: "Hervatten", stopBtn: "Stop", downloadBtn: "DOWNLOAD EPUB", pdfBtn: "PDF",
    tokens: "TOKENS", speed: "SNELHEID", eta: "RESTEREND", processing: "Verwerken", idle: "Gereed",
    title: "Literaire EPUB-vertaler", description: "Professionele Literaire Vertaalmachine", settingsTitle: "INSTELLINGEN",
    restoreSettings: "Herstellen", selectLang: "KIES TAAL", error: "FOUT", apiStatus: "API STATUS",
    freeMode: "GRATIS MODUS", paidMode: "PRO MODUS", connectAiStudio: "VERBIND AI STUDIO", billingInfo: "Betaalde sleutel vereist.",
    lockedModel: "Vergrendeld", checkKey: "Controleren...", verifyBtn: "ACTIVEREN", manualKeyLabel: "HANDMATIGE SLEUTEL",
    manualKeyPlaceholder: "Plak hier je API-key...", aiAnalysis: "AI ANALYSE", preparing: "VOORBEREIDEN",
    systemLogsReady: "Wachten op logs...", verifyingError: "Sleutelfout!", literal: "Letterlijk", creative: "Creatief",
    quotaError: "QUOTA OVERSCHREDEN: Wacht ongeveer 60 seconden. Vertaling gepauzeerd."
  },
  pl: {
    historyTitle: "HISTORIA", clearHistory: "Wyczyść wszystko", noHistory: "Brak historii",
    modelLabel: "MODEL", uploadLabel: "PRZEŚLIJ EPUB", uploadPlaceholder: "Przeciągnij lub wybierz plik",
    sourceLang: "JĘZYK ŹRÓDŁOWY", targetLang: "JĘZYK DOCELOWY", creativity: "KREATYWNOŚĆ", htmlTags: "TAGI HTML",
    systemMonitor: "Monitor systemu", startBtn: "Rozpocznij tłumaczenie", resumeBtn: "Wznów", stopBtn: "Zatrzymaj", downloadBtn: "POBIERZ EPUB", pdfBtn: "PDF",
    tokens: "TOKENY", speed: "PRĘDKOŚĆ", eta: "POZOSTAŁO", processing: "Przetwarzanie", idle: "Gotowy",
    title: "Literacki Tłumacz EPUB", description: "Profesjonalny silnik tłumaczeń literackich", settingsTitle: "USTAWIENIA",
    restoreSettings: "Przywróć", selectLang: "WYBIERZ JĘZYK", error: "BŁĄD", apiStatus: "STATUS API",
    freeMode: "TRYB DARMOWY", paidMode: "TRYB PRO", connectAiStudio: "POŁĄCZ AI STUDIO", billingInfo: "Wymagany płatny klucz.",
    lockedModel: "Zablokowany", checkKey: "Sprawdzanie...", verifyBtn: "AKTYWUJ", manualKeyLabel: "RĘCZNY KLUCZ",
    manualKeyPlaceholder: "Wklej tutaj klucz API...", aiAnalysis: "ANALIZA AI", preparing: "PRZYGOTOWANIE",
    systemLogsReady: "Oczekiwanie na logi...", verifyingError: "Błąd klucza!", literal: "Dosłowne", creative: "Kreatywne",
    quotaError: "LIMIT PRZEKROCZONY: Poczekaj ok. 60 sekund. Tłumaczenie wstrzymane."
  },
  hi: {
    historyTitle: "अनुवाद इतिहास", clearHistory: "सब साफ़ करें", noHistory: "कोई इतिहास नहीं",
    modelLabel: "MODEL चयन", uploadLabel: "EPUB अपलोड करें", uploadPlaceholder: "फ़ाइल खींचें या चुनें",
    sourceLang: "स्रोत भाषा", targetLang: "लक्षय भाषा", creativity: "रचनात्मकता", htmlTags: "HTML टैग",
    systemMonitor: "सिस्टम मॉनिटर", startBtn: "अनुवाद शुरू करें", resumeBtn: "फिर से शुरू करें", stopBtn: "रोकें", downloadBtn: "EPUB डाउनलोड करें", pdfBtn: "PDF",
    tokens: "टोकन", speed: "गति", eta: "शेष समय", processing: "प्रसंस्करण", idle: "तैयार",
    title: "साहित्यिक EPUB अनुवादक", description: "पेशेवर साहित्यिक अनुवाद इंजन", settingsTitle: "सेटिंग्स और कॉन्फ़िगरेशन",
    restoreSettings: "पुनर्स्थापित करें", selectLang: "भाषा चुनें", error: "त्रुटि", apiStatus: "API स्थिति",
    freeMode: "मुफ्त मोड", paidMode: "प्रो मोड", connectAiStudio: "AI STUDIO से जुड़ें", billingInfo: "सशुल्क कुंजी आवश्यक है।",
    lockedModel: "लॉक किया गया", checkKey: "जांच हो रही है...", verifyBtn: "सत्यापित करें", manualKeyLabel: "मैनुअल कुंजी",
    manualKeyPlaceholder: "अपनी API कुंजी यहाँ पेस्ट करें...", aiAnalysis: "AI विश्लेषण", preparing: "तैयारी हो रही है",
    systemLogsReady: "लॉग की प्रतीक्षा है...", verifyingError: "कुंजी त्रुटi!", literal: "शाब्दिक", creative: "रचनात्मक",
    quotaError: "कोटा समाप्त: कृपया लगभग 60 सेकंड प्रतीक्षा करें। अनुवाद रोक दिया गया है।"
  },
  vi: {
    historyTitle: "LỊCH SỬ DỊCH", clearHistory: "Xóa tất cả", noHistory: "Không có lịch sử",
    modelLabel: "CHỌN MÔ HÌNH", uploadLabel: "TẢI LÊN EPUB", uploadPlaceholder: "Kéo hoặc chọn tệp",
    sourceLang: "NGÔN NGỮ NGUỒN", targetLang: "NGÔN NGỮ ĐÍCH", creativity: "SÁNG TẠO", htmlTags: "THẺ HTML",
    systemMonitor: "Giám sát hệ thống", startBtn: "Bắt đầu dịch", resumeBtn: "Tiếp tục dịch", stopBtn: "Dừng", downloadBtn: "TẢI VỀ EPUB", pdfBtn: "PDF",
    tokens: "TOKEN", speed: "TỐC ĐỘ", eta: "CÒN LẠI", processing: "Đang xử lý", idle: "Sẵn sàng",
    title: "Trình dịch EPUB Văn học", description: "Công cụ dịch thuật văn học chuyên nghiệp", settingsTitle: "CÀI ĐẶT",
    restoreSettings: "Khôi phục", selectLang: "CHỌN NGÔN NGỮ", error: "LỖI", apiStatus: "TRẠNG THÁI API",
    freeMode: "CHẾ ĐỘ MIỄN PHÍ", paidMode: "CHẾ ĐỘ PRO", connectAiStudio: "KẾT NỐI AI STUDIO", billingInfo: "Yêu cầu khóa trả phí.",
    lockedModel: "Bị khóa", checkKey: "Đang kiểm tra...", verifyBtn: "KÍCH HOẠT", manualKeyLabel: "KHÓA THỦ CÔNG",
    manualKeyPlaceholder: "Dán mã API vào đây...", aiAnalysis: "PHÂN TÍCH AI", preparing: "ĐANG CHUẨN BỊ",
    systemLogsReady: "Đang chờ nhật ký...", verifyingError: "Lỗi khóa!", literal: "Trực tiếp", creative: "Sáng tạo",
    quotaError: "HẾT HẠN MỨC: Vui lòng đợi khoảng 60 giây. Quá trình dịch đã tạm dừng."
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
    targetLanguage: 'English',
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
    const targetLabel = LANG_CODE_TO_LABEL[uiLang] || 'English';
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
      initialLang = STRINGS_REGISTRY[browserLang] ? browserLang : 'en';
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
          // Auto-save progress for resume
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
      
      // Clear resume on success
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
        {/* Status Bar */}
        <div className="w-full fixed top-20 z-40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-3.5 flex items-center justify-center">
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
