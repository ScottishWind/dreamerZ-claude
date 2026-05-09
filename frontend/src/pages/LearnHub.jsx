import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CourseCard } from '../components/CourseCard';
import { useProgress } from '../hooks/useProgress';
import { useCurriculum } from '../hooks/useCurriculum';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { StreakBadge } from '../components/StreakBadge';
import {
  Trophy, Zap, Target, BarChart3, Grid3X3, BookOpen, Mic, ArrowRight,
  Brain, Sparkles, Search, CheckCircle2, Circle, ChevronRight,
} from 'lucide-react';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';

// Per-category visual treatment for known slugs. Any category the admin
// creates that we haven't explicitly styled falls back to DEFAULT_STYLE,
// so nothing renders blank or breaks.
const CATEGORY_STYLES = {
  'ai-learning': {
    gradient: 'from-indigo-600 to-violet-600',
    accentText: 'text-indigo-100',
    ctaText: 'text-indigo-600',
    ctaHover: 'group-hover:bg-indigo-50',
    pillActive: 'bg-indigo-600 text-white',
    iconEmoji: '🤖',
    Icon: Brain,
  },
  'spoken-writing-english': {
    gradient: 'from-rose-500 to-pink-500',
    accentText: 'text-rose-100',
    ctaText: 'text-rose-600',
    ctaHover: 'group-hover:bg-rose-50',
    pillActive: 'bg-rose-500 text-white',
    iconEmoji: '🗣️',
    Icon: Mic,
  },
  'vibe-code': {
    gradient: 'from-emerald-600 to-teal-600',
    accentText: 'text-emerald-100',
    ctaText: 'text-emerald-600',
    ctaHover: 'group-hover:bg-emerald-50',
    pillActive: 'bg-emerald-600 text-white',
    iconEmoji: '💻',
    Icon: Sparkles,
  },
  'vblog': {
    gradient: 'from-amber-500 to-orange-500',
    accentText: 'text-amber-100',
    ctaText: 'text-amber-600',
    ctaHover: 'group-hover:bg-amber-50',
    pillActive: 'bg-amber-500 text-white',
    iconEmoji: '🎬',
    Icon: Sparkles,
  },
};

const DEFAULT_STYLE = {
  gradient: 'from-slate-700 to-slate-900',
  accentText: 'text-slate-200',
  ctaText: 'text-slate-800',
  ctaHover: 'group-hover:bg-slate-100',
  pillActive: 'bg-slate-800 text-white',
  iconEmoji: '📚',
  Icon: BookOpen,
};

const styleFor = (slug) => CATEGORY_STYLES[slug] || DEFAULT_STYLE;

