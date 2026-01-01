
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../services/epubService';

interface LogViewerProps {
  logs: LogEntry[];
  readyText: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, readyText }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sadece kullanıcı yukarı kaydırmamışsa otomatik kaydır
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // Eğer kullanıcı en alttan 100px içerisindeyse otomatik kaydırmaya devam et
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isAtBottom) {
        // scrollIntoView yerine element bazlı scrollTo kullanarak sayfanın zıplamasını engelliyoruz
        containerRef.current.scrollTo({
          top: scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 italic font-medium flex items-center gap-2 select-none h-full justify-center">
        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
        {readyText}
      </div>
    );
  }

  const getTypeStyles = (type?: string) => {
    switch (type) {
      case 'success': return 'border-green-500 text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-950/10';
      case 'error': return 'border-red-500 text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-950/10';
      case 'warning': return 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10';
      case 'live': return 'border-indigo-400 text-slate-500 dark:text-slate-400 border-dashed italic opacity-80';
      default: return 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200';
    }
  };

  return (
    <div ref={containerRef} className="h-full overflow-y-auto custom-scrollbar px-1">
      <div className="space-y-2 pb-4">
        {logs.map((log, index) => (
          <div 
            key={index} 
            className={`group flex gap-3 border-l-2 pl-3 py-1.5 break-all transition-all rounded-r-lg hover:brightness-105 ${getTypeStyles(log.type)}`}
          >
            <span className="font-mono text-[8px] md:text-[9px] opacity-40 shrink-0 mt-0.5 select-none uppercase tracking-tighter">
              {log.timestamp}
            </span>
            <span className={`leading-relaxed text-[11px] md:text-[12px] tracking-wide font-medium ${log.type === 'live' ? 'font-serif' : 'font-sans'}`}>
              {log.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
