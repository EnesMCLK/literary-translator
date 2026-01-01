
import JSZip from 'jszip';
import { GeminiTranslator, BookStrategy } from './geminiService';
import { UILanguage } from '../App';

export interface LogEntry {
  timestamp: string;
  text: string;
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
  tr: {
    analyzing: "Yapay zeka kitabın üslubunu analiz ediyor...",
    found: "Kitapta toplam {0} içerik dosyası bulundu.",
    starting: "Çeviri başlatılıyor...",
    stop: "Durduruldu.",
    quotaExceeded: "Kota sınırı! 60 saniye bekleniyor...",
    finished: "Çeviri tamamlandı!",
    processingFile: "İşleniyor: {0} ({1}/{2}) - {3} düğüm bulundu.",
    noNodes: "Bu dosyada hedef etiket bulunamadı, atlanıyor.",
    error: "Hata: {0}",
    saving: "EPUB dosyası paketleniyor...",
    nodeProgress: "Dosya içi ilerleme: %{0}"
  },
  en: {
    analyzing: "AI is analyzing the style...",
    found: "Total {0} content files found.",
    starting: "Starting translation...",
    stop: "Stopped.",
    quotaExceeded: "Quota exceeded! Waiting 60s...",
    finished: "Completed!",
    processingFile: "Processing: {0} ({1}/{2}) - {3} nodes found.",
    noNodes: "No nodes found, skipping.",
    error: "Error: {0}",
    saving: "Packaging EPUB...",
    nodeProgress: "Internal file progress: {0}%"
  }
};

function getLogStr(uiLang: string, key: string): string {
  const bundle = STRINGS_LOGS[uiLang] || STRINGS_LOGS['en'];
  return bundle[key] || STRINGS_LOGS['en'][key];
}

function preprocessHtml(html: string): string {
  return html.replace(/&(?!(amp|lt|gt|quot|apos);)[a-z0-9]+;/gi, ' ');
}

