
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
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
  zipPathIndex: number;
  nodeIndex: number;
  translatedContent: Record<string, string>; 
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
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const CONCURRENCY_LIMIT = 4; 

function uint8ArrayToBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

const STRINGS: Record<string, any> = {
  tr: {
    analyzing: "Kitap kaynak dilde analiz ediliyor ve yazar üslubu araştırılıyor...",
    found: "Kitap yapısında {0} doküman bulundu.",
    genre: "Tür: ",
    strategy: "Strateji: ",
    factual: "Bilgi: Teknik/Olgusal içerik. Tutarlılık için yaratıcılık {0} olarak sınırlandırıldı.",
    creative: "Bilgi: Yüksek edebi değer tespiti. Yazarın yaratıcılığını korumak için üslup {0} seviyesine yükseltildi.",
    starting: "Çeviri işlemi başlatılıyor...",
    resuming: "Kaldığı yerden devam ediliyor...",
    pdf: "PDF dosyası hazırlanıyor...",
    pdfError: "Hata: PDF oluşturulamadı, ancak EPUB hazır.",
    stop: "İşlem durduruldu"
  },
  en: {
    analyzing: "Analyzing book in source language and researching author's style...",
    found: "Found {0} documents in the book structure.",
    genre: "Genre: ",
    strategy: "Strategy: ",
    factual: "Info: Technical/Factual content. Creativity limited to {0} for consistency.",
    creative: "Info: High literary value detected. Style elevated to {0} to preserve author's creativity.",
    starting: "Starting translation process...",
    resuming: "Resuming translation...",
    pdf: "Preparing PDF file...",
    pdfError: "Error: Could not generate PDF, but EPUB is ready.",
    stop: "Process stopped"
  },
  fr: {
    analyzing: "Analyse du livre en langue source et recherche du style de l'auteur...",
    found: "{0} documents trouvés dans la structure du livre.",
    genre: "Genre : ",
    strategy: "Stratégie : ",
    factual: "Info : Contenu technique/factuel. Créativité limitée à {0} pour la cohérence.",
    creative: "Info : Haute valeur littéraire détectée. Style élevé à {0} pour préserver la créativité.",
    starting: "Démarrage de la traduction...",
    resuming: "Reprise de la traduction...",
    pdf: "Préparation du fichier PDF...",
    pdfError: "Erreur : Impossible de générer le PDF, mais l'EPUB est prêt.",
    stop: "Processus arrêté"
  },
  de: {
    analyzing: "Buchanalyse in der Quellsprache und Untersuchung des Autorenstils...",
    found: "{0} Dokumente in der Buchstruktur gefunden.",
    genre: "Genre: ",
    strategy: "Strategie: ",
    factual: "Info: Technischer/Sachlicher Inhalt. Kreativität auf {0} begrenzt für Konsistenz.",
    creative: "Info: Hoher literarischer Wert erkannt. Stil auf {0} erhöht, um Kreativität zu bewahren.",
    starting: "Übersetzungsprozess wird gestartet...",
    resuming: "Übersetzung wird fortgesetzt...",
    pdf: "PDF-Datei wird vorbereitet...",
    pdfError: "Fehler: PDF konnte nicht erstellt werden, EPUB ist jedoch bereit.",
    stop: "Prozess gestoppt"
  },
  es: {
    analyzing: "Analizando libro en idioma original e investigando el estilo del autor...",
    found: "Se encontraron {0} documentos en la estructura del libro.",
    genre: "Género: ",
    strategy: "Estrategia: ",
    factual: "Info: Contenido técnico/factual. Creatividad limitada a {0} para mayor consistencia.",
    creative: "Info: Alto valor literario detectado. Estilo elevado a {0} para preservar la creatividad.",
    starting: "Iniciando proceso de traducción...",
    resuming: "Reanudando traducción...",
    pdf: "Preparando archivo PDF...",
    pdfError: "Error: No se pudo generar el PDF, pero el EPUB está listo.",
    stop: "Proceso detenido"
  },
  it: {
    analyzing: "Analisi del libro in lingua originale e ricerca dello stile dell'autore...",
    found: "Trovati {0} documenti nella struttura del libro.",
    genre: "Genere: ",
    strategy: "Strategia: ",
    factual: "Info: Contenuto tecnico/fattuale. Creatività limitata a {0} per coerenza.",
    creative: "Info: Alto valore letterario rilevato. Stile elevato a {0} per preservare la creatività.",
    starting: "Avvio del processo di traduzione...",
    resuming: "Ripresa della traduzione...",
    pdf: "Preparazione del file PDF...",
    pdfError: "Errore: Impossibile generare il PDF, ma l'EPUB è pronto.",
    stop: "Processo interrotto"
  },
  ru: {
    analyzing: "Анализ книги на языке оригинала и изучение стиля автора...",
    found: "В структуре книги найдено {0} документов.",
    genre: "Жанр: ",
    strategy: "Стратегия: ",
    factual: "Инфо: Технический/фактический контент. Креативность ограничена до {0} для последовательности.",
    creative: "Инфо: Обнаружена высокая литературная ценность. Стиль поднят до {0} для сохранения креативности.",
    starting: "Запуск процесса перевода...",
    resuming: "Возобновление перевода...",
    pdf: "Подготовка PDF-файла...",
    pdfError: "Ошибка: не удалось создать PDF, но EPUB готов.",
    stop: "Процесс остановлен"
  },
  zh: {
    analyzing: "正在以源语言分析书籍并研究作者风格...",
    found: "在书籍结构中找到 {0} 个文档。",
    genre: "流派：",
    strategy: "策略：",
    factual: "信息：技术/事实内容。为了保持一致性，创造力限制在 {0}。",
    creative: "信息：检测到高文学价值。风格提升至 {0} 以保留作者的创造力。",
    starting: "开始翻译流程...",
    resuming: "恢复翻译...",
    pdf: "正在准备 PDF 文件...",
    pdfError: "错误：无法生成 PDF，但 EPUB 已就绪。",
    stop: "进程已停止"
  },
  ja: {
    analyzing: "元の言語で本を分析し、著者のスタイルを調査しています...",
    found: "本の構造内に {0} 個のドキュメントが見つかりました。",
    genre: "ジャンル: ",
    strategy: "戦略: ",
    factual: "情報: 技術的/事実的な内容。一貫性のために創造性を {0} に制限しました。",
    creative: "情報: 高い文学的価値が検出されました。著者の創造性を維持するためにスタイルを {0} に上げました。",
    starting: "翻訳プロセスを開始しています...",
    resuming: "翻訳を再開しています...",
    pdf: "PDFファイルを準備しています...",
    pdfError: "エラー: PDFを生成できませんでしたが、EPUBの準備はできています。",
    stop: "プロセスが停止しました"
  },
  ko: {
    analyzing: "원본 언어로 도서를 분석하고 저자의 스타일을 연구 중입니다...",
    found: "도서 구조에서 {0}개의 문서를 찾았습니다.",
    genre: "장르: ",
    strategy: "전략: ",
    factual: "정보: 기술/사실적 콘텐츠. 일관성을 위해 창의성을 {0}으로 제한했습니다.",
    creative: "정보: 높은 문학적 가치가 감지되었습니다. 저자의 창의성을 보존하기 위해 스타일을 {0}으로 높였습니다.",
    starting: "번역 프로세스를 시작합니다...",
    resuming: "번역을 재개합니다...",
    pdf: "PDF 파일을 준비 중입니다...",
    pdfError: "오류: PDF를 생성할 수 없지만 EPUB는 준비되었습니다.",
    stop: "프로세스가 중지됨"
  },
  ar: {
    analyzing: "تحليل الكتاب باللغة المصدر والبحث في أسلوب المؤلف...",
    found: "تم العثور على {0} مستندات في هيكل الكتاب.",
    genre: "النوع: ",
    strategy: "الاستراتيجية: ",
    factual: "معلومات: محتوى تقني/واقعي. تم تقييد الإبداع عند {0} لضمان الاتساق.",
    creative: "معلومات: تم اكتشاف قيمة أدبية عالية. تم رفع الأسلوب إلى {0} للحفاظ على إبداع المؤلف.",
    starting: "بدء عملية الترجمة...",
    resuming: "استئناف الترجمة...",
    pdf: "جاري تحضير ملف PDF...",
    pdfError: "خطأ: تعذر إنشاء ملف PDF، ولكن ملف EPUB جاهز.",
    stop: "توقفت العملية"
  },
  pt: {
    analyzing: "Analisando o livro no idioma original e pesquisando o estilo do autor...",
    found: "Encontrados {0} documentos na estrutura do livro.",
    genre: "Gênero: ",
    strategy: "Estratégia: ",
    factual: "Info: Conteúdo técnico/factual. Criatividade limitada a {0} para consistência.",
    creative: "Info: Alta valor literário detectado. Estilo elevado a {0} para preservar a criatividade do autor.",
    starting: "Iniciando o processo de tradução...",
    resuming: "Retomando a tradução...",
    pdf: "Preparando o arquivo PDF...",
    pdfError: "Erro: Não foi possível gerar o PDF, mas o EPUB está pronto.",
    stop: "Processo interrompido"
  },
  nl: {
    analyzing: "Boek analyseren in de brontaal en onderzoek doen naar de stijl van de auteur...",
    found: "{0} documenten gevonden in de boekstructuur.",
    genre: "Genre: ",
    strategy: "Strategie: ",
    factual: "Info: Technische/Feitelijke inhoud. Creativiteit beperkt tot {0} voor consistentie.",
    creative: "Info: Hoge literaire waarde gedetecteerd. Stijl verhoogd naar {0} om de creativiteit te behouden.",
    starting: "Vertaalproces wordt gestart...",
    resuming: "Vertaling wordt hervat...",
    pdf: "PDF-bestand wordt voorbereid...",
    pdfError: "Fout: PDF kon niet worden gegenereerd, maar EPUB is gereed.",
    stop: "Proces gestopt"
  },
  pl: {
    analyzing: "Analizowanie książki w języku źródłowym i badanie stylu autora...",
    found: "Znaleziono {0} dokumentów w strukturze książki.",
    genre: "Gatunek: ",
    strategy: "Strategia: ",
    factual: "Info: Treść techniczna/faktograficzna. Kreatywność ograniczona do {0} dla spójności.",
    creative: "Info: Wykryto wysoką wartość literacką. Styl podniesiony do {0}, aby zachować kreatywność autora.",
    starting: "Uruchamianie procesu tłumaczenia...",
    resuming: "Wznawianie tłumaczenia...",
    pdf: "Przygotowywanie pliku PDF...",
    pdfError: "Błąd: Nie można wygenerować pliku PDF, ale EPUB jest gotowy.",
    stop: "Proces zatrzymany"
  },
  hi: {
    analyzing: "स्रोत भाषा में पुस्तक का विश्लेषण और लेखक की शैली पर शोध किया जा रहा है...",
    found: "पुस्तक की संरचना में {0} दस्तावेज़ मिले।",
    genre: "शैली: ",
    strategy: "रणनीति: ",
    factual: "जानकारी: तकनीकी/तथ्यात्मक सामग्री। निरंतरता के लिए रचनात्मकता को {0} तक सीमित किया गया है।",
    creative: "जानकारी: उच्च साहित्यिक मूल्य का पता चला। लेखक की रचनात्मकता को बनाए रखने के लिए शैली को {0} तक बढ़ाया गया।",
    starting: "अनुवाद प्रक्रिया शुरू हो रही है...",
    resuming: "अनुवाद फिर से शुरू किया जा रहा है...",
    pdf: "PDF फ़ाइल तैयार की जा रही है...",
    pdfError: "त्रुटि: PDF तैयार नहीं की जा सकी, लेकिन EPUB तैयार है।",
    stop: "प्रक्रिया रुक गई"
  },
  vi: {
    analyzing: "Đang phân tích sách bằng ngôn ngữ nguồn và nghiên cứu phong cách tác giả...",
    found: "Tìm thấy {0} tài liệu trong cấu trúc sách.",
    genre: "Thể loại: ",
    strategy: "Chiến lược: ",
    factual: "Thông tin: Nội dung kỹ thuật/thực tế. Sự sáng tạo được giới hạn ở {0} để đảm bảo tính nhất quán.",
    creative: "Thông tin: Đã phát hiện giá trị văn học cao. Phong cách được nâng lên {0} để bảo tồn sự sáng tạo của tác giả.",
    starting: "Bắt đầu quá trình dịch...",
    resuming: "Tiếp tục dịch...",
    pdf: "Đang chuẩn bị tệp PDF...",
    pdfError: "Lỗi: Không thể tạo PDF, nhưng EPUB đã sẵn sàng.",
    stop: "Quá trình đã dừng"
  }
};

