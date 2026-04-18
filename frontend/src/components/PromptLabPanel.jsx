import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Wand2, AlertCircle, Plus, ChevronDown,
  Target, FileText, Settings2, Layers, Lightbulb, ArrowRight,
  CheckCircle2, Zap, BookOpen, RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Preset templates
const PRESETS = [
  {
    id: 'homework',
    name: 'School homework helper',
    icon: '\u{1F4DA}',
    goal: 'Help me understand and complete my homework assignment',
    context: "I'm a student and I have a homework assignment that I'm struggling with. I want to learn the concept, not just get the answer.",
    constraints: 'Explain the concept first, then guide me step-by-step. Use simple language.',
    format: 'step-by-step'
  },
  {
    id: 'youtube',
    name: 'YouTube script idea',
    icon: '\u{1F3AC}',
    goal: 'Generate creative ideas for a YouTube video',
    context: "I'm a teen content creator looking to make educational and entertaining videos for other teens.",
    constraints: 'Include a hook, main content points, and a call-to-action. Make it engaging and shareable.',
    format: 'bullet-list'
  },
  {
    id: 'study',
    name: 'Study plan',
    icon: '\u{1F4DD}',
    goal: 'Create a study plan for my upcoming exam',
    context: "I have an exam coming up and need to organize my study time effectively. I want to cover all topics without burning out.",
    constraints: 'Break it into daily sessions, include breaks, and prioritize difficult topics first.',
    format: 'table'
  },
  {
    id: 'poster',
    name: 'Poster copy',
    icon: '\u{1F3A8}',
    goal: 'Write catchy text for a poster or social media graphic',
    context: "I'm creating visual content for school/social media and need text that grabs attention.",
    constraints: 'Keep it short, punchy, and memorable. Include a headline, tagline, and call-to-action.',
    format: 'short-paragraph'
  }
];

// Output format options
const OUTPUT_FORMATS = [
  { value: 'bullet-list', label: 'Bullet list', icon: '\u2022' },
  { value: 'table', label: 'Table', icon: '\u25A6' },
  { value: 'step-by-step', label: 'Step-by-step', icon: '1.' },
  { value: 'short-paragraph', label: 'Short paragraph', icon: '\u00B6' }
];

// Demo mode responses
const DEMO_RESPONSES = {
  base: {
    response: `Here's a general answer to your question:

Artificial Intelligence (AI) is a branch of computer science that focuses on creating machines that can perform tasks that typically require human intelligence. This includes things like learning, problem-solving, understanding language, and recognizing patterns.

AI systems work by processing large amounts of data and finding patterns within that data. They use algorithms (step-by-step instructions) to make decisions and predictions.`,
    whyImproved: null
  },
  withContext: {
    response: `Great question! Since you're a teen just starting to learn about technology, let me explain AI in a way that relates to your daily life:

**What is AI?**
Think of AI like teaching a computer to think and learn, similar to how you learn new things at school. Just like you get better at subjects the more you practice, AI gets better at tasks the more data it sees.

**Examples you use daily:**
\u2022 When Instagram suggests posts you might like
\u2022 When Spotify creates playlists for you
\u2022 When Google completes your search queries
\u2022 When games adapt to your skill level

These are all AI working behind the scenes!`,
    whyImproved: "By adding context about being a teen learner, the AI now uses relatable examples from apps you actually use, making the explanation more relevant and easier to understand."
  },
  bestAnswer: {
    response: `# Understanding AI: A Teen's Guide \u{1F916}

## What is AI? (The Cricket Analogy \u{1F3CF})
Imagine AI like a cricket analyst who has watched millions of matches. After seeing so many games, they can predict what a batsman might do next. AI works similarly - it learns from tons of examples to make smart predictions!

## Key Points:
| Concept | Simple Explanation |
|---------|-------------------|
| Machine Learning | Computer learns from practice, like you learning to bat |
| Neural Networks | Mimics how your brain connects ideas |
| Training Data | The "practice matches" AI learns from |

## 3 Steps AI Uses:
1. **Collect** - Gather lots of examples (like match footage)
2. **Learn** - Find patterns (which shots work best)
3. **Predict** - Make smart guesses (what will happen next)

**\u{1F3AF} Fun Fact:** The AI in video games that plays against you uses the same tech that helps scientists discover new medicines!`,
    whyImproved: "With constraints specifying format (table + steps), length, and a cricket analogy, you get a perfectly structured response that matches exactly what you need. This is the power of prompt engineering!"
  }
};

