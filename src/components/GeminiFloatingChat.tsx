import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Send,
  Sparkles,
  Bot,
  User,
  Globe,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  Cpu,
  Zap,
  TrendingUp,
  AlertCircle
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

interface GeminiFloatingChatProps {
  currentSymbol?: string;
  currentSpread?: number;
  currentTps?: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const GeminiFloatingChat: React.FC<GeminiFloatingChatProps> = ({
  currentSymbol = 'NVDA',
  currentSpread = 0.02,
  currentTps = 24800,
  isOpen: controlledIsOpen,
  onOpenChange
}) => {
  const { isDark } = useTheme();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    else setInternalIsOpen(val);
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am **Chronos AI**, your Quant Advisor and Ultra-Low-Latency Systems Architect.
      
I am connected live to **${currentSymbol}** order book telemetry and backed by **Google Search Grounding**. Ask me about real-time market catalysts, liquidity sweeps, or zero-copy C-struct matching!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading]);

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
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Transmission Error**: ${err?.message || 'Could not connect to Gemini API. Check network or server logs.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation reset. Ready for your quant trading & kernel architecture questions on **${currentSymbol}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickPrompts = [
    `Latest news & analyst targets for ${currentSymbol}`,
    `How does zero-copy mmap compare to JSON serialization?`,
    `Explain whale sweep detection logic in ChronosMatch`,
    `What causes CPU cache-line bouncing in high-rate LOBs?`
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono">
      {/* Floating Launcher Button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-[#1c2030] hover:bg-[#252c42] text-slate-100 border border-[#3b455c]'
              : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-slate-300/50'
          }`}
          title="Open Chronos Gemini AI Chatbot"
        >
          {/* Animated glow / ping */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7da98f] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#5b9a78] border border-white dark:border-[#131722]"></span>
          </span>

          <div className="p-1 rounded-full bg-[#7da98f]/20 text-[#7da98f]">
            <Sparkles className="w-5 h-5 text-[#7da98f]" />
          </div>

          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold flex items-center gap-1.5 leading-none">
              <span>CHRONOS AI</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#7da98f]/20 text-[#7da98f] font-mono">
                GROUNDED
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Ask Quant & Market News</span>
          </div>

          <Bot className="w-5 h-5 sm:hidden text-[#8ca0b4]" />
        </button>
      )}

      {/* Dynamic Pop-Open Chat Window */}
      {isOpen && (
        <div
          className={`flex flex-col transition-all duration-300 ease-out shadow-2xl rounded-2xl overflow-hidden border ${
            isExpanded
              ? 'fixed inset-3 sm:inset-10 z-50 max-w-none max-h-none'
              : 'w-[calc(100vw-32px)] sm:w-[460px] h-[580px] max-h-[calc(100vh-80px)]'
          } ${
            isDark
              ? 'bg-[#181c28] border-[#2f374a] text-slate-200'
              : 'bg-white border-slate-300 text-slate-800 shadow-2xl'
          }`}
          style={{ animation: 'chatPopOpen 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Header Bar */}
          <div
            className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-[#1c2030] border-[#2a2e39] text-[#7da98f]'
                    : 'bg-white border-slate-300 text-[#15803d]'
                }`}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs truncate">CHRONOS QUANT AI</span>
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                      isDark
                        ? 'bg-[#1a2620] text-[#7da98f] border border-[#2a4434]'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    GROUNDED
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                  <span>{currentSymbol}</span>
                  <span>•</span>
                  <span>Spread: ${currentSpread.toFixed(2)}</span>
                  <span>•</span>
                  <span className="text-[#7da98f]">{currentTps.toLocaleString()} TPS</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Grounding toggle */}
              <button
                onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 transition ${
                  useSearchGrounding
                    ? isDark
                      ? 'bg-[#1c2a22] text-[#7da98f] border-[#2c4e38]'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : isDark
                    ? 'bg-[#1c2030] text-slate-400 border-[#2a2e39]'
                    : 'bg-slate-200 text-slate-600 border-slate-300'
                }`}
                title="Toggle Google Search Grounding for live financial data"
              >
                <Globe className="w-3 h-3" />
                <span className="hidden sm:inline">Search: {useSearchGrounding ? 'ON' : 'OFF'}</span>
              </button>

              {/* Reset History */}
              <button
                onClick={handleClearHistory}
                className={`p-1.5 rounded transition ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-[#252c40]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                }`}
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Expand / Minimize */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1.5 rounded hidden sm:inline-flex transition ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-[#252c40]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                }`}
                title={isExpanded ? 'Restore window size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close Window */}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded transition ${
                  isDark
                    ? 'text-slate-400 hover:text-rose-400 hover:bg-[#252c40]'
                    : 'text-slate-500 hover:text-rose-600 hover:bg-slate-200'
                }`}
                title="Close chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Model selector bar */}
          <div
            className={`px-3 py-1.5 border-b text-[10px] flex items-center justify-between shrink-0 ${
              isDark ? 'bg-[#151924] border-[#222838]' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Model:</span>
              {(['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    selectedModel === m
                      ? isDark
                        ? 'bg-[#2a3448] text-slate-100 font-bold'
                        : 'bg-white text-slate-900 font-bold shadow-xs border border-slate-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'gemini-3.8-flash' ? '3.8 Flash' : m === 'gemini-3.1-flash-lite' ? '3.1 Lite' : '4 Argon'}
                </button>
              ))}
            </div>
            <span className="text-slate-400 text-[9px] hidden sm:inline">
              Zero-Copy Quant Assistant
            </span>
          </div>

          {/* Scrollable Messages Thread */}
          <div
            className={`flex-1 p-3.5 overflow-y-auto space-y-3 text-xs leading-relaxed ${
              isDark ? 'bg-[#181c28]' : 'bg-white'
            }`}
          >
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 max-w-[92%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border mt-0.5 text-[10px] ${
                      isUser
                        ? isDark
                          ? 'bg-[#2a354a] border-[#3d4b66] text-slate-200'
                          : 'bg-slate-700 border-slate-800 text-white'
                        : isDark
                        ? 'bg-[#131722] border-[#2a2e39] text-[#7da98f]'
                        : 'bg-emerald-50 border-emerald-200 text-[#15803d]'
                    }`}
                  >
                    {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div
                      className={`rounded-xl p-3 text-xs leading-relaxed border ${
                        isUser
                          ? isDark
                            ? 'bg-[#232c3f] border-[#38455e] text-slate-100'
                            : 'bg-blue-600 border-blue-700 text-white'
                          : isDark
                          ? 'bg-[#131722] border-[#242938] text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans text-xs">
                        {m.content}
                      </div>

                      {/* Google Search Grounding Sources */}
                      {m.groundingChunks && m.groundingChunks.length > 0 && (
                        <div
                          className={`mt-2.5 pt-2 border-t text-[10px] space-y-1.5 ${
                            isUser ? 'border-blue-500/30' : isDark ? 'border-[#242938]' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-semibold text-slate-400">
                            <Globe className="w-3 h-3 text-[#7da98f]" />
                            <span>Web Sources Grounding:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.groundingChunks.map((chunk, cIdx) => {
                              if (!chunk.web?.uri) return null;
                              return (
                                <a
                                  key={cIdx}
                                  href={chunk.web.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                                    isDark
                                      ? 'bg-[#1c2233] text-[#8ca0b4] border-[#2e374f] hover:text-slate-100 hover:border-[#4a587d]'
                                      : 'bg-white text-blue-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="truncate max-w-[150px]">
                                    {chunk.web.title || new URL(chunk.web.uri).hostname}
                                  </span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp & Copy action */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                      <span>{m.timestamp}</span>
                      {m.modelUsed && <span>• {m.modelUsed}</span>}
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-slate-300 transition flex items-center gap-1"
                        title="Copy message text"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-400 py-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border animate-pulse ${
                    isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-[#7da98f]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7da98f] animate-ping" />
                  <span>Synthesizing quant response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div
            className={`px-3 py-1.5 border-t overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none ${
              isDark ? 'bg-[#131722]/60 border-[#242938]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                disabled={loading}
                className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition border shrink-0 ${
                  isDark
                    ? 'bg-[#1b2131] hover:bg-[#232b3f] text-slate-300 border-[#2c364e]'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div
            className={`p-3 border-t flex items-center gap-2 shrink-0 ${
              isDark ? 'bg-[#131722] border-[#242938]' : 'bg-white border-slate-200'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={`Ask Chronos AI about ${currentSymbol}, order book, or C-structs...`}
              disabled={loading}
              className={`flex-1 text-xs px-3 py-2 rounded-lg border outline-none font-mono transition ${
                isDark
                  ? 'bg-[#181d2a] border-[#2e374f] text-slate-100 focus:border-[#7da98f]'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
              }`}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              className={`p-2 rounded-lg font-bold transition flex items-center justify-center shrink-0 ${
                input.trim() && !loading
                  ? 'bg-[#7da98f] hover:bg-[#68987b] text-slate-950 shadow-md'
                  : isDark
                  ? 'bg-[#222838] text-slate-500 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
