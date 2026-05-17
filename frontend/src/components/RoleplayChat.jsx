import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Mic, User, Bot, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import API_BASE from '../config/api';
import { MAX_CHAT_MESSAGES, ROLEPLAY_HISTORY_LIMIT, AUTH_STORAGE_KEY } from '../config/constants';

const getAuthHeaders = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = raw ? JSON.parse(raw)?.token : null;
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
};

const ROLES = [
  { id: 'friend', label: 'Friend (Riya)', emoji: '👋', description: 'Casual Bengali teen chat' },
  { id: 'waiter', label: 'Waiter', emoji: '🍽️', description: 'Restaurant ordering' },
  { id: 'teacher', label: 'Teacher', emoji: '📚', description: 'English practice & corrections' },
  { id: 'shopkeeper', label: 'Shopkeeper', emoji: '🛍️', description: 'Shopping conversation' },
  { id: 'interviewer', label: 'Interviewer', emoji: '💼', description: 'Mock interview' }
];

// `inline` flips the layout from a fixed-position modal (used when the
// speaking-task button on the lesson opens it as an overlay) to a normal
// in-page block (used when JourneyPlayer's Lab tab embeds it directly for
// Conversational English courses).
export const RoleplayChat = ({ toolId, moduleId, moduleName, speakingTask, onClose, inline = false }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('friend');
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send initial greeting based on role
  useEffect(() => {
    const roleGreetings = {
      friend: `Hi! I'm Riya 👋 I heard you're practising English. Let's chat! ${speakingTask ? `Your task: ${speakingTask}` : "What's on your mind?"}`,
      waiter: `Welcome to our restaurant! 🍽️ ${speakingTask ? `Your task: ${speakingTask}` : "What would you like to order today?"}`,
      teacher: `Hello there! I'm your English practice teacher. 📚 ${speakingTask ? `Today's task: ${speakingTask}` : "Let's practise speaking!"}`,
      shopkeeper: `Welcome to my shop! 🛍️ ${speakingTask ? `Your task: ${speakingTask}` : "How can I help you today?"}`,
      interviewer: `Good morning! Please have a seat. 💼 ${speakingTask ? `Today's task: ${speakingTask}` : "Let's begin. Tell me about yourself."}`
    };
    setMessages([{ from: 'ai', text: roleGreetings[selectedRole] || roleGreetings.friend }]);
  }, [selectedRole, speakingTask]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { from: 'user', text: input.trim() };
    setMessages(prev => {
      const updated = [...prev, userMsg];
      return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated;
    });
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ai/roleplay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tool_id: toolId,
          module_id: moduleId,
          user_message: userMsg.text,
          role: selectedRole,
          history: messages.slice(-ROLEPLAY_HISTORY_LIMIT).map(m => ({ from: m.from, text: m.text }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => {
          const updated = [...prev, { from: 'ai', text: data.response }];
          return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated;
        });
      } else {
        setMessages(prev => {
          const updated = [...prev, { from: 'ai', text: "Oops — I couldn't process that. Try saying it differently! 😊" }];
          return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev, { from: 'ai', text: "Connection issue — but keep practising! Try again in a moment." }];
        return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated;
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, toolId, moduleId, selectedRole, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentRole = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  const card = (
    <motion.div
      className={
        inline
          ? 'bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden w-full'
          : 'bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden'
      }
      style={
        inline
          ? { minHeight: 520 }
          : { maxHeight: '85vh', minHeight: '500px' }
      }
      initial={inline ? false : { scale: 0.95 }}
      animate={inline ? false : { scale: 1 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg">
            {currentRole.emoji}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AI Roleplay — {currentRole.label}</h3>
            {moduleName && <p className="text-rose-100 text-xs">{moduleName}</p>}
          </div>
        </div>
        {!inline && onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

        {/* Role Selector */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowRoleSelect(!showRoleSelect)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl bg-white border border-slate-200 hover:border-rose-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>{currentRole.emoji}</span>
                <span className="font-medium text-slate-700">Talk to: {currentRole.label}</span>
                <span className="text-slate-400 text-xs">({currentRole.description})</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showRoleSelect ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showRoleSelect && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-10 overflow-hidden"
                >
                  {ROLES.map(role => (
                    <button
                      key={role.id}
                      onClick={() => { setSelectedRole(role.id); setShowRoleSelect(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-rose-50 transition-colors ${
                        selectedRole === role.id ? 'bg-rose-50 text-rose-700' : 'text-slate-700'
                      }`}
                    >
                      <span className="text-lg">{role.emoji}</span>
                      <div className="text-left">
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-slate-400">{role.description}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.from === 'user'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {msg.from === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.from === 'user'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message in English..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-300 focus:ring-2 focus:ring-rose-100 outline-none text-sm transition-all"
              disabled={isLoading}
              autoFocus
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl p-3 shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Practise speaking English with AI. Your conversations are not stored.
          </p>
        </div>
    </motion.div>
  );

  // Inline mode (embedded inside a lesson's Lab tab) renders the card
  // directly. Modal mode (default) wraps it in the fixed-overlay backdrop
  // and supports click-outside-to-close.
  if (inline) {
    return card;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      {card}
    </motion.div>
  );
};

export default RoleplayChat;
