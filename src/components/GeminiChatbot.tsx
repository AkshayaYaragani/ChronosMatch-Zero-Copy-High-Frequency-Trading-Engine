import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  RefreshCw,
  Cpu,
  Layers,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  groundingChunks?: {
    web?: {
      uri: string;
      title: string;
    };
  }[];
  modelUsed?: string;
}

interface GeminiChatbotProps {
  currentSymbol?: string;
  currentSpread?: number;
  currentTps?: number;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  currentSymbol = 'NVDA',
  currentSpread = 0.02,
  currentTps = 24800
}) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Greetings. I am **Chronos AI**, your quantitative algorithmic advisor and low-latency systems architect.

I am wired directly to the ChronosMatch matching telemetry and backed by **Google Search Grounding** for live macro intelligence. Ask me about:
- Live market news, earnings impact, and liquidity depth on **${currentSymbol}**
- Microstructure analysis: Whale sweeps, order book imbalance, and iceberg execution
- Systems engineering: POSIX \`mmap\` zero-copy IPC, CPU isolation, and sub-50µs execution`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Prepare payload with conversation history
      const historyPayload = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          model: selectedModel,
          useSearch: useSearchGrounding
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with Chronos AI');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'No response returned.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingChunks: data.groundingChunks || [],
        modelUsed: data.model || selectedModel
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Transmission Error**: ${err?.message || 'Could not connect to Gemini API. Ensure server has GEMINI_API_KEY injected.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    `Search latest news and earnings expectations for ${currentSymbol}`,
    `Explain how ChronosMatch achieves zero-copy IPC using mmap ring buffers`,
    `What is the difference between maker rebate and taker fees in HFT?`,
    `How does isolcpus and Hugepages prevent kernel context-switch jitter?`
  ];

  return (
    <div
      className={`border rounded-xl shadow-xl font-mono flex flex-col h-[720px] overflow-hidden text-xs transition-colors duration-200 ${
        isDark ? 'bg-[#1c2030] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Chat Header */}
      <div
        className={`p-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg border ${
              isDark ? 'bg-[#1c2030] border-[#2a2e39] text-[#7da98f]' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">CHRONOS QUANT AI</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                  isDark
                    ? 'bg-[#1a2620] text-[#7da98f] border-[#2a4434]'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                GROUNDED
              </span>
            </div>
            <p className="text-[10px] text-[#64748b]">
              Context: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{currentSymbol}</strong> | Spread: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>${currentSpread.toFixed(2)}</strong> | Speed: <strong className={isDark ? 'text-[#7da98f]' : 'text-emerald-700'}>{currentTps.toLocaleString()} TPS</strong>
            </p>
          </div>
        </div>

        {/* Controls: Model Selector & Search Grounding Toggle */}
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div
            className={`flex items-center gap-1 border rounded p-1 text-[11px] ${
              isDark ? 'bg-[#1c2030] border-[#2a2e39]' : 'bg-white border-slate-300'
            }`}
          >
            <span className="text-[#64748b] px-1 text-[10px]">Model:</span>
            {(['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'] as const).map(m => (
              <button
                key={m}
                onClick={() => setSelectedModel(m)}
                className={`px-2 py-0.5 rounded transition ${
                  selectedModel === m
                    ? isDark
                      ? 'bg-[#2a3444] text-slate-100 font-bold border border-[#3d4b60]'
                      : 'bg-slate-100 text-slate-900 font-bold border border-slate-300'
                    : 'text-[#64748b] hover:text-slate-300'
                }`}
              >
                {m === 'gemini-3.8-flash' ? '3.8 Flash' : m === 'gemini-3.1-flash-lite' ? '3.1 Lite' : '4 Argon'}
              </button>
            ))}
          </div>

          {/* Google Search Grounding Toggle */}
          <button
            onClick={() => setUseSearchGrounding(!useSearchGrounding)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition ${
              useSearchGrounding
                ? isDark
                  ? 'bg-[#151926] text-[#7da98f] border-[#384a3e]'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : isDark
                ? 'bg-[#151926] text-[#64748b] border-[#2a2e39] hover:text-slate-300'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
            title="Grounds responses with real-time Google Search data & live news citations"
          >
            <Globe className="w-3.5 h-3.5 text-[#7da98f]" />
            <span>Search Grounding: {useSearchGrounding ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className={`flex-1 p-4 overflow-y-auto space-y-4 ${isDark ? 'bg-[#1c2030]' : 'bg-white'}`}>
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                  isUser
                    ? isDark
                      ? 'bg-[#2a3444] border-[#3d4b60] text-slate-200'
                      : 'bg-blue-600 border-blue-700 text-white'
                    : isDark
                    ? 'bg-[#151926] border-[#2a2e39] text-[#7da98f]'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`rounded-lg p-3 text-xs leading-relaxed space-y-2 border ${
                  isUser
                    ? isDark
                      ? 'bg-[#1c2434] border-[#2f3d56] text-slate-100'
                      : 'bg-blue-50 border-blue-200 text-slate-900'
                    : isDark
                    ? 'bg-[#151926] border-[#2a2e39] text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-4 text-[10px] text-[#64748b] pb-1 border-b ${
                    isDark ? 'border-[#222938]' : 'border-slate-200'
                  }`}
                >
                  <span>{isUser ? 'QUANT TRADER' : 'CHRONOS AI ARCHITECT'}</span>
                  <div className="flex items-center gap-2">
                    {m.modelUsed && (
                      <span
                        className={`px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'text-[#8ca0b4] bg-[#1c2030] border-[#2a2e39]'
                            : 'text-blue-700 bg-white border-slate-200'
                        }`}
                      >
                        {m.modelUsed}
                      </span>
                    )}
                    <span>{m.timestamp}</span>
                  </div>
                </div>

                {/* Message Body with Markdown-like presentation */}
                <div className="whitespace-pre-wrap font-sans">
                  {m.content}
                </div>

                {/* Grounding Sources / Search Citations */}
                {m.groundingChunks && m.groundingChunks.length > 0 && (
                  <div
                    className={`pt-2 mt-2 border-t space-y-1 ${
                      isDark ? 'border-[#222938]' : 'border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] text-[#8ca0b4] flex items-center gap-1 uppercase tracking-wider font-mono">
                      <Search className="w-3 h-3 text-[#7da98f]" />
                      Google Search Grounding Sources:
                    </span>
                    <div className="flex flex-wrap gap-1.5 font-mono">
                      {m.groundingChunks.map((chunk, idx) => {
                        if (!chunk.web?.uri) return null;
                        return (
                          <a
                            key={`chunk-${idx}`}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition border ${
                              isDark
                                ? 'bg-[#1c2030] hover:bg-[#252a38] text-[#7da98f] border-[#2a2e39] hover:border-[#384a3e]'
                                : 'bg-white hover:bg-slate-100 text-blue-700 border-slate-300'
                            }`}
                          >
                            <span className="truncate max-w-[200px]">{chunk.web.title || chunk.web.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                isDark ? 'bg-[#151926] border-[#2a2e39] text-[#7da98f]' : 'bg-slate-100 border-slate-200 text-blue-600'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div
              className={`border rounded-lg p-3 text-xs flex items-center gap-2 ${
                isDark ? 'bg-[#151926] border-[#2a2e39] text-[#8ca0b4]' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#7da98f]" />
              <span>
                {useSearchGrounding ? 'Consulting Google Search & analyzing market data...' : 'Generating quantitative analysis...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div
        className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar ${
          isDark ? 'border-[#2a2e39] bg-[#151926]/60' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <span className="text-[10px] text-[#64748b] whitespace-nowrap uppercase tracking-wider">Quick:</span>
        {quickPrompts.map((p, i) => (
          <button
            key={`prompt-${i}`}
            onClick={() => handleSendMessage(p)}
            className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition border ${
              isDark
                ? 'bg-[#1c2030] hover:bg-[#252a38] text-[#8ca0b4] hover:text-slate-100 border-[#2a2e39]'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className={`p-3 border-t flex items-center gap-2 ${
          isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-slate-200 bg-white'
        }`}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask Chronos AI about ${currentSymbol}, macro news, HFT algorithms, or low-latency systems...`}
          className={`flex-1 border rounded px-3 py-2 text-xs focus:outline-none transition ${
            isDark
              ? 'bg-[#1c2030] border-[#2a2e39] text-slate-100 placeholder-[#64748b] focus:border-[#4e8a72]'
              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
          }`}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded bg-[#7da98f] hover:bg-[#68987b] text-slate-950 font-bold flex items-center gap-1.5 transition disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5 text-slate-950" />
          <span>SEND</span>
        </button>
      </form>
    </div>
  );
};
