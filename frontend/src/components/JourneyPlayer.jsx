import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Lock, CheckCircle2, 
  BookOpen, Lightbulb, Rocket, Play, Award,
  Clock, Sparkles, ArrowLeft, Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Quiz } from './Quiz';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { SafetyBanner } from './SafetyBanner';

export const JourneyPlayer = ({ 
  tool, 
  modules, 
  isModuleCompleted, 
  isModuleUnlocked, 
  getModuleProgress,
  completeModule,
  initialModuleId = null
}) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [contentSection, setContentSection] = useState('learn'); // 'learn', 'example', 'activity'

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

  const activeModule = modules[activeModuleIndex];
  const moduleProgress = getModuleProgress(tool.id, activeModule?.id);
  const isCurrentModuleCompleted = isModuleCompleted(tool.id, activeModule?.id);
  const completedCount = modules.filter(m => isModuleCompleted(tool.id, m.id)).length;
  const progressPercent = Math.round((completedCount / modules.length) * 100);

  // Handle quiz completion
  const handleQuizComplete = useCallback((score, passed, attempts) => {
    if (passed) {
      completeModule(tool.id, activeModule.id, score);
    }
  }, [tool.id, activeModule?.id, completeModule]);

  // Navigate to next module
  const goToNextModule = useCallback(() => {
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex(prev => prev + 1);
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
    if (isModuleUnlocked(tool.id, module.id)) {
      setActiveModuleIndex(index);
      setShowQuiz(false);
      setContentSection('learn');
    }
  }, [modules, tool.id, isModuleUnlocked]);

  if (!activeModule) return null;

  const contentSections = [
    { id: 'learn', label: 'Learn', icon: BookOpen, color: 'primary' },
    { id: 'example', label: 'Example', icon: Lightbulb, color: 'amber' },
    { id: 'activity', label: 'Try It', icon: Rocket, color: 'emerald' }
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
                to="/tools" 
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
                    
                    return (
                      <motion.button
                        key={module.id}
                        onClick={() => selectModule(index)}
                        disabled={!unlocked}
                        whileHover={unlocked ? { x: 4 } : {}}
                        className={`w-full text-left p-3 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                          isActive 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : unlocked
                              ? 'hover:bg-slate-50'
                              : 'opacity-50 cursor-not-allowed'
                        }`}
                        data-testid={`module-nav-${module.id}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                          completed 
                            ? 'bg-emerald-500 text-white'
                            : isActive
                              ? 'bg-white/20 text-white'
                              : unlocked
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-100 text-slate-400'
                        }`}>
                          {completed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : !unlocked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <div className={`font-medium text-sm truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>
                            {module.title}
                          </div>
                          {progress && (
                            <div className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
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
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 order-1 lg:order-2">
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
                            {activeModule.title}
                          </h1>
                          <p className="text-slate-500 max-w-2xl">
                            Module {activeModuleIndex + 1} of {modules.length}
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
                                section.color === 'amber' ? '#f59e0b' : '#10b981'
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
                      </AnimatePresence>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50">
                      <div className="flex flex-wrap items-center justify-between gap-4">
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
                        questions={activeModule.quiz}
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
    </div>
  );
};

export default JourneyPlayer;