// Context suggestions
const CONTEXT_SUGGESTIONS = [
  "I'm a [age] year old student in [grade/class]",
  "I already know the basics of [related topic]",
  "I need this for [specific purpose: school project, personal learning, etc.]",
  "My learning style is [visual/reading/hands-on]",
  "I have [time frame] to complete this"
];

export const PromptLabPanel = ({ toolId }) => {
  // Form state
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [constraints, setConstraints] = useState('');
  const [outputFormat, setOutputFormat] = useState('bullet-list');

  // UI state
  const [activeTab, setActiveTab] = useState('base');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [error, setError] = useState('');

  // Response state
  const [responses, setResponses] = useState({
    base: null,
    withContext: null,
    bestAnswer: null
  });
  const [isDemo, setIsDemo] = useState(false);

  // Build prompts for each level
  const buildPrompt = useCallback((level) => {
    const formatInstruction = OUTPUT_FORMATS.find(f => f.value === outputFormat)?.label || 'bullet list';
    const toolHint = toolId ? `\n\n(Related tool: ${toolId})` : '';

    switch (level) {
      case 'base':
        return goal + toolHint;
      case 'context':
        return `Context about me: ${context}\n\nMy question: ${goal}${toolHint}`;
      case 'best':
        return `Context about me: ${context}\n\nMy question: ${goal}\n\nConstraints:\n${constraints}\n\nPlease format your response as: ${formatInstruction}${toolHint}`;
      default:
        return goal;
    }
  }, [goal, context, constraints, outputFormat, toolId]);

  // Run all three prompts
  const handleRun = async () => {
    if (!goal.trim()) return;

    setIsLoading(true);
    setLoadingType('run');
    setError('');
    setActiveTab('base');

    try {
      const [baseRes, contextRes, bestRes] = await Promise.all([
        axios.post(`${API}/ai`, { prompt: buildPrompt('base'), mode: 'prompt_lab_base' }),
        context.trim()
          ? axios.post(`${API}/ai`, { prompt: buildPrompt('context'), mode: 'prompt_lab_context' })
          : Promise.resolve({ data: { response: null, is_demo: false } }),
        context.trim() && constraints.trim()
          ? axios.post(`${API}/ai`, { prompt: buildPrompt('best'), mode: 'prompt_lab_best' })
          : Promise.resolve({ data: { response: null, is_demo: false } })
      ]);

      setResponses({
        base: {
          response: baseRes.data.response,
          whyImproved: null
        },
        withContext: contextRes.data.response ? {
          response: contextRes.data.response,
          whyImproved: "By adding context about yourself, the AI now tailors the response to your specific situation, making it more relevant and useful."
        } : null,
        bestAnswer: bestRes.data.response ? {
          response: bestRes.data.response,
          whyImproved: `With constraints and ${OUTPUT_FORMATS.find(f => f.value === outputFormat)?.label.toLowerCase()} format, you get exactly what you asked for - structured, focused, and ready to use.`
        } : null
      });

      setIsDemo(baseRes.data.is_demo);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests! Please wait a minute before trying again.');
      } else if (err.response?.data?.detail?.includes('safety')) {
        setError("This prompt was blocked by our safety filter. Please make sure your prompt is appropriate for a learning environment.");
      } else {
        setResponses(DEMO_RESPONSES);
        setIsDemo(true);
      }
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  // Add context suggestions
  const handleAddContext = async () => {
    if (!goal.trim()) return;

    setIsLoading(true);
    setLoadingType('addContext');

    try {
      const res = await axios.post(`${API}/ai`, {
        prompt: `Based on this goal: "${goal}", suggest helpful context that a student should provide to get a better AI response. Provide 3-4 specific suggestions as a comma-separated list. Be brief.`,
        mode: 'prompt_lab_helper'
      });

      const suggestion = res.data.response;
      setContext(prev => prev ? `${prev}\n\n${suggestion}` : suggestion);
    } catch (err) {
      const suggestion = CONTEXT_SUGGESTIONS.slice(0, 3).join('\n');
      setContext(prev => prev ? `${prev}\n\n${suggestion}` : suggestion);
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  // Improve prompt structure
  const handleImprovePrompt = async () => {
    if (!goal.trim()) return;

    setIsLoading(true);
    setLoadingType('improve');

    try {
      const res = await axios.post(`${API}/ai`, {
        prompt: `Rewrite this prompt to be clearer and more structured: "${goal}". Keep the same intent but make it more specific and actionable. Return only the improved prompt, no explanation.`,
        mode: 'prompt_lab_helper'
      });

      setGoal(res.data.response);
    } catch (err) {
      setGoal(prev => `I need help with the following: ${prev}. Please provide a clear and detailed response.`);
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  // Load preset
  const loadPreset = (preset) => {
    setGoal(preset.goal);
    setContext(preset.context);
    setConstraints(preset.constraints);
    setOutputFormat(preset.format);
    setResponses({ base: null, withContext: null, bestAnswer: null });
  };

  // Clear all
  const clearAll = () => {
    setGoal('');
    setContext('');
    setConstraints('');
    setOutputFormat('bullet-list');
    setResponses({ base: null, withContext: null, bestAnswer: null });
    setError('');
    setActiveTab('base');
  };

  const tabs = [
    { id: 'base', label: 'Base Answer', icon: Target, available: true },
    { id: 'context', label: 'With Context', icon: Layers, available: !!context.trim() },
    { id: 'best', label: 'Best Answer', icon: Sparkles, available: !!context.trim() && !!constraints.trim() }
  ];

  const getResponseKey = (tabId) => {
    if (tabId === 'context') return 'withContext';
    if (tabId === 'best') return 'bestAnswer';
    return 'base';
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Prompt Builder */}
        <div className="space-y-5">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700/50">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Prompt Builder
              </h2>
            </div>

            <div className="p-5 space-y-5">
              {/* Presets */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => loadPreset(preset)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-all border border-slate-600/50 hover:border-primary/50"
                      data-testid={`preset-${preset.id}`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Goal */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                  <span className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center text-xs text-primary font-bold">1</span>
                  Goal
                  <span className="text-rose-400 text-xs">*required</span>
                </label>
                <Textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What do you want the AI to help you with?"
                  className="bg-slate-900/70 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px] rounded-xl resize-none focus:border-primary focus:ring-1 focus:ring-primary"
                  data-testid="prompt-goal"
                />
              </div>

              {/* 2. Context */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                  <span className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center text-xs text-emerald-400 font-bold">2</span>
                  Context
                  <span className="text-slate-500 text-xs">(who you are, background)</span>
                </label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Tell the AI about yourself: your age, what you know, why you're asking..."
                  className="bg-slate-900/70 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px] rounded-xl resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  data-testid="prompt-context"
                />
              </div>

              {/* 3. Constraints */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                  <span className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center text-xs text-amber-400 font-bold">3</span>
                  Constraints
                  <span className="text-slate-500 text-xs">(rules, limits, specifics)</span>
                </label>
                <Textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="Specify: length limits, what to include/exclude, style preferences..."
                  className="bg-slate-900/70 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px] rounded-xl resize-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  data-testid="prompt-constraints"
                />
              </div>

              {/* 4. Output Format */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                  <span className="w-6 h-6 bg-violet-500/20 rounded-lg flex items-center justify-center text-xs text-violet-400 font-bold">4</span>
                  Output Format
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white hover:border-violet-500 transition-colors"
                    data-testid="format-dropdown"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-violet-400">{OUTPUT_FORMATS.find(f => f.value === outputFormat)?.icon}</span>
                      {OUTPUT_FORMATS.find(f => f.value === outputFormat)?.label}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFormatDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showFormatDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden z-10 shadow-xl"
                      >
                        {OUTPUT_FORMATS.map(format => (
                          <button
                            key={format.value}
                            onClick={() => {
                              setOutputFormat(format.value);
                              setShowFormatDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/50 transition-colors ${
                              outputFormat === format.value ? 'bg-violet-500/20 text-violet-300' : 'text-slate-300'
                            }`}
                            data-testid={`format-${format.value}`}
                          >
                            <span className="text-violet-400 w-6">{format.icon}</span>
                            {format.label}
                            {outputFormat === format.value && (
                              <CheckCircle2 className="w-4 h-4 text-violet-400 ml-auto" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/30">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleRun}
                  disabled={!goal.trim() || isLoading}
                  className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex-grow sm:flex-grow-0"
                  data-testid="run-btn"
                >
                  {loadingType === 'run' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Run
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleAddContext}
                  disabled={!goal.trim() || isLoading}
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
                  data-testid="add-context-btn"
                >
                  {loadingType === 'addContext' ? (
                    <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add context
                </Button>

                <Button
                  onClick={handleImprovePrompt}
                  disabled={!goal.trim() || isLoading}
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 rounded-xl"
                  data-testid="improve-btn"
                >
                  {loadingType === 'improve' ? (
                    <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mr-2" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Improve prompt
                </Button>

                <Button
                  onClick={clearAll}
                  variant="ghost"
                  className="text-slate-400 hover:text-white rounded-xl ml-auto"
                  data-testid="clear-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: AI Output */}
        <div className="space-y-5">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden min-h-[600px] flex flex-col">
            {/* Header with Tabs */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Output
                </h2>
                {isDemo && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-medium">
                    Demo Mode
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => tab.available && setActiveTab(tab.id)}
                    disabled={!tab.available}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : tab.available
                          ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {!tab.available && index > 0 && (
                      <span className="text-xs opacity-60">
                        {index === 1 ? '(add context)' : '(add constraints)'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="m-4 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-rose-300 text-sm font-medium">Request blocked</p>
                  <p className="text-rose-300/80 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Response Content */}
            <div className="flex-grow p-5 overflow-auto">
              <AnimatePresence mode="wait">
                {isLoading && loadingType === 'run' ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-full"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-slate-400">Generating responses...</p>
                      <p className="text-slate-500 text-sm">Comparing base vs context vs best</p>
                    </div>
                  </motion.div>
                ) : responses[getResponseKey(activeTab)] ? (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Response Text */}
                    <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="text-slate-200 whitespace-pre-wrap leading-relaxed" data-testid="response-content">
                          {responses[getResponseKey(activeTab)]?.response}
                        </div>
                      </div>
                    </div>

                    {/* Why This Improved */}
                    {responses[getResponseKey(activeTab)]?.whyImproved && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-xl p-4 border border-primary/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white text-sm mb-1">Why this is better</h4>
                            <p className="text-slate-300 text-sm leading-relaxed">
                              {responses[getResponseKey(activeTab)]?.whyImproved}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Upgrade Prompt */}
                    {activeTab === 'base' && !context.trim() && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
                      >
                        <Zap className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm text-slate-300 flex-grow">
                          Add context to see how the answer improves for <strong>you</strong> specifically!
                        </span>
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                      </motion.div>
                    )}

                    {activeTab === 'context' && !constraints.trim() && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20"
                      >
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span className="text-sm text-slate-300 flex-grow">
                          Add constraints to get the <strong>exact format and style</strong> you need!
                        </span>
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-full"
                  >
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-slate-600" />
                      </div>
                      <h3 className="text-white font-medium mb-2">Ready to experiment</h3>
                      <p className="text-slate-400 text-sm">
                        Enter a goal and click "Run" to see how AI responds. Then add context and constraints to see the difference!
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Comparison Legend */}
            {responses.base && (
              <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center justify-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                    <span className="text-slate-400">Base: Just goal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-400">+ Context: Personalized</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-slate-400">+ Constraints: Perfect</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptLabPanel;
