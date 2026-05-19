import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ChevronDown, Lock, CheckCircle2,
  BookOpen, Lightbulb, Rocket, Play, Award,
  Clock, Sparkles, ArrowLeft, Volume2,
  Languages, Mic, MessageCircle,
  FileText, Paperclip, HelpCircle, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Quiz } from './Quiz';
import RoleplayChat from './RoleplayChat';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { SafetyBanner } from './SafetyBanner';
import { CoursePreviewVideo } from './CoursePreviewVideo';
import { MarkdownContent } from './MarkdownContent';
import { PromptLabPanel } from './PromptLabPanel';
import { useLearningProgress } from '../hooks/useLearningProgress';

const numericId = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

export const JourneyPlayer = ({
  tool,
  course: courseProp,
  modules,
  sections,
  isModuleCompleted,
  isModuleUnlocked,
  getModuleProgress,
  completeModule,
  initialModuleId,
  previewVideoUrl,
  previewMode = false,
}) => {
  const course = courseProp || tool;
  const backendBase = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
  const { startLesson, sendLessonHeartbeat, completeLesson, startAssessment, submitAssessment, getAttemptsCount } = useLearningProgress();
  const heartbeatIntervalRef = useRef(null);

  // Support both legacy flat modules and new hierarchical sections structure
  // If sections are provided, use them; otherwise flatten modules for backward compatibility
  const sectionsData = useMemo(() => {
    if (sections && Array.isArray(sections) && sections.length > 0) {
      return sections;
    }

    // Legacy: group flat modules by sectionTitle
    const byTitle = new Map();
    (modules || []).forEach((mod, index) => {
      const title = mod.sectionTitle || 'Lessons';
      const order = mod.sectionOrder ?? 0;
      let group = byTitle.get(title);
      if (!group) {
        group = { id: title, title, order, lessons: [] };
        byTitle.set(title, group);
      }
      group.lessons.push({ ...mod, originalIndex: index });
    });
    return Array.from(byTitle.values()).sort((a, b) => a.order - b.order);
  }, [modules, sections]);

  // Flatten all lessons for active module tracking
  const allLessons = useMemo(() => {
    const lessons = [];
    sectionsData.forEach(section => {
      section.lessons.forEach(lesson => {
        lessons.push(lesson);
      });
    });
    return lessons;
  }, [sectionsData]);

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showRoleplay, setShowRoleplay] = useState(false);
  const [contentSection, setContentSection] = useState('learn'); // 'learn', 'example', 'activity', 'vocab', 'speak'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set());
  const [quizAttempts, setQuizAttempts] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive activeModule early so callbacks can reference it
  const activeModule = allLessons[activeModuleIndex];
  const courseDbId = numericId(course?.db_id || course?.course_id || course?.id);
  const activeLessonDbId = numericId(activeModule?.db_id || activeModule?.lesson_id || activeModule?.id);
  const activeModuleDbId = numericId(activeModule?.module_db_id || activeModule?.moduleId || activeModule?.section_db_id || activeModule?.sectionId);
  const activeQuizDbId = numericId(activeModule?.quiz?.id || activeModule?.quiz_id || activeModule?.id);

  // Load quiz attempt count when quiz section is shown
  useEffect(() => {
    const loadQuizAttempts = async () => {
      if (activeQuizDbId && (contentSection === 'quiz' || showQuiz)) {
        try {
          const count = await getAttemptsCount('quiz', activeQuizDbId);
          setQuizAttempts(count);
        } catch (err) {
          console.error('Failed to load quiz attempts:', err);
          setQuizAttempts(0);
        }
      }
    };
    loadQuizAttempts();
  }, [activeQuizDbId, contentSection, showQuiz, getAttemptsCount]);

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

    // If speaking, pause it
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }

    // If paused, resume it
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    // If not speaking, start from the beginning
    const text = getSpeechText();
    if (!text) return;

    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  }, [getSpeechText, stopSpeech, isSpeaking, isPaused]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Start lesson progress when active lesson changes
  useEffect(() => {
    if (activeLessonDbId && courseDbId && activeModuleDbId && !previewMode) {
      startLesson(activeLessonDbId, courseDbId, activeModuleDbId).catch((err) => {
        console.error('Failed to start lesson progress:', err);
      });

      // Start heartbeat interval (every 30 seconds)
      heartbeatIntervalRef.current = setInterval(() => {
        sendLessonHeartbeat(activeLessonDbId, 30).catch((err) => {
          console.error('Failed to send lesson heartbeat:', err);
        });
      }, 30000);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      };
    }
  }, [activeLessonDbId, courseDbId, activeModuleDbId, previewMode, startLesson, sendLessonHeartbeat]);

  // Find initial module or first unlocked incomplete module
  useEffect(() => {
    if (initialModuleId) {
      const index = allLessons.findIndex(m => m.id === initialModuleId);
      if (index >= 0 && isModuleUnlocked(course.id, initialModuleId)) {
        setActiveModuleIndex(index);
        return;
      }
    }

    // Find first incomplete unlocked module (resume functionality)
    const resumeIndex = allLessons.findIndex((m, i) => {
      if (i === 0) return !isModuleCompleted(course.id, m.id);
      const prevModule = allLessons[i - 1];
      return isModuleCompleted(course.id, prevModule.id) && !isModuleCompleted(course.id, m.id);
    });

    if (resumeIndex >= 0) {
      setActiveModuleIndex(resumeIndex);
    }
  }, [initialModuleId, allLessons, course.id, isModuleCompleted, isModuleUnlocked]);

  const moduleProgress = getModuleProgress(course.id, activeModule?.id);
  const isCurrentModuleCompleted = isModuleCompleted(course.id, activeModule?.id);
  const completedCount = useMemo(
    () => allLessons.filter(m => isModuleCompleted(course.id, m.id)).length,
    [allLessons, course.id, isModuleCompleted]
  );
  const progressPercent = Math.round((completedCount / allLessons.length) * 100);

  // Handle quiz completion
  const handleQuizComplete = useCallback(async (score, passed, _attempts) => {
    if (previewMode) {
      if (passed) {
        completeModule(course.id, activeModule.id, score);
      }
      return;
    }

    try {
      // Get attempt count for this quiz
      if (!activeQuizDbId || !courseDbId) {
        throw new Error('Missing numeric quiz or course id');
      }
      const attemptCount = await getAttemptsCount('quiz', activeQuizDbId);
      
      // Start new assessment attempt - backend will calculate the correct attempt_number
      const attempt = await startAssessment({
        course_id: courseDbId,
        assessment_type: 'quiz',
        assessment_id: activeQuizDbId,
        attempt_number: attemptCount + 1, // Backend will override this with correct value
        lesson_id: activeLessonDbId,
        module_id: activeModuleDbId,
      });

      // Submit the attempt with score
      await submitAssessment(
        attempt.id,
        score,
        100, // max score
        passed,
        0, // time spent (can be calculated if needed)
        passed ? 'Great job! Quiz completed successfully.' : 'Keep practicing!'
      );
      
      // Reload the attempt count from database to get the correct value
      const newAttemptCount = await getAttemptsCount('quiz', activeQuizDbId);
      setQuizAttempts(newAttemptCount);

      if (passed) {
        completeModule(course.id, activeModule.id, score);
        completeLesson(activeLessonDbId).catch((err) => {
          console.error('Failed to complete lesson:', err);
        });
      }
    } catch (err) {
      console.error('Failed to submit quiz attempt:', err);
      // Fallback to local completion if API fails
      if (passed) {
        completeModule(course.id, activeModule.id, score);
      }
    }
  }, [course.id, courseDbId, activeModule, activeQuizDbId, activeLessonDbId, activeModuleDbId, previewMode, completeModule, getAttemptsCount, startAssessment, submitAssessment, completeLesson]);

  const scrollToLessonTitle = useCallback(() => {
    setTimeout(() => {
      const courseContent = document.getElementById('course-content');
      if (courseContent) {
        const headerOffset = 120; // Account for website header and lesson header banner
        const elementPosition = courseContent.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, []);

  // Handle back to content from quiz results
  const handleBackToContent = useCallback(() => {
    setShowQuiz(false);
    setContentSection('learn');
    scrollToLessonTitle();
  }, [scrollToLessonTitle]);

  // Handle continue to next lesson after quiz completion
  const handleContinueToNext = useCallback(() => {
    stopSpeech();
    const nextIndex = activeModuleIndex + 1;
    if (nextIndex < allLessons.length) {
      setActiveModuleIndex(nextIndex);
      setShowQuiz(false);
      setContentSection('learn');
      setQuizAttempts(0);
      scrollToLessonTitle();
    }
  }, [activeModuleIndex, allLessons.length, stopSpeech, scrollToLessonTitle]);

  // Navigate to next module
  const goToNextModule = useCallback(() => {
    stopSpeech();
    const nextIndex = activeModuleIndex + 1;
    if (nextIndex < allLessons.length) {
      setActiveModuleIndex(nextIndex);
      setShowQuiz(false);
      setContentSection('learn');
      scrollToLessonTitle();
    }
  }, [activeModuleIndex, allLessons.length, stopSpeech, scrollToLessonTitle]);

  // Navigate to previous module
  const goToPrevModule = useCallback(() => {
    stopSpeech();
    if (activeModuleIndex > 0) {
      setActiveModuleIndex(prev => prev - 1);
      setShowQuiz(false);
      setContentSection('learn');
      scrollToLessonTitle();
    }
  }, [activeModuleIndex, stopSpeech, scrollToLessonTitle]);

  // Select specific module
  const selectModule = useCallback((index) => {
    stopSpeech();
    const module = allLessons[index];
    if (isModuleUnlocked(course.id, module.id)) {
      setActiveModuleIndex(index);
      setShowQuiz(false);
      setContentSection('learn');
      setQuizAttempts(0);
      scrollToLessonTitle();
    }
  }, [allLessons, course.id, isModuleUnlocked, stopSpeech, scrollToLessonTitle]);

  if (!activeModule) return null;

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const hasMultipleSections = sectionsData.length > 1;

  // Check if this module has spoken-english extended fields
  const hasVocab = activeModule?.content?.vocab?.length > 0;
  const hasSpeak = activeModule?.content?.dialogue?.length > 0 || activeModule?.content?.speaking_task;
  const isWeeklyTest = activeModule?.is_weekly_test;

  const quizQuestions = Array.isArray(activeModule.quiz)
    ? activeModule.quiz
    : (activeModule.quiz?.questions || []);
  const hasQuiz = quizQuestions.length > 0;
  const quizPassingScore = (() => {
    const raw = activeModule.quiz?.passing_score;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 && n <= 100 ? Math.round(n) : 70;
  })();

  const contentSections = [
    { id: 'learn', label: 'Learn', icon: BookOpen, color: 'primary' },
    { id: 'example', label: 'Example', icon: Lightbulb, color: 'amber' },
    { id: 'activity', label: 'Lab', icon: Rocket, color: 'emerald' },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'violet' },
    ...(hasVocab ? [{ id: 'vocab', label: 'Vocab', icon: Languages, color: 'violet' }] : []),
    ...(hasSpeak ? [{ id: 'speak', label: 'Speak', icon: Mic, color: 'rose' }] : []),
    { id: 'study', label: 'Media', icon: Paperclip, color: 'sky' },
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
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${course.color}20` }}
                >
                  {course.icon}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 text-sm truncate">{course.name}</h2>
                  <p className="text-xs text-slate-500">{completedCount}/{allLessons.length} lessons</p>
                </div>
              </div>
            </div>

            {/* Progress Bar - Desktop */}
            <div className="flex-grow max-w-xs hidden md:block">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>{progressPercent}% complete</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Progress Donut - Mobile */}
            <div className="flex-shrink-0 md:hidden">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#4338ca"
                    strokeWidth="3"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-700">{progressPercent}%</span>
                </div>
              </div>
            </div>

            {/* XP Badge */}
            {!previewMode && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 rounded-xl border border-amber-200 flex-shrink-0">
                <Award className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-700 text-sm">{course.xpReward} XP</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 lg:items-start">
          {/* Module Sidebar — always top-aligned with the content column so
              the learning path doesn't centre-align when the main panel is
              taller than the sidebar. */}
          <div className="hidden lg:block lg:col-span-3 order-2 lg:order-1 self-start">
            <div className="lg:sticky lg:top-36">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Learning Path
                  </h3>
                </div>
                
                <div className="p-2 max-h-[70vh] overflow-y-auto">
                  {sectionsData.map((section) => {
                    const collapsed = collapsedSections.has(section.id);
                    const lessons = section.lessons || [];
                    const total = lessons.length;
                    const doneCount = lessons.filter((lesson) =>
                      isModuleCompleted(course.id, lesson.id),
                    ).length;
                    const containsActive = lessons.some((lesson) => lesson.id === activeModule?.id);

                    return (
                      <div key={section.id} className="mb-2">
                        {hasMultipleSections && (
                          <button
                            onClick={() => toggleSection(section.id)}
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
                              {section.title}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                              {doneCount}/{total}
                            </span>
                          </button>
                        )}

                        {!collapsed && (
                          <div className={hasMultipleSections ? 'pl-3 ml-2 border-l border-slate-100 mt-1' : ''}>
                            {lessons.map((lesson, _idx) => {
                              // Find the global index for this lesson
                              const globalIndex = allLessons.findIndex(l => l.id === lesson.id);
                              const completed = isModuleCompleted(course.id, lesson.id);
                              const unlocked = isModuleUnlocked(course.id, lesson.id);
                              const isActive = globalIndex === activeModuleIndex;
                              const progress = getModuleProgress(course.id, lesson.id);

                              return (
                                <motion.button
                                  key={lesson.id}
                                  onClick={() => selectModule(globalIndex)}
                                  disabled={!unlocked}
                                  whileHover={unlocked ? { x: 4 } : {}}
                                  className={`w-full text-left p-2.5 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                                    isActive
                                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                      : unlocked
                                        ? 'hover:bg-slate-50'
                                        : 'opacity-50 cursor-not-allowed'
                                  }`}
                                  data-testid={`module-nav-${lesson.id}`}
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
                                      globalIndex + 1
                                    )}
                                  </div>

                                  <div className="flex-grow min-w-0">
                                    <div className={`font-medium text-sm truncate ${
                                      isActive ? 'text-white' : 'text-slate-700'
                                    }`}>
                                      {lesson.title}
                                    </div>
                                    {progress && progress.bestScore > 0 && (
                                      <div className={`text-[11px] ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                        Best: {progress.bestScore}%
                                      </div>
                                    )}
                                  </div>

                                  {lesson.level === 'advanced' && (
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
          <div className="col-span-12 lg:col-span-9 order-1 lg:order-2 w-full min-w-0">

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeModule.id}-${showQuiz ? 'quiz' : 'content'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full min-w-0"
              >
                {!showQuiz ? (
                  /* Module Content */
                  <div id="course-content" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full min-w-0">
                    {/* Module Header */}
                    <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">
                            {isWeeklyTest && <span className="mr-2">🏆</span>}
                            {activeModule.title}
                          </h1>
                          {activeModule.sectionTitle && (
                            <p className="mt-1 text-sm font-medium text-slate-500 truncate">
                              {activeModule.sectionTitle}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
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
                          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-semibold text-sm">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section Tabs */}
                    <div className="border-b border-slate-100 bg-slate-50/60">
                      <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-2">
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
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-sm transition-all border whitespace-nowrap flex-shrink-0 ${
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
                    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
                      <AnimatePresence mode="wait">
                        {contentSection === 'learn' && (
                          <motion.div
                            key="learn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="prose prose-sm sm:prose prose-slate max-w-none overflow-x-hidden"
                          >
                            {/* Lesson Highlight Video - show at the top if a media asset is highlighted */}
                            {(() => {
                              const highlightedMedia = Array.isArray(activeModule.media_assets) 
                                ? activeModule.media_assets.find(asset => asset.is_highlight)
                                : null;
                              
                              if (!highlightedMedia) return null;
                              
                              const kind = highlightedMedia.asset_type || highlightedMedia.type;
                              const mimeType = highlightedMedia.mime_type;
                              const isYoutube = mimeType === 'video/youtube' || highlightedMedia.cloudinary_url?.includes('youtube');
                              
                              let videoUrl = null;
                              let videoTitle = highlightedMedia.original_filename || 'Lesson Video';
                              
                              if (kind === 'video') {
                                // Use the video file (streaming_url if available, otherwise cloudinary_url)
                                videoUrl = highlightedMedia.streaming_url || highlightedMedia.cloudinary_url;
                              } else if (isYoutube) {
                                // Use YouTube link
                                videoUrl = highlightedMedia.cloudinary_url;
                              }
                              
                              if (!videoUrl) return null;
                              
                              return (
                                <div className="mb-6">
                                  <CoursePreviewVideo
                                    videoUrl={videoUrl}
                                    title={videoTitle}
                                  />
                                </div>
                              );
                            })()}
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg m-0 break-words">Learn the Concept</h3>
                                <p className="text-sm text-slate-500 m-0 truncate">Read through and understand</p>
                              </div>
                              <button
                                onClick={handleSpeakAloud}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                                title={isPaused ? 'Resume reading' : isSpeaking ? 'Pause reading' : 'Read aloud'}
                              >
                                <Volume2 className={`w-5 h-5 ${isSpeaking && !isPaused ? 'text-primary' : 'text-slate-400'}`} />
                                <span className="text-sm font-medium text-slate-600 hidden sm:inline">
                                  {isPaused ? 'Resume' : isSpeaking ? 'Pause' : 'Read Aloud'}
                                </span>
                              </button>
                            </div>
                            <div className="overflow-x-hidden">
                              <MarkdownContent variant="light">
                                {activeModule.content.explanation}
                              </MarkdownContent>
                            </div>
                          </motion.div>
                        )}

                        {contentSection === 'example' && (
                          <motion.div
                            key="example"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="overflow-x-hidden"
                          >
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg break-words">See It In Action</h3>
                                <p className="text-sm text-slate-500 truncate">Real-world example</p>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-x-hidden">
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
                            className="overflow-x-hidden space-y-5"
                          >
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg break-words">Lab</h3>
                                <p className="text-sm text-slate-500 truncate">Practise the lesson task with AI</p>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-x-hidden">
                              <MarkdownContent variant="emerald">
                                {activeModule.content.activity}
                              </MarkdownContent>
                            </div>
                            {/* In-lesson AI workspace. AI courses get the Prompt-Lab
                                builder (themed per tool via tool_id). Conversational
                                English courses get the inline RoleplayChat for live
                                speaking practice. Anything else just shows the
                                activity markdown above. */}
                            {course?.category_id === 'ai-learning' && (
                              <PromptLabPanel toolId={course.id} />
                            )}
                            {course?.category_id === 'spoken-writing-english' && (
                              <RoleplayChat
                                inline
                                toolId={course.id}
                                moduleId={activeModule.id}
                                moduleName={activeModule.title}
                                speakingTask={activeModule.content?.speaking_task || ''}
                              />
                            )}
                          </motion.div>
                        )}

                        {contentSection === 'vocab' && hasVocab && (
                          <motion.div
                            key="vocab"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="overflow-x-hidden"
                          >
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-violet-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Languages className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg break-words">Key Vocabulary</h3>
                                <p className="text-sm text-slate-500 truncate">Important terms & definitions</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {activeModule.content.vocab.map((item, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 overflow-x-hidden">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-violet-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <span className="text-violet-700 font-bold text-sm">{idx + 1}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-violet-900 text-base sm:text-lg break-words">{item.term}</div>
                                      <div className="text-violet-700 text-sm sm:text-base mt-1 break-words">{item.definition}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {activeModule.content.micro_grammar && (
                              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 overflow-x-hidden">
                                <div className="flex items-start gap-3">
                                  <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-blue-900 text-sm mb-1 break-words">Micro Grammar</h4>
                                    <p className="text-blue-800 text-sm leading-relaxed break-words">{activeModule.content.micro_grammar}</p>
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
                            className="space-y-6 overflow-x-hidden"
                          >
                            <div className="flex items-center gap-3 mb-2 sm:mb-6">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg break-words">Speaking Practice</h3>
                                <p className="text-sm text-slate-500 truncate">Dialogue, tasks & Bengali tips</p>
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
                                        <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 ${
                                          isUser
                                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-md'
                                            : 'bg-slate-100 text-slate-800 rounded-bl-md'
                                        }`}>
                                          <div className={`text-xs font-semibold mb-1 ${isUser ? 'text-rose-100' : 'text-slate-500'}`}>
                                            {line.speaker}
                                          </div>
                                          <div className="text-sm leading-relaxed break-words">{line.line}</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Speaking Task */}
                            {activeModule.content.speaking_task && (
                              <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 overflow-x-hidden">
                                <h4 className="font-semibold text-rose-800 mb-2 flex items-center gap-2">
                                  <Mic className="w-4 h-4" /> Your Speaking Task
                                </h4>
                                <p className="text-rose-700 text-sm leading-relaxed mb-4 break-words">{activeModule.content.speaking_task}</p>
                                <Button
                                  onClick={() => setShowRoleplay(true)}
                                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white w-full sm:w-auto"
                                >
                                  <Mic className="w-4 h-4 mr-2" />
                                  Start Practice
                                </Button>
                              </div>
                            )}

                            {/* Bengali Tip */}
                            {activeModule.content.bengali_tip && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-4 overflow-x-hidden">
                                <div className="flex items-start gap-3">
                                  <span className="text-lg flex-shrink-0">🇮🇳</span>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-amber-900 text-sm mb-1 break-words">Bengali Tip</h4>
                                    <p className="text-amber-800 text-sm leading-relaxed break-words">{activeModule.content.bengali_tip}</p>
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
                            className="overflow-x-hidden space-y-4"
                          >
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Paperclip className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg break-words">Media</h3>
                                <p className="text-sm text-slate-500 truncate">Attached files & study notes</p>
                              </div>
                            </div>

                            {/* Attached files — images / videos / documents. This tab used
                                to render only `content.study_notes` (a markdown blob), so
                                uploaded media never showed up. Now we render the files
                                first and fall back to study notes / an empty state below.
                                Highlighted media is excluded since it's shown at the top of the Learn tab. */}
                            {Array.isArray(activeModule.media_assets) && activeModule.media_assets.length > 0 ? (
                              <div className="space-y-3">
                                {activeModule.media_assets.filter(asset => !asset.is_highlight).map((asset) => {
                                  const kind = asset.asset_type || asset.type;
                                  const mediaEndpoint = `${backendBase}/api/content/media/${asset.id}`;
                                  const viewUrl = mediaEndpoint;
                                  const downloadUrl = `${mediaEndpoint}/download`;
                                  const url = asset.cloudinary_url || mediaEndpoint;
                                  if (kind === 'image') {
                                    return (
                                      <div key={asset.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                                        <img
                                          src={url}
                                          alt={asset.alt_text || asset.original_filename || ''}
                                          className="w-full max-h-[480px] object-contain bg-slate-50"
                                          loading="lazy"
                                        />
                                        {asset.original_filename && (
                                          <div className="px-3 py-2 flex items-center justify-between gap-3">
                                            <p className="text-xs text-slate-500 truncate">{asset.original_filename}</p>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <a
                                                href={downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900"
                                              >
                                                <Download className="w-3.5 h-3.5" />
                                                Download
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  if (kind === 'video') {
                                    return (
                                      <div key={asset.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                                        <video
                                          controls
                                          preload="metadata"
                                          poster={asset.poster_url || undefined}
                                          className="w-full bg-black"
                                        >
                                          {asset.streaming_url && (
                                            <source src={asset.streaming_url} type="application/x-mpegURL" />
                                          )}
                                          <source src={url} type={asset.mime_type || 'video/mp4'} />
                                          Your browser cannot play this video.
                                        </video>
                                        <div className="px-3 py-2 flex items-center justify-between gap-3">
                                          <p className="text-xs text-slate-500 truncate">
                                            {asset.original_filename || 'Video file'}
                                          </p>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <a
                                              href={downloadUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                              Download
                                            </a>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  // Document / unknown — show explicit view + download controls.
                                  const isYoutube = asset.mime_type === 'video/youtube' || asset.cloudinary_url?.includes('youtube');
                                  
                                  if (isYoutube) {
                                    return (
                                      <div key={asset.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                                        <div className="aspect-video bg-slate-900">
                                          <iframe
                                            src={asset.cloudinary_url}
                                            title={asset.original_filename}
                                            className="w-full h-full"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                          />
                                        </div>
                                        <div className="px-3 py-2">
                                          <p className="text-xs text-slate-500 truncate">{asset.original_filename || 'YouTube Video'}</p>
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div
                                      key={asset.id}
                                      className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3"
                                    >
                                      <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">
                                          {asset.original_filename || 'Attached file'}
                                        </p>
                                        {asset.file_size_bytes ? (
                                          <p className="text-xs text-slate-400">
                                            {(asset.file_size_bytes / 1024).toFixed(0)} KB
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <a
                                          href={downloadUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          Download
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}

                            {/* Optional study-notes markdown — only render when present and
                                non-empty, so it doesn't drown out the empty state below. */}
                            {activeModule.content?.study_notes ? (
                              <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-x-hidden">
                                <MarkdownContent variant="sky">
                                  {activeModule.content.study_notes}
                                </MarkdownContent>
                              </div>
                            ) : null}

                            {(!Array.isArray(activeModule.media_assets) || activeModule.media_assets.length === 0)
                              && !activeModule.content?.study_notes && (
                              <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Paperclip className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                <p className="text-sm font-medium">No media or study notes for this lesson yet.</p>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Quiz tab — Quiz must only mount when there's at
                            least one question. Mounting it with an empty
                            `questions` array crashes (Quiz reads
                            `questions[0].explanation`), which the global
                            ErrorBoundary then catches as a sitewide white
                            screen until the page is reloaded. */}
                        {contentSection === 'quiz' && hasQuiz && (
                          <motion.div
                            key="quiz"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="overflow-x-hidden"
                          >
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg break-words">Quiz</h3>
                                <p className="text-sm text-slate-500 truncate">Test your knowledge</p>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-primary/5 to-violet-50 border border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-x-hidden">
                              <Quiz
                                questions={quizQuestions}
                                onComplete={handleQuizComplete}
                                onBackToContent={handleBackToContent}
                                onContinueToNext={handleContinueToNext}
                                moduleName={activeModule.title}
                                previousAttempts={quizAttempts}
                                bestScore={moduleProgress?.quizScore || 0}
                                passingScore={quizPassingScore}
                              />
                            </div>
                          </motion.div>
                        )}
                        {contentSection === 'quiz' && !hasQuiz && (
                          <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm font-medium">No quiz available for this lesson.</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between gap-4">
                        <Button
                          onClick={goToPrevModule}
                          disabled={activeModuleIndex === 0}
                          variant="outline"
                          className="flex-1 sm:flex-none px-3 sm:px-4 text-sm sm:text-base"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Previous</span>
                          <span className="sm:hidden">Prev</span>
                        </Button>
                        {hasQuiz && (
                          <Button
                            onClick={() => {
                              setContentSection('quiz');
                              scrollToLessonTitle();
                            }}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 sm:px-6 text-sm sm:text-base font-semibold shadow-lg shadow-violet-500/30"
                          >
                            <HelpCircle className="w-4 h-4 mr-1 sm:mr-2" />
                            <span>Take Quiz</span>
                          </Button>
                        )}
                        <Button
                          onClick={goToNextModule}
                          disabled={activeModuleIndex >= allLessons.length - 1}
                          className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 text-sm sm:text-base"
                        >
                          <span className="hidden sm:inline">Next Lesson</span>
                          <span className="sm:hidden">Next</span>
                          <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Quiz Section */
                  <div id="quiz-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full min-w-0">
                    <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 break-words">
                            Quiz: {activeModule.title}
                          </h2>
                          <p className="text-slate-500 text-sm">
                            Pass with 70% to unlock the next module
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setShowQuiz(false);
                            setContentSection('learn');
                          }}
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Content
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                      <Quiz
                        questions={quizQuestions}
                        onComplete={handleQuizComplete}
                        onBackToContent={() => {
                          setShowQuiz(false);
                          setContentSection('learn');
                        }}
                        onContinueToNext={handleContinueToNext}
                        moduleName={activeModule.title}
                        previousAttempts={quizAttempts}
                        bestScore={moduleProgress?.quizScore || 0}
                        passingScore={quizPassingScore}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center"
        >
          <BookOpen className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-full bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Learning Path
                </h3>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-2">
              {sectionsData.map((section) => {
                const collapsed = collapsedSections.has(section.id);
                const lessons = section.lessons || [];
                const total = lessons.length;
                const doneCount = lessons.filter((lesson) =>
                  isModuleCompleted(course.id, lesson.id),
                ).length;
                const containsActive = lessons.some((lesson) => lesson.id === activeModule?.id);

                return (
                  <div key={section.id} className="mb-2">
                    {hasMultipleSections && (
                      <button
                        onClick={() => toggleSection(section.id)}
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
                          {section.title}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                          {doneCount}/{total}
                        </span>
                      </button>
                    )}

                    {!collapsed && (
                      <div className={hasMultipleSections ? 'pl-3 ml-2 border-l border-slate-100 mt-1' : ''}>
                        {lessons.map((lesson, _idx) => {
                          const globalIndex = allLessons.findIndex(l => l.id === lesson.id);
                          const completed = isModuleCompleted(course.id, lesson.id);
                          const unlocked = isModuleUnlocked(course.id, lesson.id);
                          const isActive = globalIndex === activeModuleIndex;
                          const progress = getModuleProgress(course.id, lesson.id);

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => {
                                selectModule(globalIndex);
                                setMobileMenuOpen(false);
                              }}
                              disabled={!unlocked}
                              className={`w-full text-left p-2.5 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                                isActive
                                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                  : unlocked
                                    ? 'hover:bg-slate-50'
                                    : 'opacity-50 cursor-not-allowed'
                              }`}
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
                                  globalIndex + 1
                                )}
                              </div>

                              <div className="flex-grow min-w-0">
                                <div className={`font-medium text-sm truncate ${
                                  isActive ? 'text-white' : 'text-slate-700'
                                }`}>
                                  {lesson.title}
                                </div>
                                {progress && progress.bestScore > 0 && (
                                  <div className={`text-[11px] ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                    Best: {progress.bestScore}%
                                  </div>
                                )}
                              </div>

                              {lesson.level === 'advanced' && (
                                <Sparkles className={`w-3 h-3 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                              )}
                            </button>
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
      )}
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