function getS(uiLang: string, key: string): string {
  const bundle = STRINGS[uiLang] || STRINGS['en'];
  return bundle[key] || STRINGS['en'][key];
}

async function generatePdfFromEpub(epubZip: JSZip, metadata: any): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  const pageHeight = pdf.internal.pageSize.getHeight();
  let cursorY = 40;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  const titleLines = pdf.splitTextToSize(metadata.title || "Untitled", contentWidth);
  pdf.text(titleLines, margin, 60);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(16);
  pdf.text(metadata.creator || "Unknown Author", margin, 80);
  
  pdf.addPage();
  cursorY = margin;

  const containerXml = await epubZip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) return pdf.output('blob');
  
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "application/xml");
  const rootfile = containerDoc.querySelector("rootfile");
  const opfPath = rootfile?.getAttribute("full-path");
  if (!opfPath) return pdf.output('blob');

  const opfContent = await epubZip.file(opfPath)?.async("string");
  if (!opfContent) return pdf.output('blob');

  const opfDoc = parser.parseFromString(opfContent, "application/xml");
  const opfFolder = opfPath.substring(0, opfPath.lastIndexOf('/'));
  
  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  const spineItems = Array.from(opfDoc.querySelectorAll("spine > itemref"));

  const idToHref: Record<string, string> = {};
  manifestItems.forEach(item => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) idToHref[id] = href;
  });

  const processList: string[] = [];
  spineItems.forEach(item => {
    const idref = item.getAttribute("idref");
    if (idref && idToHref[idref]) {
      const href = idToHref[idref];
      const fullPath = opfFolder ? `${opfFolder}/${href}` : href;
      if (epubZip.file(fullPath)) {
        processList.push(fullPath);
      }
    }
  });

  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);

  for (const zipPath of processList) {
    const html = await epubZip.file(zipPath)?.async("string");
    if (!html) continue;

    const doc = parser.parseFromString(html, "text/html");
    const textElements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
    
    for (const el of Array.from(textElements)) {
      const isHeader = el.tagName.startsWith('H');
      pdf.setFont('times', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(isHeader ? 16 : 12);

      const text = el.textContent?.trim() || "";
      if (!text) continue;

      const lines = pdf.splitTextToSize(text, contentWidth);
      const neededHeight = lines.length * (isHeader ? 8 : 6);

      if (cursorY + neededHeight > pageHeight - margin) {
        pdf.addPage();
        cursorY = margin;
      }

      pdf.text(lines, margin, cursorY);
      cursorY += neededHeight + 4;
    }
  }

  return pdf.output('blob');
}

