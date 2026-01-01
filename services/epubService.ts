
import JSZip from 'jszip';
import { GeminiTranslator, BookStrategy } from './geminiService';
import { UILanguage } from '../App';

export interface LogEntry {
  timestamp: string;
  text: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'live';
}

export interface UsageStats {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface TranslationSettings {
  temperature: number;
  targetTags: string[];
  sourceLanguage: string;
  targetLanguage: string;
  modelId?: string;
  uiLang: UILanguage;
}

export interface ResumeInfo {
  filename: string;
  zipPathIndex: number;
  nodeIndex: number;
  translatedNodes: Record<string, string[]>; 
  settings: TranslationSettings;
}

export interface TranslationProgress {
  currentFile: number;
  totalFiles: number;
  currentPercent: number;
  status: 'idle' | 'processing' | 'completed' | 'error' | 'analyzing' | 'resuming';
  logs: LogEntry[];
  etaSeconds?: number;
  strategy?: BookStrategy;
  usage?: UsageStats;
  wordsPerSecond?: number;
  totalProcessedWords?: number;
  lastZipPathIndex?: number;
  lastNodeIndex?: number;
  translatedNodes?: Record<string, string[]>;
}

const STRINGS_LOGS: Record<string, any> = {
  tr: { analyzing: "Analiz ediliyor...", found: "{0} dosya bulundu.", quotaExceeded: "Kota sınırı! Bekleniyor...", finished: "Tamamlandı!", processingFile: "İşleniyor: {0}", saving: "Dosyalar hazırlanıyor...", error: "Hata: {0}", repairing: "Eksik kısımlar tespit edildi, onarılıyor...", verifying: "Çeviri bütünlüğü doğrulanıyor..." },
  en: { analyzing: "Analyzing...", found: "{0} files found.", quotaExceeded: "Quota exceeded! Waiting...", finished: "Completed!", processingFile: "Processing: {0}", saving: "Preparing files...", error: "Error: {0}", repairing: "Repairing missing parts...", verifying: "Verifying integrity..." },
  fr: { analyzing: "Analyse en cours...", found: "{0} fichiers trouvés.", quotaExceeded: "Quota dépassé! Attente...", finished: "Terminé!", processingFile: "Traitement de : {0}", saving: "Préparation des fichiers...", error: "Erreur : {0}", repairing: "Réparation des parties manquantes...", verifying: "Vérification de l'intégrité..." },
  de: { analyzing: "Wird analysiert...", found: "{0} Dateien gefunden.", quotaExceeded: "Kontingent erschöpft! Warten...", finished: "Abgeschlossen!", processingFile: "Verarbeitung: {0}", saving: "Dateien werden vorbereitet...", error: "Fehler: {0}", repairing: "Fehlende Teile werden repariert...", verifying: "Integrität wird geprüft..." },
  es: { analyzing: "Analizando...", found: "{0} archivos encontrados.", quotaExceeded: "¡Cuota excedida! Esperando...", finished: "¡Completado!", processingFile: "Procesando: {0}", saving: "Preparando archivos...", error: "Error: {0}", repairing: "Reparando partes faltantes...", verifying: "Verificando integridad..." },
  it: { analyzing: "Analisi in corso...", found: "{0} file trovati.", quotaExceeded: "Quota superata! Attesa...", finished: "Completato!", processingFile: "Elaborazione: {0}", saving: "Preparazione file...", error: "Errore: {0}", repairing: "Riparazione parti mancanti...", verifying: "Verifica integrità..." },
  ja: { analyzing: "分析中...", found: "{0}個のファイルが見つかりました。", quotaExceeded: "制限超過！待機中...", finished: "完了しました！", processingFile: "処理中：{0}", saving: "ファイルを準備中...", error: "エラー：{0}", repairing: "不足部分を修復中...", verifying: "整合性を確認中..." },
  ko: { analyzing: "분석 중...", found: "{0}개 파일 발견.", quotaExceeded: "할당량 초과! 대기 중...", finished: "완료!", processingFile: "처리 중: {0}", saving: "파일 준비 중...", error: "오류: {0}", repairing: "누락된 부분 복구 중...", verifying: "무결성 검사 중..." },
  zh: { analyzing: "正在分析...", found: "找到 {0} 个文件。", quotaExceeded: "配额超出！正在等待...", finished: "已完成！", processingFile: "正在处理：{0}", saving: "正在准备文件...", error: "错误：{0}", repairing: "正在修复缺失部分...", verifying: "正在验证完整性..." },
  ru: { analyzing: "Анализ...", found: "Найдено файлов: {0}.", quotaExceeded: "Квота превышена! Ожидание...", finished: "Завершено!", processingFile: "Обработка: {0}", saving: "Подготовка файлов...", error: "Ошибка: {0}", repairing: "Восстановление отсутствующих частей...", verifying: "Проверка целостности..." },
  ar: { analyzing: "جاري التحليل...", found: "تم العثور على {0} ملفات.", quotaExceeded: "تجاوز الحصة! الانتظار...", finished: "اكتمل!", processingFile: "جاري معالجة: {0}", saving: "جاري تحضير الملفات...", error: "خطأ: {0}", repairing: "جاري إصلاح الأجزاء المفقودة...", verifying: "جاري التحقق من السلامة..." },
  pt: { analyzing: "Analisando...", found: "{0} arquivos encontrados.", quotaExceeded: "Cota excedida! Aguardando...", finished: "Concluído!", processingFile: "Processando: {0}", saving: "Preparando arquivos...", error: "Erro: {0}", repairing: "Reparando partes ausentes...", verifying: "Verificando integridade..." },
  nl: { analyzing: "Analyseren...", found: "{0} bestanden gevonden.", quotaExceeded: "Quota overschreden! Wachten...", finished: "Voltooid!", processingFile: "Verwerken: {0}", saving: "Bestanden voorbereiden...", error: "Fout: {0}", repairing: "Ontbrekende delen herstellen...", verifying: "Integriteit controleren..." },
  pl: { analyzing: "Analizowanie...", found: "Znaleziono {0} plików.", quotaExceeded: "Limit przekroczony! Oczekiwanie...", finished: "Zakończono!", processingFile: "Przetwarzanie: {0}", saving: "Przygotowywanie plików...", error: "Błąd: {0}", repairing: "Naprawianie brakujących części...", verifying: "Weryfikacja integralności..." },
  hi: { analyzing: "विश्लेषण हो रहा है...", found: "{0} फ़ाइलें मिलीं।", quotaExceeded: "कोटा समाप्त! प्रतीक्षा करें...", finished: "पूरा हुआ!", processingFile: "प्रसंस्करण: {0}", saving: "फ़ाइलें तैयार की जा रही हैं...", error: "त्रुटि: {0}", repairing: "लापता भागों की मरम्मत...", verifying: "अखंडता की पुष्टि..." },
  vi: { analyzing: "Đang phân tích...", found: "Tìm thấy {0} tệp.", quotaExceeded: "Hết hạn mức! Đang chờ...", finished: "Đã hoàn thành!", processingFile: "Đang xử lý: {0}", saving: "Đang chuẩn bị tệp...", error: "Lỗi: {0}", repairing: "Đang sửa phần thiếu...", verifying: "Đang xác minh tính toàn vẹn..." }
};

function getLogStr(uiLang: string, key: string): string {
  const bundle = STRINGS_LOGS[uiLang] || STRINGS_LOGS['en'];
  return bundle[key] || STRINGS_LOGS['en'][key];
}

export async function processEpub(
  file: File, 
  settings: TranslationSettings,
  onProgress: (progress: TranslationProgress) => void,
  signal: AbortSignal,
  resumeFrom?: ResumeInfo
): Promise<{ epubBlob: Blob }> {
  const ui = settings.uiLang;
  const translator = new GeminiTranslator(settings.temperature, settings.sourceLanguage, settings.targetLanguage, settings.modelId);
  const epubBuffer = await file.arrayBuffer();
  const epubZip = await new JSZip().loadAsync(epubBuffer);

  let totalWords = 0;
  let processedFilesCount = resumeFrom ? resumeFrom.zipPathIndex : 0;
  let processList: string[] = [];
  const translatedNodes: Record<string, string[]> = resumeFrom ? { ...resumeFrom.translatedNodes } : {};
  let strategy: BookStrategy | undefined = undefined;

  let cumulativeLogs: LogEntry[] = [
    { timestamp: new Date().toLocaleTimeString(), text: getLogStr(ui, 'analyzing'), type: 'info' }
  ];

  const triggerProgress = (updates: Partial<TranslationProgress>) => {
    onProgress({
      currentFile: processedFilesCount,
      totalFiles: processList.length || 0,
      currentPercent: processList.length > 0 ? Math.round((processedFilesCount / processList.length) * 100) : 0,
      status: 'processing',
      logs: [...cumulativeLogs],
      strategy,
      usage: translator.getUsage(),
      totalProcessedWords: totalWords,
      translatedNodes,
      ...updates
    });
  };

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    cumulativeLogs.push({ timestamp: new Date().toLocaleTimeString(), text, type });
    if (cumulativeLogs.length > 50) cumulativeLogs.shift();
    triggerProgress({});
  };

