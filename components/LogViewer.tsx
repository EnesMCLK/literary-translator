
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../services/epubService';

interface LogViewerProps {
  logs: LogEntry[];
  readyText: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, readyText }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 italic font-medium flex items-center gap-2 select-none h-full justify-center">
        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
        {readyText}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-slate-900 dark:text-slate-100 pb-4">
      {logs.map((log, index) => (
        <div 
          key={index} 
          className="group flex gap-3 border-l-2 border-slate-100 dark:border-slate-800 pl-3 py-1 break-all hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:border-indigo-400 transition-all rounded-r-lg"
        >
          <span className="text-indigo-500 dark:text-indigo-400 font-bold shrink-0 font-mono text-[9px] mt-1 tracking-tighter uppercase">
            {log.timestamp}
          </span>
          <span className="leading-relaxed font-medium text-[12px] tracking-wide text-slate-700 dark:text-slate-200">
            {log.text}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
