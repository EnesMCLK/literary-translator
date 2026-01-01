
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
    analyzing: "Yapay zeka yazar üslubunu ve kitabın ruhunu analiz ediyor...",
    found: "Kitap içerisinde {0} bölüm tespit edildi.",
    starting: "Çeviri işlemi başlatılıyor...",
    resuming: "Kaldığı yerden devam ediliyor...",
    pdf: "PDF dokümanı oluşturuluyor...",
    pdfError: "Hata: PDF oluşturulamadı, ancak EPUB hazır.",
    stop: "İşlem durduruldu.",
    quotaExceeded: "Kota sınırı aşıldı! 60 saniye bekleniyor...",
    finished: "Çeviri başarıyla tamamlandı!",
    saving: "Dosya kaydediliyor: {0}",
    processingFile: "İşleniyor: {0} ({1}/{2})"
  },
  en: {
    analyzing: "AI is analyzing author's style and book's soul...",
    found: "{0} sections detected in the book.",
    starting: "Starting translation process...",
    resuming: "Resuming translation from saved point...",
    pdf: "Generating PDF document...",
    pdfError: "Error: Could not generate PDF, but EPUB is ready.",
    stop: "Process stopped by user.",
    quotaExceeded: "Quota exceeded! Waiting 60 seconds...",
    finished: "Translation completed successfully!",
    saving: "Saving file: {0}",
    processingFile: "Processing: {0} ({1}/{2})"
  },
  zh: {
    analyzing: "AI 正在分析作者风格和书籍灵魂...",
    found: "在书籍结构中检测到 {0} 个章节。",
    starting: "开始翻译流程...",
    resuming: "从保存点恢复翻译...",
    pdf: "正在生成 PDF 文档...",
    pdfError: "错误：无法生成 PDF，但 EPUB 已就绪。",
    stop: "用户已停止进程。",
    quotaExceeded: "配额已超限！等待 60 秒...",
    finished: "翻译成功完成！",
    saving: "正在保存文件：{0}",
    processingFile: "正在处理：{0} ({1}/{2})"
  },
  fr: {
    analyzing: "L'IA analyse le style de l'auteur et l'âme du livre...",
    found: "{0} sections détectées dans le livre.",
    starting: "Démarrage du processus de traduction...",
    resuming: "Reprise de la traduction...",
    pdf: "Génération du document PDF...",
    pdfError: "Erreur : Impossible de générer le PDF, mais l'EPUB est prêt.",
    stop: "Processus arrêté par l'utilisateur.",
    quotaExceeded: "Quota dépassé ! Attente de 60 secondes...",
    finished: "Traduction terminée avec succès !",
    saving: "Enregistrement du fichier : {0}",
    processingFile: "Traitement : {0} ({1}/{2})"
  },
  de: {
    analyzing: "KI analysiert den Stil des Autors und die Seele des Buches...",
    found: "{0} Abschnitte im Buch erkannt.",
    starting: "Übersetzungsprozess wird gestartet...",
    resuming: "Übersetzung wird fortgesetzt...",
    pdf: "PDF-Dokument wird generiert...",
    pdfError: "Fehler: PDF konnte nicht erstellt werden, EPUB ist jedoch bereit.",
    stop: "Vorgang vom Benutzer gestoppt.",
    quotaExceeded: "Kontingent überschritten! Warte 60 Sekunden...",
    finished: "Übersetzung erfolgreich abgeschlossen!",
    saving: "Datei wird gespeichert: {0}",
    processingFile: "Verarbeitung: {0} ({1}/{2})"
  },
  es: {
    analyzing: "La IA está analizando el estilo del autor y el alma del libro...",
    found: "Se detectaron {0} secciones en el libro.",
    starting: "Iniciando proceso de traducción...",
    resuming: "Reanudando traducción...",
    pdf: "Generando documento PDF...",
    pdfError: "Error: No se pudo generar el PDF, pero el EPUB está listo.",
    stop: "Proceso detenido por el usuario.",
    quotaExceeded: "¡Cuota excedida! Esperando 60 segundos...",
    finished: "¡Traducción completada con éxito!",
    saving: "Guardando archivo: {0}",
    processingFile: "Procesando: {0} ({1}/{2})"
  },
  ru: {
    analyzing: "ИИ анализирует стиль автора и душу книги...",
    found: "В структуре книги обнаружено {0} разделов.",
    starting: "Запуск процесса перевода...",
    resuming: "Возобновление перевода...",
    pdf: "Генерация PDF-документа...",
    pdfError: "Ошибка: не удалось создать PDF, но EPUB готов.",
    stop: "Процесс остановлен пользователем.",
    quotaExceeded: "Квота превышена! Ожидание 60 секунд...",
    finished: "Перевод успешно завершен!",
    saving: "Сохранение файла: {0}",
    processingFile: "Обработка: {0} ({1}/{2})"
  },
  it: {
    analyzing: "L'IA sta analizzando lo stile dell'autore e l'anima del libro...",
    found: "Rilevate {0} sezioni nel libro.",
    starting: "Avvio del processo di traduzione...",
    resuming: "Ripresa della traduzione...",
    pdf: "Generazione del documento PDF...",
    pdfError: "Errore: impossibile generare il PDF, ma l'EPUB è pronto.",
    stop: "Processo interrotto dall'utente.",
    quotaExceeded: "Quota superata! Attesa di 60 secondi...",
    finished: "Traduzione completata con successo!",
    saving: "Salvataggio file: {0}",
    processingFile: "In corso: {0} ({1}/{2})"
  },
  ja: {
    analyzing: "AI が著者のスタイルと本の魂を分析しています...",
    found: "本の中に {0} のセクションが検出されました。",
    starting: "翻訳プロセスを開始しています...",
    resuming: "翻訳を再開しています...",
    pdf: "PDF ドキュメントを生成中...",
    pdfError: "エラー: PDF を生成できませんでしたが、EPUB の準備はできています。",
    stop: "ユーザーによってプロセスが停止されました。",
    quotaExceeded: "クォータ制限超過！60 秒待機中...",
    finished: "翻訳が正常に完了しました！",
    saving: "ファイルを保存中: {0}",
    processingFile: "処理中: {0} ({1}/{2})"
  },
  ko: {
    analyzing: "AI가 저자의 스타일과 책의 영혼을 분석하고 있습니다...",
    found: "도서 구조에서 {0}개의 섹션이 감지되었습니다.",
    starting: "번역 프로세스를 시작합니다...",
    resuming: "번역을 재개합니다...",
    pdf: "PDF 문서를 생성하는 중...",
    pdfError: "오류: PDF를 생성할 수 없지만 EPUB는 준비되었습니다.",
    stop: "사용자에 의해 프로세스가 중지되었습니다.",
    quotaExceeded: "할당량 초과! 60초 대기 중...",
    finished: "번역이 성공적으로 완료되었습니다!",
    saving: "파일 저장 중: {0}",
    processingFile: "처리 중: {0} ({1}/{2})"
  },
  ar: {
    analyzing: "الذكاء الاصطناعي يحلل أسلوب المؤلف وروح الكتاب...",
    found: "تم اكتشاف {0} أقسام في الكتاب.",
    starting: "بدء عملية الترجمة...",
    resuming: "استئناف الترجمة من النقطة المحفوظة...",
    pdf: "جاري إنشاء مستند PDF...",
    pdfError: "خطأ: تعذر إنشاء ملف PDF، ولكن ملف EPUB جاهز.",
    stop: "تم إيقاف العملية من قبل المستخدم.",
    quotaExceeded: "تم تجاوز الحصة! الانتظار لمدة 60 ثانية...",
    finished: "اكتملت الترجمة بنجاح!",
    saving: "جاري حفظ الملف: {0}",
    processingFile: "جاري المعالجة: {0} ({1}/{2})"
  },
  pt: {
    analyzing: "A IA está a analisar o estilo do autor e a alma do livro...",
    found: "Foram detetadas {0} secções no livro.",
    starting: "A iniciar o processo de tradução...",
    resuming: "A retomar a tradução...",
    pdf: "A gerar documento PDF...",
    pdfError: "Erro: Não foi possível gerar o PDF, mas o EPUB está pronto.",
    stop: "Processo interrompido pelo utilizador.",
    quotaExceeded: "Quota excedida! A aguardar 60 segundos...",
    finished: "Tradução concluída com sucesso!",
    saving: "A guardar ficheiro: {0}",
    processingFile: "A processar: {0} ({1}/{2})"
  },
  nl: {
    analyzing: "AI analyseert de stijl van de auteur en de ziel van het boek...",
    found: "{0} secties gedetecteerd in het boek.",
    starting: "Vertaalproces wordt gestart...",
    resuming: "Vertaling wordt hervat...",
    pdf: "PDF-document wordt gegenereerd...",
    pdfError: "Fout: PDF kon niet worden gegenereerd, maar EPUB is gereed.",
    stop: "Proces gestopt door gebruiker.",
    quotaExceeded: "Quota overschreden! 60 seconden wachten...",
    finished: "Vertaling succesvol voltooid!",
    saving: "Bestand opslaan: {0}",
    processingFile: "Verwerken: {0} ({1}/{2})"
  },
  pl: {
    analyzing: "AI analizuje styl autora i duszę książki...",
    found: "W książce wykryto {0} sekcji.",
    starting: "Rozpoczynanie procesu tłumaczenia...",
    resuming: "Wznawianie tłumaczenia...",
    pdf: "Generowanie dokumentu PDF...",
    pdfError: "Błąd: Nie można wygenerować pliku PDF, ale EPUB jest gotowy.",
    stop: "Proces zatrzymany przez użytkownika.",
    quotaExceeded: "Limit przekroczony! Oczekiwanie 60 sekund...",
    finished: "Tłumaczenie zakończone sukcesem!",
    saving: "Zapisywanie pliku: {0}",
    processingFile: "Przetwarzanie: {0} ({1}/{2})"
  },
  hi: {
    analyzing: "AI लेखक की शैली और पुस्तक की आत्मा का विश्लेषण कर रहा है...",
    found: "पुस्तक में {0} अनुभागों का पता चला।",
    starting: "अनुवाद प्रक्रिया शुरू हो रही है...",
    resuming: "अनुवाद फिर से शुरू किया जा रहा है...",
    pdf: "PDF दस्तावेज़ तैयार किया जा रहा है...",
    pdfError: "त्रुटि: PDF जनरेट नहीं किया जा सका, लेकिन EPUB तैयार है।",
    stop: "उपयोगकर्ता द्वारा प्रक्रिया रोक दी गई।",
    quotaExceeded: "कोटा समाप्त! 60 सेकंड प्रतीक्षा कर रहे हैं...",
    finished: "अनुवाद सफलतापूर्वक पूरा हुआ!",
    saving: "फ़ाइल सहेजी जा रही है: {0}",
    processingFile: "प्रसंस्करण: {0} ({1}/{2})"
  },
  vi: {
    analyzing: "AI đang phân tích phong cách của tác giả và linh hồn của cuốn sách...",
    found: "Tìm thấy {0} phần trong cuốn sách.",
    starting: "Bắt đầu quá trình dịch...",
    resuming: "Tiếp tục dịch từ điểm đã lưu...",
    pdf: "Đang tạo tài liệu PDF...",
    pdfError: "Lỗi: Không thể tạo PDF, nhưng EPUB đã sẵn sàng.",
    stop: "Quá trình bị người dùng dừng lại.",
    quotaExceeded: "Hết hạn mức! Đang chờ 60 giây...",
    finished: "Dịch hoàn tất thành công!",
    saving: "Đang lưu tệp: {0}",
    processingFile: "Đang xử lý: {0} ({1}/{Vietnamese 2})"
  }
};