  triggerProgress({ status: 'analyzing' });

  const containerXml = await epubZip.file("META-INF/container.xml")?.async("string");
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml || "", "application/xml");
  const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path") || "";
  const opfContent = await epubZip.file(opfPath)?.async("string");
  const opfDoc = parser.parseFromString(opfContent || "", "application/xml");
  const opfFolder = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

  const metadata = {
    title: opfDoc.querySelector("dc\\:title, title")?.textContent || "Untitled",
    creator: opfDoc.querySelector("dc\\:creator, creator")?.textContent || "Unknown",
  };

  strategy = await translator.analyzeBook(metadata, undefined, ui);
  translator.setStrategy(strategy);

  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  const idToHref: Record<string, string> = {};
  manifestItems.forEach(item => idToHref[item.getAttribute("id") || ""] = item.getAttribute("href") || "");

  const spineItems = Array.from(opfDoc.querySelectorAll("spine > itemref"));
  processList = spineItems.map(item => {
    const href = idToHref[item.getAttribute("idref") || ""];
    const path = opfFolder ? `${opfFolder}/${href}` : href;
    return decodeURIComponent(path);
  }).filter(p => epubZip.file(p)) as string[];

  addLog(getLogStr(ui, 'found').replace('{0}', processList.length.toString()), 'success');
  const startTime = Date.now();

  for (let zipIdx = processedFilesCount; zipIdx < processList.length; zipIdx++) {
    const path = processList[zipIdx];
    if (signal.aborted) throw new Error("Stopped.");

    const content = await epubZip.file(path)?.async("string");
    if (!content) continue;

    const doc = parser.parseFromString(content, "text/html");
    const nodes = Array.from(doc.querySelectorAll(settings.targetTags.join(',')));

    if (nodes.length > 0) {
      addLog(getLogStr(ui, 'processingFile').replace('{0}', path.split('/').pop() || ""), 'info');
      if (!translatedNodes[path]) translatedNodes[path] = [];
      const startNodeIdx = (resumeFrom && zipIdx === resumeFrom.zipPathIndex) ? resumeFrom.nodeIndex : 0;

      for (let nodeIdx = startNodeIdx; nodeIdx < nodes.length; nodeIdx++) {
        if (signal.aborted) throw new Error("Stopped.");
        const node = nodes[nodeIdx];
        const original = node.innerHTML.trim();
        if (!original) continue;

        if (translatedNodes[path][nodeIdx]) {
          node.innerHTML = translatedNodes[path][nodeIdx];
        } else {
          try {
            const trans = await translator.translateSingle(original);
            node.innerHTML = trans;
            translatedNodes[path][nodeIdx] = trans;
            totalWords += (node.textContent || "").split(/\s+/).length;
          } catch (err: any) {
            if (err.message === "TRANSLATION_SKIPPED_OR_INVALID") {
                addLog(getLogStr(ui, 'repairing'), 'warning');
                try {
                    const repaired = await translator.translateSingle(original, true);
                    node.innerHTML = repaired;
                    translatedNodes[path][nodeIdx] = repaired;
                } catch { node.innerHTML = original; }
            } else if (err.message?.includes('429')) {
              addLog(getLogStr(ui, 'quotaExceeded'), 'warning');
              await new Promise(r => setTimeout(r, 65000));
              nodeIdx--; continue;
            }
          }
        }
        
        const elapsed = (Date.now() - startTime) / 1000;
        const currentProgressFrac = (zipIdx + (nodeIdx / nodes.length)) / processList.length;
        let eta = 0;
        if (currentProgressFrac > 0.01) {
          const totalEstimatedTime = elapsed / currentProgressFrac;
          eta = Math.max(0, Math.round(totalEstimatedTime - elapsed));
        }

        triggerProgress({
            currentPercent: Math.round(currentProgressFrac * 100),
            wordsPerSecond: totalWords / elapsed,
            etaSeconds: eta,
            lastZipPathIndex: zipIdx,
            lastNodeIndex: nodeIdx
        });
      }
      epubZip.file(path, new XMLSerializer().serializeToString(doc));
    }
    processedFilesCount++;
  }

  addLog(getLogStr(ui, 'saving'), 'info');
  const epubBlob = await epubZip.generateAsync({ type: "blob", mimeType: "application/epub+zip", compression: "DEFLATE" });
  addLog(getLogStr(ui, 'finished'), 'success');
  onProgress({ currentFile: processList.length, totalFiles: processList.length, currentPercent: 100, status: 'completed', logs: [...cumulativeLogs], strategy, usage: translator.getUsage() });
  return { epubBlob };
}
