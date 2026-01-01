
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
    analyzing: "Yapay zeka kitabın üslubunu ve yazarın kalemini analiz ediyor...",
    found: "Kitapta {0} adet metin dosyası bulundu.",
    starting: "Çeviri işlemi başlatılıyor...",
    resuming: "Kaldığı yerden devam ediliyor...",
    stop: "İşlem kullanıcı tarafından durduruldu.",
    quotaExceeded: "API Kotası aşıldı! Yaklaşık 60 saniye bekleniyor...",
    finished: "Çeviri başarıyla tamamlandı!",
    processingFile: "Dosya işleniyor: {0} ({1}/{2}) - {3} etiket bulundu.",
    noNodes: "Bu dosyada çevrilecek uygun etiket bulunamadı, atlanıyor.",
    error: "Hata oluştu: {0}"
  },
  en: {
    analyzing: "AI is analyzing the book's style and author's voice...",
    found: "Found {0} text files in the book.",
    starting: "Starting translation...",
    resuming: "Resuming from last save...",
    stop: "Process stopped by user.",
    quotaExceeded: "Quota exceeded! Waiting ~60 seconds...",
    finished: "Translation completed successfully!",
    processingFile: "Processing: {0} ({1}/{2}) - Found {3} tags.",
    noNodes: "No suitable tags found in this file, skipping.",
    error: "Error: {0}"
  }
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
): Promise<{ epubBlob: Blob, pdfBlob: Blob }> {
  const ui = settings.uiLang;
  const translator = new GeminiTranslator(settings.temperature, settings.sourceLanguage, settings.targetLanguage, settings.modelId);
  const epubZip = await new JSZip().loadAsync(await file.arrayBuffer());

  // EPUB Yapısını Çözümle
  const containerXml = await epubZip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) throw new Error("Geçersiz EPUB: container.xml eksik.");

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "application/xml");
  const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("Geçersiz EPUB: OPF yolu bulunamadı.");

  const opfContent = await epubZip.file(opfPath)?.async("string");
  if (!opfContent) throw new Error("Geçersiz EPUB: OPF içeriği okunamadı.");
  
  const opfDoc = parser.parseFromString(opfContent, "application/xml");
  const opfFolder = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

  const metadata = {
    title: opfDoc.querySelector("dc\\:title, title")?.textContent || "Başlıksız",
    creator: opfDoc.querySelector("dc\\:creator, creator")?.textContent || "Bilinmeyen Yazar",
    description: opfDoc.querySelector("dc\\:description, description")?.textContent || ""
  };

  onProgress({
    currentFile: 0, totalFiles: 0, currentPercent: 0, status: 'analyzing',
    logs: [{ timestamp: new Date().toLocaleTimeString(), text: getLogStr(ui, 'analyzing') }]
  });

  const strategy = await translator.analyzeBook(metadata, undefined, ui);
  translator.setStrategy(strategy);

  // Manifest ve Spine Eşleşmesi
  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  const idToHref: Record<string, string> = {};
  manifestItems.forEach(item => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) idToHref[id] = href;
  });

  const spineItems = Array.from(opfDoc.querySelectorAll("spine > itemref"));
  const processList = spineItems.map(item => {
    const idref = item.getAttribute("idref");
    if (!idref || !idToHref[idref]) return null;
    const href = idToHref[idref];
    // Dosya yolu çözünürlüğü (decodeURIComponent ile boşluk/karakter sorunlarını çöz)
    const rawPath = opfFolder ? `${opfFolder}/${href}` : href;
    const decodedPath = decodeURIComponent(rawPath);
    
    // Fermuar içinde tam yolu kontrol et
    if (epubZip.file(decodedPath)) return decodedPath;
    if (epubZip.file(rawPath)) return rawPath;
    return null;
  }).filter(Boolean) as string[];

  let totalWords = 0;
  let processedFiles = resumeFrom ? resumeFrom.zipPathIndex : 0;
  const translatedNodes: Record<string, string[]> = resumeFrom ? { ...resumeFrom.translatedNodes } : {};
  const startTime = Date.now();

  const sendUpdate = (msg?: string, percent?: number, wps?: number, zipIdx?: number, nodeIdx?: number) => {
    onProgress({
      currentFile: (zipIdx !== undefined ? zipIdx + 1 : processedFiles + 1),
      totalFiles: processList.length,
      currentPercent: percent ?? Math.round((processedFiles / processList.length) * 100),
      status: 'processing',
      logs: msg ? [{ timestamp: new Date().toLocaleTimeString(), text: msg }] : [],
      strategy,
      usage: translator.getUsage(),
      wordsPerSecond: wps,
      totalProcessedWords: totalWords,
      lastZipPathIndex: zipIdx,
      lastNodeIndex: nodeIdx,
      translatedNodes
    });
  };

  sendUpdate(getLogStr(ui, 'found').replace('{0}', processList.length.toString()));

  for (let zipIdx = processedFiles; zipIdx < processList.length; zipIdx++) {
    const path = processList[zipIdx];
    if (signal.aborted) throw new Error(getLogStr(ui, 'stop'));

    const content = await epubZip.file(path)?.async("string");
    if (!content) continue;

    // XHTML/XML olarak ayrıştır
    const doc = parser.parseFromString(content, "application/xhtml+xml");
    const isXhtml = doc.documentElement.namespaceURI === "http://www.w3.org/1999/xhtml";
    
    // Seçicileri oluştur
    const selectors = settings.targetTags.join(',');
    const nodes = Array.from(doc.querySelectorAll(selectors));

    if (nodes.length === 0) {
      processedFiles++;
      continue;
    }

    sendUpdate(
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
      
      // Halihazırda çevrilmişse atla (resume durumu için)
      if (translatedNodes[path][nodeIdx]) {
        node.innerHTML = translatedNodes[path][nodeIdx];
        continue;
      }

      const originalHtml = node.innerHTML.trim();
      if (!originalHtml || originalHtml.length < 1) continue;
      
      try {
        const translatedHtml = await translator.translateSingle(originalHtml);
        if (translatedHtml && translatedHtml !== originalHtml) {
          node.innerHTML = translatedHtml;
          translatedNodes[path][nodeIdx] = translatedHtml;
          
          const wordCount = (node.textContent || "").split(/\s+/).filter(Boolean).length;
          totalWords += wordCount;

          // Periyodik UI güncellemesi
          if (nodeIdx % 5 === 0 || nodeIdx === nodes.length - 1) {
            const elapsed = (Date.now() - startTime) / 1000;
            const wps = totalWords / Math.max(1, elapsed);
            const currentFileProgress = (nodeIdx + 1) / nodes.length;
            const overallPercent = Math.round(((zipIdx + currentFileProgress) / processList.length) * 100);
            sendUpdate(undefined, overallPercent, wps, zipIdx, nodeIdx);
          }
        }
      } catch (err: any) {
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          sendUpdate(getLogStr(ui, 'quotaExceeded'));
          await new Promise(r => setTimeout(r, 65000));
          nodeIdx--; // Tekrar denemek için geri al
          continue;
        }
        console.error(`Düğüm çevirisi hatası (${path} # ${nodeIdx}):`, err);
      }
    }

    // Dosyayı güncelleyip geri yaz
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(doc);
    epubZip.file(path, serialized);
    processedFiles++;
  }

  const epubBlob = await epubZip.generateAsync({ 
    type: "blob", 
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });

  onProgress({
    currentFile: processList.length, totalFiles: processList.length, currentPercent: 100,
    status: 'completed', logs: [{ timestamp: new Date().toLocaleTimeString(), text: getLogStr(ui, 'finished') }],
    strategy, usage: translator.getUsage()
  });

  return { epubBlob, pdfBlob: new Blob() };
}