function getLogStr(uiLang: string, key: string): string {
  const bundle = STRINGS_LOGS[uiLang] || STRINGS_LOGS['en'];
  return bundle[key] || STRINGS_LOGS['en'][key];
}

async function generatePdfFromEpub(epubZip: JSZip, metadata: any): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const contentWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
  let cursorY = 40;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text(pdf.splitTextToSize(metadata.title || "Untitled", contentWidth), margin, 60);
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
  const spineItems = Array.from(opfDoc.querySelectorAll("spine > itemref"));
  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  
  const idToHref: Record<string, string> = {};
  manifestItems.forEach(item => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) idToHref[id] = href;
  });

  pdf.setFont('times', 'normal');
  pdf.setFontSize(11);

  for (const item of spineItems) {
    const idref = item.getAttribute("idref");
    if (!idref || !idToHref[idref]) continue;
    
    const href = idToHref[idref];
    const fullPath = opfFolder ? `${opfFolder}/${href}` : href;
    const html = await epubZip.file(fullPath)?.async("string");
    if (!html) continue;

    const doc = parser.parseFromString(html, "text/html");
    const targetNodes = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
    
    for (const el of Array.from(targetNodes)) {
      const text = el.textContent?.trim() || "";
      if (!text) continue;
      
      const isHeader = el.tagName.startsWith('H');
      pdf.setFont('times', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(isHeader ? 14 : 11);

      const lines = pdf.splitTextToSize(text, contentWidth);
      const h = lines.length * (isHeader ? 7 : 5);
      
      if (cursorY + h > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        cursorY = margin;
      }
      pdf.text(lines, margin, cursorY);
      cursorY += h + 4;
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
  const translator = new GeminiTranslator(settings.temperature, settings.sourceLanguage, settings.targetLanguage, settings.modelId);
  const epubZip = await new JSZip().loadAsync(await file.arrayBuffer());

  const containerXml = await epubZip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) throw new Error("Invalid EPUB: Missing container.xml");

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "application/xml");
  const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("Invalid EPUB: OPF path missing");

  const opfContent = await epubZip.file(opfPath)?.async("string");
  const opfDoc = parser.parseFromString(opfContent || "", "application/xml");
  const opfFolder = opfPath.substring(0, opfPath.lastIndexOf('/'));

  const metadata = {
    title: opfDoc.querySelector("dc\\:title, title")?.textContent || "Unknown",
    creator: opfDoc.querySelector("dc\\:creator, creator")?.textContent || "Unknown",
    description: opfDoc.querySelector("dc\\:description, description")?.textContent || ""
  };

  onProgress({
    currentFile: 0, totalFiles: 0, currentPercent: 0, status: 'analyzing',
    logs: [{ timestamp: new Date().toLocaleTimeString(), text: getLogStr(ui, 'analyzing') }]
  });

  const strategy = await translator.analyzeBook(metadata, undefined, ui);
  translator.setStrategy(strategy);

  const spineItems = Array.from(opfDoc.querySelectorAll("spine > itemref"));
  const manifestItems = Array.from(opfDoc.querySelectorAll("manifest > item"));
  const idToHref: Record<string, string> = {};
  manifestItems.forEach(item => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) idToHref[id] = href;
  });

  const processList = spineItems.map(item => {
    const idref = item.getAttribute("idref");
    if (!idref || !idToHref[idref]) return null;
    const href = idToHref[idref];
    return opfFolder ? `${opfFolder}/${href}` : href;
  }).filter(p => p && epubZip.file(p)) as string[];

  let totalWords = 0;
  let processedFiles = resumeFrom ? resumeFrom.zipPathIndex : 0;
  const translatedNodes: Record<string, string[]> = resumeFrom ? { ...resumeFrom.translatedNodes } : {};
  const startTime = Date.now();

  const updateProgressUI = (msg?: string, currentPercent?: number, wps?: number, eta?: number, zipIdx?: number, nodeIdx?: number) => {
    onProgress({
      currentFile: (zipIdx !== undefined ? zipIdx + 1 : processedFiles + 1),
      totalFiles: processList.length,
      currentPercent: currentPercent ?? Math.round((processedFiles / processList.length) * 100),
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

  updateProgressUI(getLogStr(ui, 'found').replace('{0}', processList.length.toString()));

  for (let zipIdx = processedFiles; zipIdx < processList.length; zipIdx++) {
    const path = processList[zipIdx];
    if (signal.aborted) throw new Error(getLogStr(ui, 'stop'));

    updateProgressUI(getLogStr(ui, 'processingFile').replace('{0}', path).replace('{1}', (zipIdx + 1).toString()).replace('{2}', processList.length.toString()));

    const content = await epubZip.file(path)?.async("string");
    if (!content) continue;

    // EPUB XHTML için application/xhtml+xml önemli
    const doc = parser.parseFromString(content, "application/xhtml+xml");
    const root = doc.body || doc.documentElement;
    
    // Kullanıcı tarafından seçilen etiketleri tam olarak filtrele
    const selectors = settings.targetTags.join(',');
    const nodes = Array.from(root.querySelectorAll(selectors));
    
    if (!translatedNodes[path]) translatedNodes[path] = [];
    const startNodeIdx = (resumeFrom && zipIdx === resumeFrom.zipPathIndex) ? resumeFrom.nodeIndex : 0;

    for (let nodeIdx = startNodeIdx; nodeIdx < nodes.length; nodeIdx++) {
      if (signal.aborted) throw new Error(getLogStr(ui, 'stop'));
      const node = nodes[nodeIdx];
      
      if (translatedNodes[path][nodeIdx]) {
        node.innerHTML = translatedNodes[path][nodeIdx];
        continue;
      }

      const htmlToTranslate = node.innerHTML.trim();
      if (!htmlToTranslate || htmlToTranslate.length < 1) continue;
      
      try {
        const translated = await translator.translateSingle(htmlToTranslate);
        
        if (translated && translated !== htmlToTranslate) {
          node.innerHTML = translated;
          translatedNodes[path][nodeIdx] = translated;
          totalWords += (node.textContent || "").split(/\s+/).filter(Boolean).length;
        }

        // Ara istatistikler
        if (nodeIdx % 5 === 0 || nodeIdx === nodes.length - 1) {
          const elapsed = (Date.now() - startTime) / 1000;
          const wps = totalWords / elapsed;
          const fileStep = 1 / processList.length;
          const currentFilePercent = (nodeIdx + 1) / nodes.length;
          const overallPercent = Math.round(((zipIdx + currentFilePercent) / processList.length) * 100);
          
          updateProgressUI(undefined, overallPercent, wps, undefined, zipIdx, nodeIdx);
        }
      } catch (err: any) {
        if (err.message?.includes('429') || err.message?.includes('quota')) {
          updateProgressUI(getLogStr(ui, 'quotaExceeded'));
          await new Promise(r => setTimeout(r, 60000));
          nodeIdx--; // Geri sar ve tekrar dene
          continue;
        }
        console.warn(`Translation skip in ${path} node ${nodeIdx}:`, err);
      }
    }

    // XHTML standartlarına uygun serileştirme ve zipe yazma
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(doc);
    epubZip.file(path, serialized);
    processedFiles++;
  }

  // Final dosyaları üret
  const epubBlob = await epubZip.generateAsync({ 
    type: "blob", 
    mimeType: "application/epub+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  updateProgressUI(getLogStr(ui, 'pdf'));
  let pdfBlob = new Blob([], { type: 'application/pdf' });
  try {
    pdfBlob = await generatePdfFromEpub(epubZip, metadata);
  } catch (pdfErr) {
    updateProgressUI(getLogStr(ui, 'pdfError'));
  }

  onProgress({
    currentFile: processList.length, totalFiles: processList.length, currentPercent: 100,
    status: 'completed', logs: [{ timestamp: new Date().toLocaleTimeString(), text: getLogStr(ui, 'finished') }],
    strategy, usage: translator.getUsage()
  });

  return { epubBlob, pdfBlob };
}