export async function processEpub(
  file: File, 
  settings: TranslationSettings,
  onProgress: (progress: TranslationProgress) => void,
  signal: AbortSignal,
  resumeFrom?: ResumeInfo
): Promise<{ epubBlob: Blob, pdfBlob: Blob }> {
  const ui = settings.uiLang;
  const translator = new GeminiTranslator(settings.temperature, settings.sourceLanguage, settings.targetLanguage, settings.modelId);
  const epubZip = await new JSZip().loadAsync(await file.arrayBuffer());

  // Değişkenleri en başta ilklendir (Initialization Error engellemek için)
  let totalWords = 0;
  let processedFilesCount = resumeFrom ? resumeFrom.zipPathIndex : 0;
  let processList: string[] = [];
  const translatedNodes: Record<string, string[]> = resumeFrom ? { ...resumeFrom.translatedNodes } : {};
  let strategy: BookStrategy | undefined = undefined;
  let cumulativeLogs: LogEntry[] = [
    { timestamp: new Date().toLocaleTimeString(), text: getLogStr(ui, 'analyzing') }
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

  const addLog = (text: string) => {
    cumulativeLogs.push({ timestamp: new Date().toLocaleTimeString(), text });
    if (cumulativeLogs.length > 50) cumulativeLogs.shift();
    triggerProgress({});
  };

  // 1. Analiz Aşaması
  triggerProgress({ status: 'analyzing' });

  const containerXml = await epubZip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) throw new Error("Geçersiz EPUB: container.xml yok.");

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "application/xml");
  const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("Geçersiz EPUB: OPF yolu yok.");

  const opfContent = await epubZip.file(opfPath)?.async("string");
  if (!opfContent) throw new Error("Geçersiz EPUB: OPF boş.");
  
  const opfDoc = parser.parseFromString(opfContent, "application/xml");
  const opfFolder = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

  const metadata = {
    title: opfDoc.querySelector("dc\\:title, title")?.textContent || "Kitap",
    creator: opfDoc.querySelector("dc\\:creator, creator")?.textContent || "Yazar",
    description: opfDoc.querySelector("dc\\:description, description")?.textContent || ""
  };

  strategy = await translator.analyzeBook(metadata, undefined, ui);
  translator.setStrategy(strategy);

  // 2. Dosya Listesi Hazırlama
  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  const idToHref: Record<string, string> = {};
  manifestItems.forEach(item => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) idToHref[id] = href;
  });

  const spineItems = Array.from(opfDoc.querySelectorAll("spine > itemref"));
  processList = spineItems.map(item => {
    const idref = item.getAttribute("idref");
    if (!idref || !idToHref[idref]) return null;
    const href = idToHref[idref];
    const rawPath = opfFolder ? `${opfFolder}/${href}` : href;
    const decodedPath = decodeURIComponent(rawPath);
    if (epubZip.file(decodedPath)) return decodedPath;
    if (epubZip.file(rawPath)) return rawPath;
    return null;
  }).filter(Boolean) as string[];

  addLog(getLogStr(ui, 'found').replace('{0}', processList.length.toString()));
  const startTime = Date.now();

  // 3. Çeviri Döngüsü
  for (let zipIdx = processedFilesCount; zipIdx < processList.length; zipIdx++) {
    const path = processList[zipIdx];
    if (signal.aborted) throw new Error(getLogStr(ui, 'stop'));

    const originalContent = await epubZip.file(path)?.async("string");
    if (!originalContent) {
      processedFilesCount++;
      continue;
    }

    const cleanContent = preprocessHtml(originalContent);
    const doc = parser.parseFromString(cleanContent, "text/html");
    const nodes = Array.from(doc.querySelectorAll(settings.targetTags.join(',')));

    if (nodes.length === 0) {
      addLog(`${path.split('/').pop()}: ${getLogStr(ui, 'noNodes')}`);
      processedFilesCount++;
      continue;
    }

    addLog(
      getLogStr(ui, 'processingFile')
        .replace('{0}', path.split('/').pop() || path)
        .replace('{1}', (zipIdx + 1).toString())
        .replace('{2}', processList.length.toString())
        .replace('{3}', nodes.length.toString())
    );

    if (!translatedNodes[path]) translatedNodes[path] = [];
    const startNodeIdx = (resumeFrom && zipIdx === resumeFrom.zipPathIndex) ? resumeFrom.nodeIndex : 0;

    for (let nodeIdx = startNodeIdx; nodeIdx < nodes.length; nodeIdx++) {
      if (signal.aborted) throw new Error(getLogStr(ui, 'stop'));
      const node = nodes[nodeIdx];
      
      const originalInner = node.innerHTML.trim();
      if (!originalInner || originalInner.length < 2) continue;

      if (translatedNodes[path][nodeIdx]) {
        node.innerHTML = translatedNodes[path][nodeIdx];
        continue;
      }
      
      try {
        const translated = await translator.translateSingle(originalInner);
        if (translated) {
          node.innerHTML = translated;
          translatedNodes[path][nodeIdx] = translated;
          totalWords += (node.textContent || "").split(/\s+/).filter(Boolean).length;

          const elapsed = (Date.now() - startTime) / 1000;
          const wps = totalWords / Math.max(1, elapsed);
          const currentFilePercent = ((nodeIdx + 1) / nodes.length);
          const overallPercent = Math.round(((zipIdx + currentFilePercent) / processList.length) * 100);
          
          triggerProgress({
            currentPercent: overallPercent,
            wordsPerSecond: wps,
            lastZipPathIndex: zipIdx,
            lastNodeIndex: nodeIdx
          });
        }
      } catch (err: any) {
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          addLog(getLogStr(ui, 'quotaExceeded'));
          await new Promise(r => setTimeout(r, 65000));
          nodeIdx--;
          continue;
        }
        console.warn(`Node translation failed at ${path}:${nodeIdx}`, err);
      }
    }

    // XHTML uyumluluğu için serialization
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(doc);
    epubZip.file(path, serialized);
    processedFilesCount++;
    triggerProgress({ currentPercent: Math.round((processedFilesCount / processList.length) * 100) });
  }

  addLog(getLogStr(ui, 'saving'));

  const epubBlob = await epubZip.generateAsync({ 
    type: "blob", 
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });

  cumulativeLogs.push({ timestamp: new Date().toLocaleTimeString(), text: getLogStr(ui, 'finished') });
  onProgress({
    currentFile: processList.length, totalFiles: processList.length, currentPercent: 100,
    status: 'completed', logs: [...cumulativeLogs],
    strategy, usage: translator.getUsage()
  });

  return { epubBlob, pdfBlob: new Blob() };
}
