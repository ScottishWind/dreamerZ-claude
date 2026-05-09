import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CourseCard } from '../components/CourseCard';
import { useProgress } from '../hooks/useProgress';
import { useCurriculum } from '../hooks/useCurriculum';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { StreakBadge } from '../components/StreakBadge';
import { Trophy, Zap, Target, BarChart3, Grid3X3, BookOpen, Mic, ArrowRight, Calendar, Languages, MessageCircle, Brain, Sparkles, Lightbulb, CreditCard } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { usePricing } from '../hooks/useSiteConfig';

export const Tools = () => {
  const {
    progress,
    getToolCompletion,
    getOverallCompletion,
    totalXP,
    resetProgress,
    getStreakInfo
  } = useProgress();
  const { tools: apiTools } = useCurriculum();
  const { getPlan } = usePricing();
  const aiPlan = getPlan('ai-learning');
  const englishPlan = getPlan('spoken-english');
  const aiPrice = aiPlan?.price ?? 199;
  const englishPrice = englishPlan?.price ?? 299;
  const streakInfo = getStreakInfo();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'progress'
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'ai-learning', 'spoken-writing-english'

  // Get spoken-english tools from API (they aren't in the static toolsData)
  const spokenEnglishTools = apiTools.filter(t => t.category_id === 'spoken-writing-english');
  const spokenEnglishTool = spokenEnglishTools[0];
  const spokenModuleCount = spokenEnglishTool?.modules?.length || 0;
  const spokenCompletion = getToolCompletion('spoken-english-30day', spokenModuleCount);
  const spokenCompletedCount = Object.values(progress.completedModules?.['spoken-english-30day'] || {}).filter(m => m.completed).length;

  // AI Learning tools from API (excludes spoken-english category)
  const aiLearningTools = apiTools.filter(t => t.category_id !== 'spoken-writing-english');
  const aiToolCount = aiLearningTools.length;

  // AI Learning aggregate progress across all AI tools (from API)
  const aiTotalModules = aiLearningTools.reduce((sum, t) => sum + (t.modules?.length || 0), 0);
  const aiCompletedModules = aiLearningTools.reduce((sum, t) => {
    return sum + Object.values(progress.completedModules?.[t.id] || {}).filter(m => m.completed).length;
  }, 0);
  const aiCompletion = aiTotalModules > 0 ? Math.round((aiCompletedModules / aiTotalModules) * 100) : 0;

  // Include spoken-english module count in overall completion
  const overallCompletion = getOverallCompletion(spokenModuleCount);

  // Use API tools with category filter (no static data)
  const filteredToolsData = activeCategory === 'all'
    ? aiLearningTools
    : activeCategory === 'ai-learning'
      ? aiLearningTools
      : [];

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                Learning Hub
              </h1>
              <p className="text-slate-600 max-w-xl text-lg">
                Choose an AI tool to start your learning journey. Complete modules and quizzes to earn XP.
              </p>
            </div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="card-professional flex-shrink-0 w-full lg:w-auto"
            >
              <div className="flex items-center gap-6 flex-wrap">
                {/* Streak Badge */}
                <StreakBadge
                  streak={streakInfo.currentStreak}
                  isActiveToday={streakInfo.isActiveToday}
                  streakAtRisk={streakInfo.streakAtRisk}
                  compact={true}
                />
                <div className="w-px h-10 bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">{overallCompletion}%</div>
                    <div className="text-xs text-slate-500 font-medium">Complete</div>
                  </div>
                </div>
                <div className="w-px h-10 bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">{totalXP}</div>
                    <div className="text-xs text-slate-500 font-medium">XP Earned</div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={overallCompletion} className="h-2" />
              </div>
            </motion.div>
          </div>

          {/* View Toggle + Category Filter */}
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-600'}`}
              data-testid="view-grid-btn"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Tools
            </Button>
            <Button
              variant={viewMode === 'progress' ? 'default' : 'ghost'}
              onClick={() => setViewMode('progress')}
              className={`rounded-xl ${viewMode === 'progress' ? 'bg-primary text-white' : 'text-slate-600'}`}
              data-testid="view-progress-btn"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              My Progress
            </Button>

            {viewMode === 'grid' && (
              <>
                <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'ghost'}
                  onClick={() => setActiveCategory('all')}
                  className={`rounded-xl text-sm ${activeCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                >
                  All
                </Button>
                <Button
                  variant={activeCategory === 'ai-learning' ? 'default' : 'ghost'}
                  onClick={() => setActiveCategory('ai-learning')}
                  className={`rounded-xl text-sm ${activeCategory === 'ai-learning' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                >
                  <Brain className="w-3.5 h-3.5 mr-1.5" />
                  AI Learning
                </Button>
                <Button
                  variant={activeCategory === 'spoken-writing-english' ? 'default' : 'ghost'}
                  onClick={() => setActiveCategory('spoken-writing-english')}
                  className={`rounded-xl text-sm ${activeCategory === 'spoken-writing-english' ? 'bg-rose-500 text-white' : 'text-slate-600'}`}
                >
                  <Mic className="w-3.5 h-3.5 mr-1.5" />
                  Spoken English
                </Button>
              </>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key={`grid-${activeCategory}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* AI Learning Featured Banner (show on 'all' or 'ai-learning') */}
              {(activeCategory === 'all' || activeCategory === 'ai-learning') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <Link to="/tools/chatgpt" className="block">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 lg:p-8 hover:shadow-xl hover:shadow-indigo-200/50 transition-all group">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                            🤖
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{aiToolCount} TOOLS</span>
                              <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{aiTotalModules} Modules</span>
                              <span className="bg-amber-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">&#8377;{aiPrice}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">AI Learning — ChatGPT, Claude, Gemini & More</h3>
                            <p className="text-indigo-100 text-sm max-w-xl">
                              Master prompt engineering, creative AI use, and ethical awareness. Hands-on activities with quizzes for every module.
                            </p>
                            {aiCompletion > 0 && (
                              <div className="mt-2 max-w-xs">
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${aiCompletion}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="hidden sm:flex gap-2">
                            {aiCompletion > 0 ? (
                              <>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center min-w-[70px]">
                                  <div className="text-lg font-bold text-white">{aiCompletion}%</div>
                                  <div className="text-xs text-indigo-100">Complete</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center min-w-[70px]">
                                  <div className="text-lg font-bold text-white">{aiCompletedModules}/{aiTotalModules}</div>
                                  <div className="text-xs text-indigo-100">Modules</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                                  <Brain className="w-4 h-4 text-white mx-auto mb-1" />
                                  <div className="text-xs text-indigo-100">{aiToolCount} AI Tools</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                                  <Sparkles className="w-4 h-4 text-white mx-auto mb-1" />
                                  <div className="text-xs text-indigo-100">Prompts</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                                  <Lightbulb className="w-4 h-4 text-white mx-auto mb-1" />
                                  <div className="text-xs text-indigo-100">Quizzes</div>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="bg-white text-indigo-600 rounded-xl px-5 py-3 font-semibold group-hover:bg-indigo-50 transition-colors flex items-center gap-2">
                              {aiCompletion > 0 ? 'Continue' : 'Start Now'}
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                            <a href="#payment-ai" onClick={(e) => e.stopPropagation()} className="bg-amber-400 text-slate-900 rounded-xl px-5 py-2.5 font-semibold hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 text-sm">
                              <CreditCard className="w-3.5 h-3.5" />
                              Enroll &#8377;{aiPrice}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Spoken English Featured Banner (show on 'all' or 'spoken-writing-english') */}
              {(activeCategory === 'all' || activeCategory === 'spoken-writing-english') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <Link to="/tools/spoken-english-30day" className="block">
                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-6 lg:p-8 hover:shadow-xl hover:shadow-rose-200/50 transition-all group">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                            🗣️
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">NEW</span>
                              <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">30 Days</span>
                              <span className="bg-amber-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">&#8377;{englishPrice}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Spoken English for Bengali Teens</h3>
                            <p className="text-rose-100 text-sm max-w-xl">
                              Daily lessons with dialogues, AI roleplay chat, vocabulary with Bengali meanings, and weekly tests. From greetings to confident conversations.
                            </p>
                            {spokenCompletion > 0 && (
                              <div className="mt-2 max-w-xs">
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${spokenCompletion}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="hidden sm:flex gap-2">
                            {spokenCompletion > 0 ? (
                              <>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center min-w-[70px]">
                                  <div className="text-lg font-bold text-white">{spokenCompletion}%</div>
                                  <div className="text-xs text-rose-100">Complete</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center min-w-[70px]">
                                  <div className="text-lg font-bold text-white">{spokenCompletedCount}/{spokenModuleCount}</div>
                                  <div className="text-xs text-rose-100">Lessons</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                                  <Calendar className="w-4 h-4 text-white mx-auto mb-1" />
                                  <div className="text-xs text-rose-100">30 Lessons</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                                  <Mic className="w-4 h-4 text-white mx-auto mb-1" />
                                  <div className="text-xs text-rose-100">AI Chat</div>
                                </div>
                                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                                  <Languages className="w-4 h-4 text-white mx-auto mb-1" />
                                  <div className="text-xs text-rose-100">Bengali</div>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="bg-white text-rose-600 rounded-xl px-5 py-3 font-semibold group-hover:bg-rose-50 transition-colors flex items-center gap-2">
                              {spokenCompletion > 0 ? 'Continue' : 'Start Now'}
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                            <a href="#payment-english" onClick={(e) => e.stopPropagation()} className="bg-amber-400 text-slate-900 rounded-xl px-5 py-2.5 font-semibold hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 text-sm">
                              <CreditCard className="w-3.5 h-3.5" />
                              Enroll &#8377;{englishPrice}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* AI Tools Grid */}
              {(activeCategory === 'all' || activeCategory === 'ai-learning') && (
                <>
                  {activeCategory === 'all' && (
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-600" />
                      AI Learning Tools
                    </h3>
                  )}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="tools-grid">
                    {filteredToolsData.map((tool, index) => (
                      <CourseCard
                        key={tool.id}
                        course={tool}
                        index={index}
                        completion={getToolCompletion(tool.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Pro Tip */}
              {(activeCategory === 'all' || activeCategory === 'ai-learning') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-12 bg-gradient-dark rounded-2xl p-6 lg:p-8"
                >
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-2">Recommended: Start with ChatGPT</h3>
                      <p className="text-slate-300 leading-relaxed">
                        New to AI? The ChatGPT journey covers all fundamentals — from understanding LLMs to writing effective prompts. These skills transfer to every other AI tool.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProgressDashboard
                progress={progress}
                getToolCompletion={getToolCompletion}
                getOverallCompletion={getOverallCompletion}
                resetProgress={resetProgress}
                totalXP={totalXP}
                streakInfo={streakInfo}
                apiTools={apiTools}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Tools;
