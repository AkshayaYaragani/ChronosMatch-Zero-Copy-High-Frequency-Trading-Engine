import React, { useState, useEffect } from 'react';
import { FileCode, Copy, Check, Download, Folder, FileText, Terminal } from 'lucide-react';

interface SourceFile {
  name: string;
  path: string;
  description: string;
  content: string;
}

export const SourceCodeViewer: React.FC = () => {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/source-code')
      .then(res => res.json())
      .then(data => {
        setFiles(data);
        if (data.length > 0) setSelectedFile(data[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-12 text-center text-[#64748b] font-mono text-xs">
        Loading ChronosMatch source files...
      </div>
    );
  }

  return (
    <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg overflow-hidden shadow-xl font-mono flex flex-col md:flex-row h-[720px]">
      {/* File Tree Sidebar */}
      <div className="w-full md:w-64 bg-[#151926] border-r border-[#2a2e39] flex flex-col">
        <div className="p-3 border-b border-[#2a2e39] flex items-center gap-2">
          <Folder className="w-4 h-4 text-[#8ca0b4]" />
          <span className="text-xs font-bold text-slate-200">chronosmatch/</span>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {files.map((f) => {
            const isSelected = selectedFile?.name === f.name;
            const isCython = f.name.endsWith('.pyx');
            const isShell = f.name.endsWith('.sh');
            const isMd = f.name.endsWith('.md');

            return (
              <button
                key={f.name}
                onClick={() => setSelectedFile(f)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#1c2030] text-slate-100 font-semibold border border-[#3b4254]'
                    : 'text-[#64748b] hover:text-slate-200 hover:bg-[#1a1f2e] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {isCython ? (
                    <FileCode className="w-3.5 h-3.5 text-[#8ca0b4] shrink-0" />
                  ) : isShell ? (
                    <Terminal className="w-3.5 h-3.5 text-[#c29850] shrink-0" />
                  ) : isMd ? (
                    <FileText className="w-3.5 h-3.5 text-[#7da98f] shrink-0" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
                  )}
                  <span className="truncate">{f.name}</span>
                </div>
                {isCython && (
                  <span className="text-[9px] bg-[#1c2030] text-[#8ca0b4] px-1 rounded border border-[#2a2e39] uppercase">C-EXT</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Code Editor / Viewer */}
      <div className="flex-1 flex flex-col bg-[#11141e] overflow-hidden">
        {selectedFile && (
          <>
            {/* Top Bar */}
            <div className="p-3 border-b border-[#2a2e39] flex flex-wrap items-center justify-between gap-3 bg-[#151926]">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  {selectedFile.path}
                </span>
                <span className="text-[11px] text-[#64748b] mt-0.5 block">
                  {selectedFile.description}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#1c2030] text-slate-200 border border-[#2a2e39] hover:bg-[#232734] transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#7da98f]" /> : <Copy className="w-3.5 h-3.5 text-[#8ca0b4]" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#1c2030] text-slate-200 border border-[#2a2e39] hover:bg-[#232734] transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#8ca0b4]" />
                  <span>DOWNLOAD</span>
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed bg-[#0e111a] text-slate-300">
              <pre className="select-text whitespace-pre">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
