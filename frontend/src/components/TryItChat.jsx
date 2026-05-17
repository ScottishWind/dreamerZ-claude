import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, ExternalLink, Copy, Check, Sparkles, RotateCcw, Info,
} from 'lucide-react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

// Per-tool theming + external links. `chat: false` tools (Canva, Syllaby)
// aren't conversational, so we show a link-out + copy-prompt panel instead
// of a chat window.
const TOOL_CONFIGS = {
  chatgpt: {
    name: 'ChatGPT',
    icon: '🤖',
    gradient: 'from-emerald-500 to-teal-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    chat: true,
    external: 'https://chat.openai.com/',
    placeholder: 'Ask ChatGPT anything...',
  },
  claude: {
    name: 'Claude',
    icon: '🧠',
    gradient: 'from-orange-500 to-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    chat: true,
    external: 'https://claude.ai/',
    placeholder: 'Message Claude...',
  },
  gemini: {
    name: 'Gemini',
    icon: '✨',
    gradient: 'from-blue-500 to-indigo-500',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    chat: true,
    external: 'https://gemini.google.com/',
    placeholder: 'Ask Gemini...',
  },
  canva: {
    name: 'Canva',
    icon: '🎨',
    gradient: 'from-cyan-500 to-teal-500',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    chat: false,
    external: 'https://www.canva.com/',
  },
  syllaby: {
    name: 'Syllaby',
    icon: '🎬',
    gradient: 'from-violet-500 to-purple-500',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    chat: false,
    external: 'https://syllaby.io/',
  },
};

// Generic fallback so unknown AI-category tools still get a panel.
const DEFAULT_CONFIG = {
  name: 'AI',
  icon: '✨',
  gradient: 'from-slate-700 to-slate-900',
  badgeBg: 'bg-slate-100',
  badgeText: 'text-slate-700',
  chat: true,
  external: null,
  placeholder: 'Type a prompt...',
};

const getToolConfig = (toolId) => TOOL_CONFIGS[toolId] || DEFAULT_CONFIG;

// Strip markdown / quote characters so we get a clean one-line preview from
// the activity blob to use as the suggested prompt chip.
const truncate = (s, n = 140) => {
  if (!s) return '';
  const flat = s.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
};

export const TryItChat = ({ toolId, activity }) => {
  const cfg = getToolConfig(toolId);
  const suggestion = truncate(activity, 220);

  if (!cfg.chat) {
    return <LinkOutPanel cfg={cfg} suggestion={suggestion} />;
  }
  return <ChatPanel cfg={cfg} suggestion={suggestion} />;
};

// ── Chat panel (ChatGPT / Claude / Gemini) ─────────────────────────────────

const ChatPanel = ({ cfg, suggestion }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    const newUser = { from: 'user', text };
    const history = [...messages]; // snapshot before adding the new turn
    setMessages((prev) => [...prev, newUser]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          mode: 'tryit',
          history,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) {
          throw new Error('You are sending messages too fast. Please wait a moment.');
        }
        throw new Error(body.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { from: 'assistant', text: data.response, isDemo: data.is_demo },
      ]);
    } catch (err) {
      setError(err.message || 'Could not reach the AI. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${cfg.gradient} px-4 sm:px-5 py-3 flex items-center gap-3`}>
        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl flex-shrink-0">
          {cfg.icon}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white text-sm sm:text-base truncate">
              {cfg.name}
            </h4>
            <span className="text-[10px] uppercase tracking-wide font-bold bg-white/20 text-white px-1.5 py-0.5 rounded">
              Try it
            </span>
          </div>
          <p className="text-white/80 text-[11px] sm:text-xs truncate">
            Practice the lesson task here — no setup needed.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0"
            title="Clear chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggested prompt chip */}
      {suggestion && messages.length === 0 && (
        <button
          type="button"
          onClick={() => send(suggestion)}
          disabled={loading}
          className="w-full text-left px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-60"
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-0.5">
                Suggested prompt from this lesson
              </div>
              <div className="text-sm text-slate-700 line-clamp-2">
                {suggestion}
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="p-4 sm:p-5 space-y-3 max-h-[420px] min-h-[180px] overflow-y-auto bg-white"
      >
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            Send a message to start practising.
          </p>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.from === 'user'
                  ? `bg-gradient-to-r ${cfg.gradient} text-white rounded-br-md`
                  : 'bg-slate-100 text-slate-800 rounded-bl-md'
              }`}
            >
              {m.text}
              {m.isDemo && (
                <div className="mt-1.5 text-[10px] uppercase tracking-wide font-bold opacity-70">
                  Demo response
                </div>
              )}
            </div>
          </motion.div>
        ))}

        <AnimatePresence>
          {loading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="px-4 sm:px-5 py-2 text-xs text-rose-700 bg-rose-50 border-t border-rose-100">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-slate-100 p-3 bg-slate-50 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={cfg.placeholder}
          disabled={loading}
          className="flex-grow min-w-0 px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className={`flex items-center justify-center w-10 h-10 sm:w-auto sm:px-4 sm:py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r ${cfg.gradient} disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
          title="Send"
        >
          <Send className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>

      {/* Honest disclosure footer */}
      <div className="px-4 sm:px-5 py-2.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          DreamerZ chat — themed as {cfg.name}, powered by Claude.
        </span>
        {cfg.external && (
          <a
            href={cfg.external}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
          >
            Open the real {cfg.name}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

// ── Link-out panel (Canva / Syllaby — non-chat tools) ──────────────────────

const LinkOutPanel = ({ cfg, suggestion }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked — silent fail */
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className={`bg-gradient-to-r ${cfg.gradient} px-4 sm:px-5 py-3 flex items-center gap-3`}>
        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl flex-shrink-0">
          {cfg.icon}
        </div>
        <div className="flex-grow min-w-0">
          <h4 className="font-semibold text-white text-sm sm:text-base">
            Try it in {cfg.name}
          </h4>
          <p className="text-white/80 text-[11px] sm:text-xs">
            {cfg.name} is a visual tool — open it in a new tab to follow along.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {suggestion && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-[11px] uppercase tracking-wide font-bold text-slate-500 mb-1">
              Suggested task
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{suggestion}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!suggestion}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy task'}
          </button>
          <a
            href={cfg.external}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${cfg.gradient}`}
          >
            <ExternalLink className="w-4 h-4" />
            Open {cfg.name}
          </a>
        </div>
      </div>
    </div>
  );
};

export default TryItChat;
