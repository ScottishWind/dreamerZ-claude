import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ChevronDown, Lock, CheckCircle2,
  BookOpen, Lightbulb, Rocket, Play, Award,
  Clock, Sparkles, ArrowLeft, Home, Volume2,
  Languages, Mic, MessageCircle, Trophy, AlertTriangle, Calendar,
  FileText, Download, Paperclip, HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Quiz } from './Quiz';
import RoleplayChat from './RoleplayChat';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { SafetyBanner } from './SafetyBanner';
import { CoursePreviewVideo } from './CoursePreviewVideo';
import { MarkdownContent } from './MarkdownContent';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

// ── Inline Media Attachments Component ─────────────────
const MediaAttachments = ({ assets, variant = 'inline' }) => {
  if (!assets || assets.length === 0) return null;

  const mediaUrl = (id) => `${API_BASE}/api/content/media/${id}`;

  // Compact list view — mirrors the lesson editor's Media tab styling.
  if (variant === 'standalone') {
    return (
      <div className="space-y-2">
        {assets.map((asset) => {
          const isImage = asset.type === 'image';
          const url = mediaUrl(asset.id);
          return (
            <a
              key={asset.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-primary/40 hover:bg-slate-50 transition-all group"
            >
              {isImage ? (
                <img
                  src={url}
                  alt={asset.alt_text || asset.original_filename}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate group-hover:text-primary transition-colors">
                  {asset.original_filename}
                </p>
                <p className="text-xs text-slate-400">
                  {asset.file_extension?.toUpperCase()}
                  {asset.file_size_bytes ? ` · ${(asset.file_size_bytes / 1024).toFixed(0)} KB` : ''}
                </p>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-primary flex-shrink-0" />
            </a>
          );
        })}
      </div>
    );
  }

  // Legacy inline view (kept for any other callers).
  return (
    <div className="mt-6 pt-6 border-t border-slate-100">
      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-500" />
        Lesson Materials
      </h4>
      <div className="space-y-2">
        {assets.map((asset) => {
          const isImage = asset.type === 'image';
          const url = mediaUrl(asset.id);
          return (
            <a
              key={asset.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-primary/40 hover:bg-slate-50 transition-all group"
            >
              {isImage ? (
                <img src={url} alt={asset.alt_text || asset.original_filename} className="w-10 h-10 rounded object-cover" />
              ) : (
                <FileText className="w-5 h-5 text-slate-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{asset.original_filename}</p>
                <p className="text-xs text-slate-400">{asset.file_extension?.toUpperCase()}</p>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-primary flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
};

export const JourneyPlayer = ({
  tool,
  course: courseProp,
  modules,
  isModuleCompleted,
  isModuleUnlocked,
  getModuleProgress,
  completeModule,
  initialModuleId,
  previewVideoUrl,
  previewMode = false,
}) => {
  const course = courseProp || tool;

  // Group lessons by their module (sectionTitle or week)
  const moduleGroups = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    modules.forEach((mod, index) => {
      const groupKey = mod.sectionTitle || (mod.week ? `Week ${mod.week}` : null);

      if (groupKey && groupKey !== currentGroup?.title) {
        currentGroup = { title: groupKey, startIndex: index };
        groups.push(currentGroup);
      }
    });

    return groups;
  }, [modules]);

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showRoleplay, setShowRoleplay] = useState(false);
  const [contentSection, setContentSection] = useState('learn'); // 'learn', 'example', 'activity', 'vocab', 'speak'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());

  // Derive activeModule early so callbacks can reference it
  const activeModule = modules[activeModuleIndex];

  const getSpeechText = useCallback(() => {
    if (!activeModule) return '';
    if (contentSection === 'example') return activeModule.content.example;
    if (contentSection === 'activity') return activeModule.content.activity;
    return activeModule.content.explanation;
  }, [activeModule, contentSection]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const handleSpeakAloud = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    const text = getSpeechText();
    if (!text) return;

    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [getSpeechText, stopSpeech]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Find initial module or first unlocked incomplete module
  useEffect(() => {
    if (initialModuleId) {
      const index = modules.findIndex(m => m.id === initialModuleId);
      if (index >= 0 && isModuleUnlocked(course.id, initialModuleId)) {
        setActiveModuleIndex(index);
        return;
      }
    }
    
    // Find first incomplete unlocked module (resume functionality)
    const resumeIndex = modules.findIndex((m, i) => {
      if (i === 0) return !isModuleCompleted(course.id, m.id);
      const prevModule = modules[i - 1];
      return isModuleCompleted(course.id, prevModule.id) && !isModuleCompleted(course.id, m.id);
    });
    
    if (resumeIndex >= 0) {
      setActiveModuleIndex(resumeIndex);
    }
  }, [initialModuleId, modules, course.id, isModuleCompleted, isModuleUnlocked]);

  const moduleProgress = getModuleProgress(course.id, activeModule?.id);
  const isCurrentModuleCompleted = isModuleCompleted(course.id, activeModule?.id);
  const completedCount = useMemo(
    () => modules.filter(m => isModuleCompleted(course.id, m.id)).length,
    [modules, course.id, isModuleCompleted]
  );
  const progressPercent = Math.round((completedCount / modules.length) * 100);

  // Handle quiz completion
  const handleQuizComplete = useCallback((score, passed, attempts) => {
    if (passed) {
      completeModule(course.id, activeModule.id, score);
    }
  }, [course.id, activeModule?.id, completeModule]);

  // Navigate to next module
  const goToNextModule = useCallback(() => {
    const nextIndex = activeModuleIndex + 1;
    if (nextIndex < modules.length) {
      setActiveModuleIndex(nextIndex);
      setShowQuiz(false);
      setContentSection('learn');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeModuleIndex, modules.length]);

  // Navigate to previous module
  const goToPrevModule = useCallback(() => {
    if (activeModuleIndex > 0) {
      setActiveModuleIndex(prev => prev - 1);
      setShowQuiz(false);
      setContentSection('learn');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeModuleIndex]);

  // Select specific module
  const selectModule = useCallback((index) => {
    const module = modules[index];
    if (isModuleUnlocked(course.id, module.id)) {
      setActiveModuleIndex(index);
      setShowQuiz(false);
      setContentSection('learn');
    }
  }, [modules, course.id, isModuleUnlocked]);

  if (!activeModule) return null;

  // Group lessons by section for the sidebar tree. Each entry preserves
  // the original module index so click handlers continue to work unchanged.
  const groupedSections = (() => {
    const groups = []; // [{ title, order, items: [{ module, index }] }]
    const byTitle = new Map();
    modules.forEach((m, idx) => {
      const title = m.sectionTitle || 'Lessons';
      const order = m.sectionOrder ?? 0;
      let group = byTitle.get(title);
      if (!group) {
        group = { title, order, items: [] };
        byTitle.set(title, group);
        groups.push(group);
      }
      group.items.push({ module: m, index: idx });
    });
    groups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return groups;
  })();

  const toggleSection = (title) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const hasMultipleSections = groupedSections.length > 1;

  // Check if this module has spoken-english extended fields
  const hasVocab = activeModule?.content?.vocab?.length > 0;
  const hasSpeak = activeModule?.content?.dialogue?.length > 0 || activeModule?.content?.speaking_task;
  const isWeeklyTest = activeModule?.is_weekly_test;
  const moduleDay = activeModule?.day;
  const moduleWeek = activeModule?.week;

  const quizQuestions = Array.isArray(activeModule.quiz)
    ? activeModule.quiz
    : (activeModule.quiz?.questions || []);
  const hasQuiz = quizQuestions.length > 0;
  const hasMedia = (activeModule.media_assets || []).length > 0;
  const quizPassingScore = (() => {
    const raw = activeModule.quiz?.passing_score;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 && n <= 100 ? Math.round(n) : 70;
  })();

  const contentSections = [
    { id: 'learn', label: 'Learn', icon: BookOpen, color: 'primary' },
    { id: 'example', label: 'Example', icon: Lightbulb, color: 'amber' },
    { id: 'activity', label: 'Try It', icon: Rocket, color: 'emerald' },
    ...(hasVocab ? [{ id: 'vocab', label: 'Vocab', icon: Languages, color: 'violet' }] : []),
    ...(hasSpeak ? [{ id: 'speak', label: 'Speak', icon: Mic, color: 'rose' }] : []),
    { id: 'study', label: 'Study Materials', icon: Paperclip, color: 'sky' },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'violet' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Safety Banner */}
      <div className="pt-16">
        <SafetyBanner variant="journey" />
      </div>
      
      {/* Sticky Header */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back & Tool Info */}
            <div className="flex items-center gap-4">
              {!previewMode && (
                <Link
                  to="/learn"
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  data-testid="journey-back-btn"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Link>
              )}
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${course.color}20` }}
                >
                  {course.icon}
                </div>
                <div className="hidden sm:block">
                  <h2 className="font-semibold text-slate-900 text-sm">{course.name}</h2>
                  <p className="text-xs text-slate-500">{completedCount}/{modules.length} modules</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex-grow max-w-xs hidden md:block">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>{progressPercent}% complete</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* XP Badge */}
            {!previewMode && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-200">
                <Award className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-700">{course.xpReward} XP</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Module Sidebar */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="lg:sticky lg:top-36">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Learning Path
                  </h3>
                </div>
                
                <div className="p-2 max-h-[70vh] overflow-y-auto">
                  {groupedSections.map((group) => {
                    const collapsed = collapsedSections.has(group.title);
                    const total = group.items.length;
                    const doneCount = group.items.filter(({ module }) =>
                      isModuleCompleted(course.id, module.id),
                    ).length;
                    const containsActive = group.items.some(({ index }) => index === activeModuleIndex);

                    return (
                      <div key={group.title} className="mb-2">
                        {hasMultipleSections && (
                          <button
                            onClick={() => toggleSection(group.title)}
                            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
                              containsActive ? 'bg-primary/5' : 'hover:bg-slate-50'
                            }`}
                          >
                            {collapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            )}
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-700 flex-grow truncate">
                              {group.title}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                              {doneCount}/{total}
                            </span>
                          </button>
                        )}

                        {!collapsed && (
                          <div className={hasMultipleSections ? 'pl-3 ml-2 border-l border-slate-100 mt-1' : ''}>
                            {group.items.map(({ module, index }) => {
                              const completed = isModuleCompleted(course.id, module.id);
                              const unlocked = isModuleUnlocked(course.id, module.id);
                              const isActive = index === activeModuleIndex;
                              const progress = getModuleProgress(course.id, module.id);

                              return (
                                <motion.button
                                  key={module.id}
                                  onClick={() => selectModule(index)}
                                  disabled={!unlocked}
                                  whileHover={unlocked ? { x: 4 } : {}}
                                  className={`w-full text-left p-2.5 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                                    isActive
                                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                      : unlocked
                                        ? 'hover:bg-slate-50'
                                        : 'opacity-50 cursor-not-allowed'
                                  }`}
                                  data-testid={`module-nav-${module.id}`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                    completed
                                      ? 'bg-emerald-500 text-white'
                                      : isActive
                                        ? 'bg-white/20 text-white'
                                        : unlocked
                                          ? 'bg-slate-100 text-slate-600'
                                          : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {completed ? (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    ) : !unlocked ? (
                                      <Lock className="w-3 h-3" />
                                    ) : (
                                      index + 1
                                    )}
                                  </div>

                                  <div className="flex-grow min-w-0">
                                    <div className={`font-medium text-sm truncate ${
                                      isActive ? 'text-white' : 'text-slate-700'
                                    }`}>
                                      {module.title}
                                    </div>
                                    {progress && (
                                      <div className={`text-[11px] ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                        Best: {progress.quizScore}% • {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </div>

                                  {module.level === 'advanced' && (
                                    <Sparkles className={`w-3 h-3 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            {/* Course Preview Video */}
            {previewVideoUrl && (
              <CoursePreviewVideo
                videoUrl={previewVideoUrl}
                title={`${course.name} — Course Overview`}
              />
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeModule.id}-${showQuiz ? 'quiz' : 'content'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {!showQuiz ? (
                  /* Module Content */
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Module Header */}
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {isWeeklyTest && <span className="mr-2">🏆</span>}
                            {activeModule.title}
                          </h1>
                          {activeModule.sectionTitle && (
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              {activeModule.sectionTitle}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              activeModule.level === 'beginner'
                                ? 'bg-emerald-100 text-emerald-700'
                                : activeModule.level === 'intermediate'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                            }`}>
                              {activeModule.level}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {activeModule.minutes} min
                            </span>
                          </div>
                        </div>

                        {isCurrentModuleCompleted && (
                          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-semibold">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section Tabs */}
                    <div className="border-b border-slate-100 bg-slate-50/60">
                      <div className="flex gap-1 p-2 flex-wrap">
                        {contentSections.map((section) => {
                          const isActive = contentSection === section.id;
                          // Soft tinted palette per section — subdued look, not popping.
                          const palette = {
                            primary: { bg: '#eef2ff', fg: '#4f46e5', ring: '#c7d2fe' },
                            amber: { bg: '#fef3c7', fg: '#b45309', ring: '#fcd34d' },
                            emerald: { bg: '#ecfdf5', fg: '#047857', ring: '#a7f3d0' },
                            violet: { bg: '#f5f3ff', fg: '#6d28d9', ring: '#ddd6fe' },
                            rose: { bg: '#fff1f2', fg: '#be123c', ring: '#fecdd3' },
                            sky: { bg: '#f0f9ff', fg: '#0369a1', ring: '#bae6fd' },
                          };
                          const tone = palette[section.color] || palette.primary;
                          return (
                            <button
                              key={section.id}
                              onClick={() => setContentSection(section.id)}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-sm transition-all border ${
                                isActive
                                  ? 'shadow-sm'
                                  : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-800'
                              }`}
                              style={
                                isActive
                                  ? {
                                      backgroundColor: tone.bg,
                                      color: tone.fg,
                                      borderColor: tone.ring,
                                    }
                                  : {}
                              }
                              data-testid={`content-tab-${section.id}`}
                            >
                              <section.icon className="w-4 h-4" />
                              {section.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 sm:p-8">
                      <AnimatePresence mode="wait">
                        {contentSection === 'learn' && (
                          <motion.div
                            key="learn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="prose prose-slate max-w-none"
                          >
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg m-0">Learn the Concept</h3>
                                <p className="text-sm text-slate-500 m-0">Read through and understand</p>
                              </div>
                            </div>
                            <MarkdownContent variant="light">
                              {activeModule.content.explanation}
                            </MarkdownContent>
                          </motion.div>
                        )}

                        {contentSection === 'example' && (
                          <motion.div
                            key="example"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                                <Lightbulb className="w-6 h-6 text-amber-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">See It In Action</h3>
                                <p className="text-sm text-slate-500">Real-world example</p>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6">
                              <MarkdownContent variant="dark">
                                {activeModule.content.example}
                              </MarkdownContent>
                            </div>
                          </motion.div>
                        )}

                        {contentSection === 'activity' && (
                          <motion.div
                            key="activity"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                <Rocket className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">Try It Yourself</h3>
                                <p className="text-sm text-slate-500">Hands-on practice</p>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
                              <MarkdownContent variant="emerald">
                                {activeModule.content.activity}
                              </MarkdownContent>
                            </div>
                          </motion.div>
                        )}

                        {contentSection === 'vocab' && hasVocab && (
                          <motion.div
                            key="vocab"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                                <Languages className="w-6 h-6 text-violet-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">Vocabulary</h3>
                                <p className="text-sm text-slate-500">Key words with Bengali meanings</p>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-violet-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                                    <th className="px-4 py-3 text-left font-semibold">English</th>
                                    <th className="px-4 py-3 text-left font-semibold">বাংলা</th>
                                    <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Example</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activeModule.content.vocab.map((item, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-violet-50'}>
                                      <td className="px-4 py-3 font-semibold text-slate-800">
                                        <button
                                          onClick={() => {
                                            if (window.speechSynthesis) {
                                              const u = new SpeechSynthesisUtterance(item.word);
                                              u.lang = 'en-US'; u.rate = 0.85;
                                              window.speechSynthesis.speak(u);
                                            }
                                          }}
                                          className="flex items-center gap-2 hover:text-violet-600 transition-colors"
                                          title="Tap to hear"
                                        >
                                          <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                                          {item.word}
                                        </button>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600">{item.meaning}</td>
                                      <td className="px-4 py-3 text-slate-500 italic hidden sm:table-cell">{item.example_sentence}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {activeModule.content.micro_grammar && (
                              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                  <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-semibold text-blue-900 text-sm mb-1">Micro Grammar</h4>
                                    <p className="text-blue-800 text-sm leading-relaxed">{activeModule.content.micro_grammar}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {contentSection === 'speak' && hasSpeak && (
                          <motion.div
                            key="speak"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center">
                                <Mic className="w-6 h-6 text-rose-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">Speaking Practice</h3>
                                <p className="text-sm text-slate-500">Dialogue, tasks & Bengali tips</p>
                              </div>
                            </div>

                            {/* Dialogue */}
                            {activeModule.content.dialogue?.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                  <MessageCircle className="w-4 h-4 text-slate-500" /> Practice Dialogue
                                </h4>
                                <div className="space-y-2">
                                  {activeModule.content.dialogue.map((line, idx) => {
                                    const isUser = line.speaker === 'You';
                                    return (
                                      <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                          isUser
                                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-md'
                                            : 'bg-slate-100 text-slate-800 rounded-bl-md'
                                        }`}>
                                          <div className={`text-xs font-semibold mb-1 ${isUser ? 'text-rose-100' : 'text-slate-500'}`}>
                                            {line.speaker}
                                          </div>
                                          <div className="text-sm leading-relaxed">{line.line}</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Speaking Task */}
                            {activeModule.content.speaking_task && (
                              <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5">
                                <h4 className="font-semibold text-rose-800 mb-2 flex items-center gap-2">
                                  <Mic className="w-4 h-4" /> Your Speaking Task
                                </h4>
                                <p className="text-rose-700 text-sm leading-relaxed mb-4">{activeModule.content.speaking_task}</p>
                                <Button
                                  onClick={() => setShowRoleplay(true)}
                                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-lg shadow-rose-200"
                                >
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Try It with AI
                                </Button>
                              </div>
                            )}

                            {/* Bengali Tip */}
                            {activeModule.content.bengali_tip && (
                              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                  <span className="text-lg flex-shrink-0">🇮🇳</span>
                                  <div>
                                    <h4 className="font-semibold text-amber-900 text-sm mb-1">Common Bengali Speaker Mistake — Fixed!</h4>
                                    <p className="text-amber-800 text-sm leading-relaxed">{activeModule.content.bengali_tip}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                        {contentSection === 'study' && (
                          <motion.div
                            key="study"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center">
                                <Paperclip className="w-6 h-6 text-sky-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">Study Materials</h3>
                                <p className="text-sm text-slate-500">Reference docs, slides and images attached to this lesson</p>
                              </div>
                            </div>
                            {hasMedia ? (
                              <MediaAttachments assets={activeModule.media_assets} variant="standalone" />
                            ) : (
                              <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Paperclip className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                <p className="text-sm font-medium">No study materials attached to this lesson yet.</p>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {contentSection === 'quiz' && (
                          <motion.div
                            key="quiz"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                                <HelpCircle className="w-6 h-6 text-violet-600" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">Quiz</h3>
                                <p className="text-sm text-slate-500">Pass with {quizPassingScore}% to unlock the next module</p>
                              </div>
                            </div>
                            {hasQuiz ? (
                              <Quiz
                                questions={quizQuestions}
                                moduleName={activeModule.title}
                                onComplete={handleQuizComplete}
                                previousAttempts={moduleProgress?.attempts || 0}
                                bestScore={moduleProgress?.quizScore || 0}
                                passingScore={quizPassingScore}
                              />
                            ) : (
                              <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                <p className="text-sm font-medium">No quiz available for this lesson.</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            onClick={goToPrevModule}
                            disabled={activeModuleIndex === 0}
                            className="text-slate-600 disabled:opacity-50"
                            data-testid="journey-prev-btn"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={handleSpeakAloud}
                            disabled={isSpeaking}
                            className="text-slate-600 disabled:opacity-50"
                            data-testid="journey-speak-btn"
                          >
                            <Volume2 className="w-4 h-4 mr-1" />
                            {isSpeaking ? 'Speaking...' : 'Read Aloud'}
                          </Button>
                        </div>

                        <div className="flex items-center gap-3">
                          {isCurrentModuleCompleted ? (
                            <Button
                              onClick={goToNextModule}
                              disabled={activeModuleIndex === modules.length - 1}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200"
                              data-testid="journey-next-btn"
                            >
                              {activeModuleIndex === modules.length - 1 ? (
                                <>
                                  <Home className="w-4 h-4 mr-2" />
                                  Journey Complete!
                                </>
                              ) : (
                                <>
                                  Next Module
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                setContentSection('quiz');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30"
                              data-testid="journey-quiz-btn"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Take Quiz to Continue
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Quiz Section */
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 mb-1">
                            Quiz: {activeModule.title}
                          </h2>
                          <p className="text-slate-500 text-sm">
                            Pass with 70% to unlock the next module
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => setShowQuiz(false)}
                          className="text-slate-500 hover:text-slate-700"
                          data-testid="quiz-back-btn"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Back to Content
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8">
                      <Quiz
                        questions={Array.isArray(activeModule.quiz) ? activeModule.quiz : activeModule.quiz?.questions || []}
                        moduleName={activeModule.title}
                        onComplete={handleQuizComplete}
                        previousAttempts={moduleProgress?.attempts || 0}
                        bestScore={moduleProgress?.quizScore || 0}
                        passingScore={quizPassingScore}
                      />
                    </div>

                    {/* Next Module CTA after passing */}
                    {isCurrentModuleCompleted && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 sm:p-8 border-t border-slate-100 bg-emerald-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            <span className="font-semibold text-emerald-800">Module Completed!</span>
                          </div>
                          {activeModuleIndex < modules.length - 1 && (
                            <Button
                              onClick={() => selectModule(activeModuleIndex + 1)}
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Continue to Next Module
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* Roleplay Chat Panel */}
      {showRoleplay && (
        <RoleplayChat
          toolId={course.id}
          moduleId={activeModule.id}
          moduleName={activeModule.title}
          speakingTask={activeModule.content?.speaking_task || ''}
          onClose={() => setShowRoleplay(false)}
        />
      )}

    </div>
  );
};

export default JourneyPlayer;