export async function processEpub(
  file: File, 
  settings: TranslationSettings,
  onProgress: (progress: TranslationProgress) => void,
  signal: AbortSignal,
  resumeFrom?: ResumeInfo
): Promise<{ epubBlob: Blob, pdfBlob: Blob }> {
  const ui = settings.uiLang;
  const translator = new GeminiTranslator(
    settings.temperature, 
    settings.sourceLanguage, 
    settings.targetLanguage,
    settings.modelId
  );
  
  const zip = new JSZip();
  const fileContent = await file.arrayBuffer();
  const epubZip = await zip.loadAsync(fileContent);

  const containerXml = await epubZip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) throw new Error("Invalid EPUB: container.xml missing");

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "application/xml");
  const rootfile = containerDoc.querySelector("rootfile");
  const opfPath = rootfile?.getAttribute("full-path");

  if (!opfPath) throw new Error("Invalid EPUB: OPF path missing");

  const opfContent = await epubZip.file(opfPath)?.async("string");
  if (!opfContent) throw new Error("Invalid EPUB: OPF file missing");

  const opfDoc = parser.parseFromString(opfContent, "application/xml");
  const opfFolder = opfPath.substring(0, opfPath.lastIndexOf('/'));

  const metadata = {
    title: opfDoc.querySelector("dc\\:title, title")?.textContent || "Unknown",
    creator: opfDoc.querySelector("dc\\:creator, creator")?.textContent || "Unknown",
    description: opfDoc.querySelector("dc\\:description, description")?.textContent || "No description"
  };

  onProgress({
    currentFile: 0,
    totalFiles: 0,
    currentPercent: 0,
    status: 'analyzing',
    logs: [{ timestamp: new Date().toLocaleTimeString(), text: getS(ui, 'analyzing') }],
    wordsPerSecond: 0,
    totalProcessedWords: 0
  });

  let coverInfo: { data: string, mimeType: string } | undefined;
  const coverItem = opfDoc.querySelector("manifest > item[id*='cover'], manifest > item[properties*='cover-image']");
  if (coverItem) {
    const coverHref = coverItem.getAttribute("href");
    const mediaType = coverItem.getAttribute("media-type") || "image/jpeg";
    if (coverHref) {
      const coverPath = opfFolder ? `${opfFolder}/${coverHref}` : coverHref;
      const coverFile = epubZip.file(coverPath);
      if (coverFile) {
        const coverData = await coverFile.async("uint8array");
        coverInfo = { data: uint8ArrayToBase64(coverData), mimeType: mediaType };
      }
    }
  }

  const strategy = await translator.analyzeBook(metadata, coverInfo, ui);
  
  const factualKeywords = [
    'technical', 'science', 'math', 'academic', 'educational', 
    'history', 'biography', 'manual', 'reference', 'non-fiction'
  ];
  const genreEn = (strategy.genre_en || "").toLowerCase();
  const isFactual = factualKeywords.some(k => genreEn.includes(k));
  
  if (isFactual) {
    translator.updateTemperature(0.1); 
  }

  const creativityInfo = isFactual 
    ? getS(ui, 'factual').replace('{0}', "0.1")
    : getS(ui, 'creative').replace('{0}', strategy.detected_creativity_level.toString());

  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  const spineItems = Array.from(opfDoc.querySelectorAll("spine > itemref"));

  const idToHref: Record<string, string> = {};
  manifestItems.forEach(item => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) idToHref[id] = href;
  });

  const processList: { zipPath: string, id: string }[] = [];
  spineItems.forEach(item => {
    const idref = item.getAttribute("idref");
    if (idref && idToHref[idref]) {
      const href = idToHref[idref];
      const fullPath = opfFolder ? `${opfFolder}/${href}` : href;
      if (epubZip.file(fullPath)) {
        processList.push({ zipPath: fullPath, id: idref });
      }
    }
  });

  const totalFiles = processList.length;
  let processedFiles = resumeFrom ? resumeFrom.zipPathIndex : 0;
  let totalWordsProcessed = 0;
  let currentLogs: LogEntry[] = [
    { timestamp: new Date().toLocaleTimeString(), text: getS(ui, 'genre') + strategy.genre_translated },
    { timestamp: new Date().toLocaleTimeString(), text: getS(ui, 'strategy') + strategy.strategy_translated },
    { timestamp: new Date().toLocaleTimeString(), text: creativityInfo },
    { timestamp: new Date().toLocaleTimeString(), text: resumeFrom ? getS(ui, 'resuming') : getS(ui, 'starting') }
  ];
  const startTime = Date.now();

  const updateProgress = (msg?: string, etaSeconds?: number, wordsPerSecond?: number, currentZipIdx?: number, currentNodeIdx?: number) => {
    if (msg) currentLogs = [...currentLogs, { timestamp: new Date().toLocaleTimeString(), text: msg }];
    if (currentLogs.length > 50) currentLogs = currentLogs.slice(-50);
    
    onProgress({
      currentFile: processedFiles + 1,
      totalFiles,
      currentPercent: Math.round((processedFiles / totalFiles) * 100),
      status: 'processing',
      logs: currentLogs,
      etaSeconds,
      strategy,
      usage: translator.getUsage(),
      wordsPerSecond,
      totalProcessedWords: totalWordsProcessed,
      lastZipPathIndex: currentZipIdx,
      lastNodeIndex: currentNodeIdx
    });
  };

  updateProgress(getS(ui, 'found').replace('{0}', totalFiles.toString()));

  for (let zipIdx = processedFiles; zipIdx < processList.length; zipIdx++) {
    const item = processList[zipIdx];
    if (signal.aborted) throw new Error(getS(ui, 'stop'));

    const content = await epubZip.file(item.zipPath)?.async("string");
    if (!content) continue;

    const doc = parser.parseFromString(content, "application/xhtml+xml");
    const nodesToTranslate: Element[] = [];
    
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        if (settings.targetTags.includes(node.nodeName.toLowerCase())) {
          const textContent = node.textContent?.trim();
          if (textContent && textContent.length > 2) return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });

    while (walker.nextNode()) nodesToTranslate.push(walker.currentNode as Element);

    const startNodeIdx = (resumeFrom && zipIdx === resumeFrom.zipPathIndex) ? resumeFrom.nodeIndex : 0;

    let activePromises: Promise<void>[] = [];
    for (let i = startNodeIdx; i < nodesToTranslate.length; i++) {
        if (signal.aborted) throw new Error(getS(ui, 'stop'));
        
        const node = nodesToTranslate[i];
        const originalHtml = node.innerHTML;
        if (originalHtml.includes('<svg') || originalHtml.trim().length < 1) continue;

        const nodeWords = (node.textContent || "").split(/\s+/).filter(w => w.length > 0).length;

        const task = async () => {
            try {
                await delay(200 + Math.random() * 200); 
                await translator.translateSingle(originalHtml);
                if (signal.aborted) return;
                const translated = translator.getLastTranslation();
                node.innerHTML = translated;
                totalWordsProcessed += nodeWords;
            } catch (err) {
              if (err instanceof Error && (err.message.includes('429') || err.message.includes('quota'))) {
                throw err;
              }
            }
        };

        activePromises.push(task());

        if (activePromises.length >= CONCURRENCY_LIMIT || i === nodesToTranslate.length - 1) {
            await Promise.all(activePromises);
            activePromises = [];
            
            const elapsedMs = Date.now() - startTime;
            const currentOverallProgress = (zipIdx / totalFiles) + ((i / nodesToTranslate.length) * (1 / totalFiles));
            
            if (currentOverallProgress > 0) {
              const remainingMs = (elapsedMs / currentOverallProgress) - elapsedMs;
              const wps = (totalWordsProcessed / (elapsedMs / 1000));
              updateProgress(undefined, Math.round(remainingMs / 1000), wps, zipIdx, i);
            }
        }
    }

    const serializer = new XMLSerializer();
    const serializedDoc = serializer.serializeToString(doc);
    epubZip.file(item.zipPath, serializedDoc);
    processedFiles++;
  }

  // To ensure the output is identified as a pure EPUB and not a generic ZIP by browsers,
  // we use standard EPUB MIME type and ensure the internal structure is maintained.
  const epubBlob = await epubZip.generateAsync({ 
    type: "blob",
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
    compressionOptions: {
        level: 9
    }
  });

  updateProgress(getS(ui, 'pdf'));
  
  let pdfBlob = new Blob();
  try {
    pdfBlob = await generatePdfFromEpub(epubZip, metadata);
  } catch (pdfErr) {
    console.error("PDF generation failed:", pdfErr);
    updateProgress(getS(ui, 'pdfError'));
  }

  return { epubBlob, pdfBlob };
}
