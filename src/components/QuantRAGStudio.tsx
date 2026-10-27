import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface RetrievedChunk {
  id: string;
  title: string;
  category: string;
  relevanceScore: number;
  relevancePct: number;
  matchedSnippet: string;
  sourceDoc: string;
  tags: string[];
}

interface RAGResponse {
  answer: string;
  retrievedChunks: RetrievedChunk[];
  telemetryIncluded: boolean;
  retrievalLatencyMs: number;
  totalLatencyMs: number;
  model: string;
}

interface RAGDocument {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  sourceDoc: string;
  updatedAt: string;
}

const PRESET_QUERIES = [
  'How does zero-copy 32-byte C-struct IPC achieve sub-50µs execution compared to TCP sockets?',
  'What causes liquidity voids during an algorithmic cascade like the 2010 Flash Crash?',
  'Analyze current live NVDA order book spread, top depth, and adverse selection risk.',
  'Explain how the IEX 350µs coiled fiber speed bump combats latency arbitrage.',
  'What are the queue position advantages in a Price-Time Priority FIFO Limit Order Book?'
];

export const QuantRAGStudio: React.FC = () => {
  const { isDark } = useTheme();

  // Query state
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [topK, setTopK] = useState(3);
  const [includeTelemetry, setIncludeTelemetry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RAGResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Document repository state
  const [activeSubView, setActiveSubView] = useState<'console' | 'corpus'>('console');
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  // New document form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('QUANT_STRATEGIES');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('ALGO, RISK');

  // Load knowledge corpus
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/rag/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (e) {
      console.warn('Failed to load RAG docs', e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleExecuteRAG = async (queryText?: string) => {
    const q = queryText || query;
    if (!q.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          topK,
          includeTelemetry,
          model: 'gemini-3.8-flash'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'RAG query failed');
      }

      setRagResult(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error executing RAG pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch('/api/rag/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          content: newContent,
          tags: tagsArray,
          sourceDoc: 'Custom User Ingestion'
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsIngestModalOpen(false);
        setNewTitle('');
        setNewContent('');
        fetchDocuments();
      }
    } catch (e) {
      console.error('Ingest failed', e);
    }
  };

  const filteredDocs = selectedCategory === 'ALL'
    ? documents
    : documents.filter(d => d.category === selectedCategory);

  return (
    <div
      className={`border rounded-xl p-4 transition-colors font-mono shadow-md ${
        isDark ? 'bg-[#131722] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2e39]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-500/15 text-violet-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-wider uppercase">
                QUANTITATIVE RAG INTELLIGENCE ENGINE
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1e2338] text-violet-300 border border-violet-700/50">
                RETRIEVAL-AUGMENTED
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Grounded AI reasoning combining domain-specific HFT memory, low-latency architecture & live telemetry
            </p>
          </div>
        </div>

        {/* View Switcher: Console vs Corpus */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#181d29] border border-[#2a2e39] text-xs">
          <button
            onClick={() => setActiveSubView('console')}
            className={`px-3 py-1 rounded font-bold transition flex items-center gap-1.5 text-[11px] ${
              activeSubView === 'console'
                ? 'bg-[#293652] text-slate-100 shadow-xs'
                : 'text-[#64748b] hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-violet-400" />
            <span>RAG QUERY CONSOLE</span>
          </button>
          <button
            onClick={() => setActiveSubView('corpus')}
            className={`px-3 py-1 rounded font-bold transition flex items-center gap-1.5 text-[11px] ${
              activeSubView === 'corpus'
                ? 'bg-[#293652] text-slate-100 shadow-xs'
                : 'text-[#64748b] hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>KNOWLEDGE CORPUS ({documents.length})</span>
          </button>
        </div>
      </div>

      {/* RAG Visual Pipeline Architecture Flow */}
      <div className="my-3.5 p-3 rounded-lg bg-[#181d29]/80 border border-[#2a2e39] overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] text-[10px] uppercase font-bold tracking-wider text-[#64748b]">
          <div className="flex items-center gap-2 p-2 rounded bg-[#131722] border border-[#2e3748] text-slate-200">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span>1. User Inquiry</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#64748b]" />

          <div className="flex items-center gap-2 p-2 rounded bg-[#131722] border border-[#2e3748] text-cyan-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. Semantic Retrieval</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#64748b]" />

          <div className="flex items-center gap-2 p-2 rounded bg-[#131722] border border-[#2e3748] text-emerald-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. Live LOB Telemetry</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#64748b]" />

          <div className="flex items-center gap-2 p-2 rounded bg-[#131722] border border-[#2e3748] text-amber-300">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>4. Grounded Context</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#64748b]" />

          <div className="flex items-center gap-2 p-2 rounded bg-[#131722] border border-[#2e3748] text-violet-300">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>5. Gemini 3.8 Flash</span>
          </div>
        </div>
      </div>

      {activeSubView === 'console' ? (
        <div className="space-y-4">
          {/* Preset Questions Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#8ca0b4] uppercase tracking-wider block">
              QUICK QUANT INQUIRIES
            </span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(preset);
                    handleExecuteRAG(preset);
                  }}
                  className="px-2.5 py-1 rounded bg-[#181d29] hover:bg-[#202738] border border-[#2a2e39] text-[#8ca0b4] hover:text-slate-100 transition text-[11px] text-left truncate max-w-full sm:max-w-md"
                >
                  › {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Main Query Bar */}
          <div className="p-3.5 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteRAG();
                }}
                placeholder="Ask any question grounded in our zero-copy IPC, LOB dynamics, or live market depth..."
                className="flex-1 bg-[#131722] border border-[#3b455c] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-[#64748b] focus:outline-none focus:border-violet-500 font-mono"
              />
              <button
                onClick={() => handleExecuteRAG()}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-98 shrink-0 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>RETRIEVING & SYNTHESIZING...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-3.5 h-3.5" />
                    <span>EXECUTE RAG</span>
                  </>
                )}
              </button>
            </div>

            {/* RAG Controls & Options */}
            <div className="flex flex-wrap items-center justify-between text-xs text-[#64748b] pt-1 border-t border-[#2a2e39]/50 gap-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTelemetry}
                    onChange={(e) => setIncludeTelemetry(e.target.checked)}
                    className="accent-violet-500 rounded"
                  />
                  <span className="text-[11px] font-semibold text-slate-300">
                    Inject Live LOB Telemetry
                  </span>
                </label>

                <div className="flex items-center gap-2 text-[11px]">
                  <span>Top-K Sources:</span>
                  <select
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value))}
                    className="bg-[#131722] border border-[#2a2e39] rounded px-1.5 py-0.5 text-slate-200"
                  >
                    <option value={1}>1 Chunk</option>
                    <option value={2}>2 Chunks</option>
                    <option value={3}>3 Chunks (Optimal)</option>
                    <option value={4}>4 Chunks</option>
                    <option value={5}>5 Chunks</option>
                  </select>
                </div>
              </div>

              {ragResult && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#7da98f]">
                  <span>Retrieval: {ragResult.retrievalLatencyMs}ms</span>
                  <span>•</span>
                  <span>Synthesis: {ragResult.totalLatencyMs}ms</span>
                  <span>•</span>
                  <span className="text-violet-300">{ragResult.model}</span>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* RAG Results Display: Split View (Answer + Retrieved Sources) */}
          {ragResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Synthesized Grounded Response */}
              <div className="lg:col-span-7 p-4 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span>GROUNDED RAG SYNTHESIS</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                    CITATIONS INCLUDED
                  </span>
                </div>

                <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                  {ragResult.answer}
                </div>
              </div>

              {/* Right Column: Retrieved Knowledge Chunks Inspector */}
              <div className="lg:col-span-5 p-4 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>RETRIEVED KNOWLEDGE CHUNKS ({ragResult.retrievedChunks.length})</span>
                  </span>
                  <span className="text-[10px] text-[#64748b]">
                    Ranked by similarity
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                  {ragResult.retrievedChunks.map((chunk, idx) => (
                    <div
                      key={chunk.id}
                      className="p-3 rounded-lg bg-[#131722] border border-[#283244] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-100 truncate pr-2">
                          #{idx + 1} {chunk.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                          {chunk.relevancePct}% MATCH
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] text-[#8ca0b4]">
                        <span className="px-1.5 py-0.2 rounded bg-[#1c2230] border border-[#2e3a4e]">
                          {chunk.category}
                        </span>
                        <span className="truncate">{chunk.sourceDoc}</span>
                      </div>

                      <p className="text-[11px] text-[#64748b] italic border-l-2 border-cyan-500/50 pl-2 mt-1">
                        "{chunk.matchedSnippet}"
                      </p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {chunk.tags.map((t, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-[#181e2b] text-[#64748b]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Document Knowledge Corpus Browser */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['ALL', 'SYSTEM_ARCHITECTURE', 'MARKET_MICROSTRUCTURE', 'QUANT_STRATEGIES', 'ANOMALIES_AND_RISK', 'USER_RULES'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    selectedCategory === cat
                      ? 'bg-[#293652] text-slate-100 border border-[#3f5379]'
                      : 'bg-[#181d29] text-[#64748b] hover:text-slate-200 border border-[#2a2e39]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsIngestModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>INGEST CUSTOM QUANT DOC</span>
            </button>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-100">{doc.title}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-[#1c2230] text-[#7da98f] border border-[#2e3b4e] font-semibold">
                    {doc.category}
                  </span>
                </div>

                <p className="text-[11px] text-[#64748b] leading-relaxed line-clamp-3">
                  {doc.content}
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-2 border-t border-[#2a2e39]/50">
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.2 rounded bg-[#131722] text-[#8ca0b4]">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingest Document Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-mono">
          <div
            className={`w-full max-w-lg rounded-xl border shadow-2xl p-5 space-y-4 ${
              isDark ? 'bg-[#181d29] border-[#2e3748] text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <h3 className="font-bold text-xs uppercase tracking-wider">
                INGEST CUSTOM QUANTITATIVE DOCUMENT
              </h3>
              <button
                onClick={() => setIsIngestModalOpen(false)}
                className="text-[#64748b] hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIngestDocument} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#8ca0b4] uppercase block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Risk Limits for Sub-Millisecond Execution"
                  className="w-full bg-[#131722] border border-[#374256] rounded p-2 text-slate-100 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ca0b4] uppercase block mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#131722] border border-[#374256] rounded p-2 text-slate-100 text-xs"
                >
                  <option value="QUANT_STRATEGIES">QUANT_STRATEGIES</option>
                  <option value="SYSTEM_ARCHITECTURE">SYSTEM_ARCHITECTURE</option>
                  <option value="MARKET_MICROSTRUCTURE">MARKET_MICROSTRUCTURE</option>
                  <option value="ANOMALIES_AND_RISK">ANOMALIES_AND_RISK</option>
                  <option value="USER_RULES">USER_RULES</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8ca0b4] uppercase block mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full bg-[#131722] border border-[#374256] rounded p-2 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8ca0b4] uppercase block mb-1">
                  Document Content (Markdown / Text)
                </label>
                <textarea
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write proprietary rules, mathematical formulas, or execution guidelines..."
                  className="w-full bg-[#131722] border border-[#374256] rounded p-2 text-slate-100 text-xs font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2a2e39]">
                <button
                  type="button"
                  onClick={() => setIsIngestModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-[#131722] text-[#64748b] hover:text-slate-200"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  INDEX DOCUMENT INTO RAG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