const titleCase = (s) =>
  String(s || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const CategoryBanner = ({ category, courses, completedModules }) => {
  const style = styleFor(category.id);
  const StyleIcon = style.Icon;
  const courseCount = courses.length;
  const totalModules = courses.reduce((sum, c) => sum + (c.modules?.length || 0), 0);
  const completionPct = totalModules > 0
    ? Math.round((completedModules / totalModules) * 100)
    : 0;
  const firstCourse = courses[0];
  const ctaLink = firstCourse ? `/learn/${firstCourse.id}` : '/learn';
  const hasProgress = completionPct > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Link to={ctaLink} className="block">
        <div className={`bg-gradient-to-r ${style.gradient} rounded-2xl p-6 lg:p-8 hover:shadow-xl transition-all group`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                {style.iconEmoji}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {courseCount} {courseCount === 1 ? 'COURSE' : 'COURSES'}
                  </span>
                  <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {totalModules} Modules
                  </span>
                  <span className="bg-emerald-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">FREE</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{category.name || titleCase(category.id)}</h3>
                {category.description && (
                  <p className={`${style.accentText} text-sm max-w-xl`}>
                    {category.description}
                  </p>
                )}
                {hasProgress && (
                  <div className="mt-2 max-w-xs">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:flex gap-2">
                {hasProgress ? (
                  <>
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center min-w-[70px]">
                      <div className="text-lg font-bold text-white">{completionPct}%</div>
                      <div className={`text-xs ${style.accentText}`}>Complete</div>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center min-w-[70px]">
                      <div className="text-lg font-bold text-white">{completedModules}/{totalModules}</div>
                      <div className={`text-xs ${style.accentText}`}>Modules</div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                    <StyleIcon className="w-4 h-4 text-white mx-auto mb-1" />
                    <div className={`text-xs ${style.accentText}`}>
                      {courseCount} {courseCount === 1 ? 'Course' : 'Courses'}
                    </div>
                  </div>
                )}
              </div>
              <div className={`bg-white ${style.ctaText} rounded-xl px-5 py-3 font-semibold ${style.ctaHover} transition-colors flex items-center gap-2`}>
                {hasProgress ? 'Continue' : 'Start Now'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export const LearnHub = () => {
  const {
    progress,
    getToolCompletion,
    getOverallCompletion,
    totalXP,
    resetProgress,
    getStreakInfo,
    isModuleCompleted,
  } = useProgress();
  const { tools: apiTools, categories: apiCategories } = useCurriculum();
  const streakInfo = getStreakInfo();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'progress'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Group courses by category slug.
  const coursesByCategory = useMemo(() => {
    const m = {};
    apiTools.forEach((course) => {
      const cid = course.category_id || 'uncategorized';
      if (!m[cid]) m[cid] = [];
      m[cid].push(course);
    });
    return m;
  }, [apiTools]);

  // Visible categories = ones with at least one course. Synthesise entries
  // for any course pointing at a category the API didn't return so the UI
  // never silently drops a course.
  const visibleCategories = useMemo(() => {
    const known = new Map(apiCategories.map((c) => [c.id, c]));
    const seenIds = Object.keys(coursesByCategory);
    const merged = seenIds.map((id) => known.get(id) || { id, name: titleCase(id), description: '' });
    return merged.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [apiCategories, coursesByCategory]);

  const completedByCategory = useMemo(() => {
    const m = {};
    visibleCategories.forEach((cat) => {
      const courses = coursesByCategory[cat.id] || [];
      m[cat.id] = courses.reduce((sum, c) => {
        return sum + Object.values(progress.completedModules?.[c.id] || {}).filter((x) => x.completed).length;
      }, 0);
    });
    return m;
  }, [visibleCategories, coursesByCategory, progress]);

  const overallCompletion = getOverallCompletion(0);

  const query = searchQuery.toLowerCase().trim();

  // Courses to render in the grid section (after category + search filtering).
  const filteredCourses = useMemo(() => {
    let list = activeCategory === 'all' ? apiTools : (coursesByCategory[activeCategory] || []);
    if (query) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        (c.tagline || '').toLowerCase().includes(query) ||
        (c.modules || []).some((m) =>
          m.title.toLowerCase().includes(query) ||
          (m.description || '').toLowerCase().includes(query)
        )
      );
    }
    return list;
  }, [activeCategory, query, apiTools, coursesByCategory]);

  const matchingModules = useMemo(() => {
    if (!query) return [];
    const results = [];
    apiTools.forEach((course) => {
      (course.modules || []).forEach((mod) => {
        if (
          mod.title.toLowerCase().includes(query) ||
          (mod.description || '').toLowerCase().includes(query)
        ) {
          results.push({
            ...mod,
            toolId: course.id,
            toolName: course.name,
            toolIcon: course.icon,
            toolColor: course.color,
          });
        }
      });
    });
    return results;
  }, [query, apiTools]);

  const bannersToShow = !query
    ? (activeCategory === 'all'
        ? visibleCategories
        : visibleCategories.filter((c) => c.id === activeCategory))
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
                Choose a course to start your learning journey. Complete modules and quizzes to earn XP.
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

          {/* Search Bar */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses and modules..."
              className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              data-testid="learnhub-search"
            />
          </div>

          {/* View Toggle + Category Filter */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-600'}`}
              data-testid="view-grid-btn"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Courses
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

            {viewMode === 'grid' && visibleCategories.length > 0 && (
              <>
                <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'ghost'}
                  onClick={() => setActiveCategory('all')}
                  className={`rounded-xl text-sm ${activeCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                >
                  All
                </Button>
                {visibleCategories.map((cat) => {
                  const style = styleFor(cat.id);
                  const StyleIcon = style.Icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <Button
                      key={cat.id}
                      variant={isActive ? 'default' : 'ghost'}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`rounded-xl text-sm ${isActive ? style.pillActive : 'text-slate-600'}`}
                    >
                      <StyleIcon className="w-3.5 h-3.5 mr-1.5" />
                      {cat.name || titleCase(cat.id)}
                    </Button>
                  );
                })}
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
              {/* Banners — one per visible category (or just the active one) */}
              {bannersToShow.map((cat) => (
                <CategoryBanner
                  key={cat.id}
                  category={cat}
                  courses={coursesByCategory[cat.id] || []}
                  completedModules={completedByCategory[cat.id] || 0}
                />
              ))}

              {/* Course grid */}
              {filteredCourses.length > 0 && (
                <>
                  {activeCategory === 'all' && !query && (
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 mt-8 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      All Courses
                    </h3>
                  )}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="courses-grid">
                    {filteredCourses.map((course, index) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        index={index}
                        completion={getToolCompletion(course.id)}
                        linkPrefix="/learn"
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Matching Modules from search */}
              {query && matchingModules.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Matching Modules ({matchingModules.length})
                  </h3>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {matchingModules.map((module) => {
                        const completed = isModuleCompleted(module.toolId, module.id);
                        return (
                          <Link
                            key={`${module.toolId}-${module.id}`}
                            to={`/learn/${module.toolId}`}
                            className={`flex items-center gap-4 p-4 transition-all hover:bg-slate-50 ${
                              completed ? 'bg-emerald-50/50' : ''
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="font-medium text-slate-900 text-sm truncate flex items-center gap-2">
                                {module.title}
                                {module.isAdvanced && (
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                )}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {module.toolName} — {module.description}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="hidden sm:inline">
                                {Array.isArray(module.quiz)
                                  ? module.quiz.length
                                  : (module.quiz?.questions?.length || 0)}{' '}
                                questions
                              </span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* No results */}
              {query && filteredCourses.length === 0 && matchingModules.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No results found</h3>
                  <p className="text-slate-500">Try a different search term</p>
                </motion.div>
              )}

              {/* Pro Tip — only on the All view */}
              {activeCategory === 'all' && !query && (
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
                        New to AI? The ChatGPT course covers all fundamentals — from understanding LLMs to writing
                        effective prompts. These skills transfer to every other AI tool.
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

export default LearnHub;
