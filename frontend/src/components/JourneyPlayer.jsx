import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Lock, CheckCircle2,
  BookOpen, Lightbulb, Rocket, Play, Award,
  Clock, Sparkles, ArrowLeft, Home, Volume2,
  Languages, Mic, MessageCircle, Trophy, AlertTriangle, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Quiz } from './Quiz';
import RoleplayChat from './RoleplayChat';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { SafetyBanner } from './SafetyBanner';
import { Paywall, PaywallBanner } from './Paywall';
import { CoursePreviewVideo } from './CoursePreviewVideo';

export const JourneyPlayer = ({
  tool,
  modules,
  isModuleCompleted,
  isModuleUnlocked,
  getModuleProgress,
  completeModule,
  initialModuleId = null,
  // Paywall props (optional — backwards compatible)
  enrolled = true,
  isModuleFree = () => true,
  freeModuleCount = 999,
  pricing = null,
  previewVideoUrl = '',
}) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showRoleplay, setShowRoleplay] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [contentSection, setContentSection] = useState('learn'); // 'learn', 'example', 'activity', 'vocab', 'speak'
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      if (index >= 0 && isModuleUnlocked(tool.id, initialModuleId)) {
        setActiveModuleIndex(index);
        return;
      }
    }
    
    // Find first incomplete unlocked module (resume functionality)
    const resumeIndex = modules.findIndex((m, i) => {
      if (i === 0) return !isModuleCompleted(tool.id, m.id);
      const prevModule = modules[i - 1];
      return isModuleCompleted(tool.id, prevModule.id) && !isModuleCompleted(tool.id, m.id);
    });
    
    if (resumeIndex >= 0) {
      setActiveModuleIndex(resumeIndex);
    }
  }, [initialModuleId, modules, tool.id, isModuleCompleted, isModuleUnlocked]);

  const moduleProgress = getModuleProgress(tool.id, activeModule?.id);
  const isCurrentModuleCompleted = isModuleCompleted(tool.id, activeModule?.id);
  const completedCount = useMemo(
    () => modules.filter(m => isModuleCompleted(tool.id, m.id)).length,
    [modules, tool.id, isModuleCompleted]
  );
  const progressPercent = Math.round((completedCount / modules.length) * 100);

  // Handle quiz completion
  const handleQuizComplete = useCallback((score, passed, attempts) => {
    if (passed) {
      completeModule(tool.id, activeModule.id, score);
    }
  }, [tool.id, activeModule?.id, completeModule]);

  // Navigate to next module — with paywall check
  const goToNextModule = useCallback(() => {
    const nextIndex = activeModuleIndex + 1;
    if (nextIndex < modules.length) {
      if (!enrolled && !isModuleFree(nextIndex)) {
        setShowPaywall(true);
        return;
      }
      setActiveModuleIndex(nextIndex);
      setShowQuiz(false);
      setContentSection('learn');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeModuleIndex, modules.length, enrolled, isModuleFree]);

  // Navigate to previous module
  const goToPrevModule = useCallback(() => {
    if (activeModuleIndex > 0) {
      setActiveModuleIndex(prev => prev - 1);
      setShowQuiz(false);
      setContentSection('learn');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeModuleIndex]);

  // Select specific module — enforces paywall on top of sequential unlock
  const selectModule = useCallback((index) => {
    const module = modules[index];
    // Paywall gate: if not enrolled and module is beyond free preview, show paywall
    if (!enrolled && !isModuleFree(index)) {
      setShowPaywall(true);
      return;
    }
    if (isModuleUnlocked(tool.id, module.id)) {
      setActiveModuleIndex(index);
      setShowQuiz(false);
      setContentSection('learn');
    }
  }, [modules, tool.id, isModuleUnlocked, enrolled, isModuleFree]);

  if (!activeModule) return null;

  // Check if this module has spoken-english extended fields
  const hasVocab = activeModule?.content?.vocab?.length > 0;
  const hasSpeak = activeModule?.content?.dialogue?.length > 0 || activeModule?.content?.speaking_task;
  const isWeeklyTest = activeModule?.is_weekly_test;
  const moduleDay = activeModule?.day;
  const moduleWeek = activeModule?.week;

  const contentSections = [
    { id: 'learn', label: 'Learn', icon: BookOpen, color: 'primary' },
    { id: 'example', label: 'Example', icon: Lightbulb, color: 'amber' },
    { id: 'activity', label: 'Try It', icon: Rocket, color: 'emerald' },
    ...(hasVocab ? [{ id: 'vocab', label: 'Vocab', icon: Languages, color: 'violet' }] : []),
    ...(hasSpeak ? [{ id: 'speak', label: 'Speak', icon: Mic, color: 'rose' }] : [])
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
              <Link 
                to="/learn" 
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                data-testid="journey-back-btn"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </Link>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${tool.color}20` }}
                >
                  {tool.icon}
                </div>
                <div className="hidden sm:block">
                  <h2 className="font-semibold text-slate-900 text-sm">{tool.name}</h2>
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
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-200">
              <Award className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-amber-700">{tool.xpReward} XP</span>
            </div>
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
                
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                  {modules.map((module, index) => {
                    const completed = isModuleCompleted(tool.id, module.id);
                    const unlocked = isModuleUnlocked(tool.id, module.id);
                    const isActive = index === activeModuleIndex;
                    const progress = getModuleProgress(tool.id, module.id);
                    const isFree = enrolled || isModuleFree(index);
                    const isPaywalled = !isFree;

                    // Show paywall banner right after the last free module
                    const showBannerAfter = !enrolled && index === freeModuleCount;

                    return (
                      <div key={module.id}>
                        {showBannerAfter && (
                          <PaywallBanner pricing={pricing} freeModuleCount={freeModuleCount} />
                        )}
                        <motion.button
                          onClick={() => selectModule(index)}
                          disabled={isPaywalled || !unlocked}
                          whileHover={(isFree && unlocked) ? { x: 4 } : {}}
                          className={`w-full text-left p-3 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                            isActive
                              ? 'bg-primary text-white shadow-lg shadow-primary/30'
                              : isPaywalled
                                ? 'opacity-40 cursor-not-allowed'
                                : unlocked
                                  ? 'hover:bg-slate-50'
                                  : 'opacity-50 cursor-not-allowed'
                          }`}
                          data-testid={`module-nav-${module.id}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                            isPaywalled
                              ? 'bg-amber-100 text-amber-500'
                              : completed
                                ? 'bg-emerald-500 text-white'
                                : isActive
                                  ? 'bg-white/20 text-white'
                                  : unlocked
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isPaywalled ? (
                              <Lock className="w-3 h-3" />
                            ) : completed ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : !unlocked ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              index + 1
                            )}
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className={`font-medium text-sm truncate ${
                              isActive ? 'text-white'
                              : isPaywalled ? 'text-slate-400'
                              : 'text-slate-700'
                            }`}>
                              {module.title}
                            </div>
                            {progress && !isPaywalled && (
                              <div className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                Best: {progress.quizScore}% • {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>

                          {isPaywalled && (
                            <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">PRO</span>
                          )}
                          {!isPaywalled && module.level === 'advanced' && (
                            <Sparkles className={`w-3 h-3 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                          )}
                        </motion.button>
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
                title={`${tool.name} — Course Overview`}
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
                          <div className="flex items-center gap-2 mb-2">
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
                          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                            {isWeeklyTest && <span className="mr-2">🏆</span>}
                            {activeModule.title}
                          </h1>
                          <p className="text-slate-500 max-w-2xl flex items-center gap-2">
                            Module {activeModuleIndex + 1} of {modules.length}
                            {moduleDay && moduleWeek && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                <Calendar className="w-3 h-3" />
                                Day {moduleDay} • Week {moduleWeek}
                              </span>
                            )}
                          </p>
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
                    <div className="border-b border-slate-100">
                      <div className="flex gap-1 p-2">
                        {contentSections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setContentSection(section.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                              contentSection === section.id
                                ? `bg-${section.color === 'primary' ? 'primary' : section.color + '-500'} text-white shadow-lg`
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            style={contentSection === section.id ? {
                              backgroundColor: section.color === 'primary' ? '#6366f1' :
                                section.color === 'amber' ? '#f59e0b' :
                                section.color === 'violet' ? '#8b5cf6' :
                                section.color === 'rose' ? '#f43f5e' : '#10b981'
                            } : {}}
                            data-testid={`content-tab-${section.id}`}
                          >
                            <section.icon className="w-4 h-4" />
                            {section.label}
                          </button>
                        ))}
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
                            <div className="text-slate-600 leading-relaxed whitespace-pre-line text-[15px]">
                              {activeModule.content.explanation}
                            </div>
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
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-slate-200 leading-relaxed whitespace-pre-line text-[15px]">
                              {activeModule.content.example}
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
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 text-slate-700 leading-relaxed whitespace-pre-line text-[15px]">
                              {activeModule.content.activity}
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
                              onClick={() => setShowQuiz(true)}
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
                              onClick={goToNextModule}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              data-testid="quiz-next-module-btn"
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
          toolId={tool.id}
          moduleId={activeModule.id}
          moduleName={activeModule.title}
          speakingTask={activeModule.content?.speaking_task || ''}
          onClose={() => setShowRoleplay(false)}
        />
      )}

      {/* Paywall Modal */}
      <AnimatePresence>
        {showPaywall && pricing && (
          <Paywall
            pricing={pricing}
            moduleName={activeModule?.title || ''}
            freeModuleCount={freeModuleCount}
            totalModules={modules.length}
            onClose={() => setShowPaywall(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JourneyPlayer;
