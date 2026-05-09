import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCurriculum } from '../hooks/useCurriculum';
import { useLearningProgress } from '../hooks/useLearningProgress';
import { useProgress } from '../hooks/useProgress';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { BookOpen, Search, ArrowRight, Layers, HelpCircle, Signal, CheckCircle2, Sparkles, GraduationCap, Grid3X3, BarChart3 } from 'lucide-react';

const CATEGORY_META = {
  'ai-learning': {
    title: 'AI Learning',
    description: 'Learn AI tools, prompting, creativity, and safe usage through guided courses.',
    icon: '🤖',
    gradient: 'from-indigo-600 to-violet-600',
    ring: 'ring-indigo-100'
  },
  'spoken-writing-english': {
    title: 'Spoken & Writing English',
    description: 'Build confidence with English speaking, writing, vocabulary, and roleplay practice.',
    icon: '🗣️',
    gradient: 'from-rose-500 to-pink-500',
    ring: 'ring-rose-100'
  }
};

const numericId = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const getCourseDbId = (course) => numericId(course?.db_id || course?.course_id || course?.id);

const getCourseStats = (course) => {
  const modules = course.modules || [];
  const totalModules = modules.length;
  const totalQuizzes = modules.reduce((count, module) => {
    if (Array.isArray(module.quiz)) return count + (module.quiz.length > 0 ? 1 : 0);
    if (module.quiz?.questions?.length) return count + 1;
    return count;
  }, 0);
  const hasAdvanced = modules.some(module => module.level === 'advanced' || module.isAdvanced);
  const hasIntermediate = modules.some(module => module.level === 'intermediate');
  const difficulty = course.difficulty || (hasAdvanced ? 'Advanced' : hasIntermediate ? 'Intermediate' : 'Beginner');
  return { totalModules, totalQuizzes, difficulty };
};

const CourseCatalogCard = ({ course, index, isEnrolled, isEnrolling, onEnroll }) => {
  const navigate = useNavigate();
  const stats = getCourseStats(course);

  const handlePrimaryAction = async () => {
    if (isEnrolled) {
      navigate(`/learn/${course.id}`);
      return;
    }
    await onEnroll(course);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col min-h-[280px]"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${course.color || '#10A37F'}18` }}>
          {course.icon || '📘'}
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
          {stats.difficulty}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{course.name}</h3>
      <p className="text-sm text-slate-500 line-clamp-2 mb-5 flex-grow">{course.tagline || course.description || 'A guided learning course with lessons and quizzes.'}</p>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <Layers className="w-4 h-4 mx-auto text-primary mb-1" />
          <div className="text-sm font-bold text-slate-900">{stats.totalModules}</div>
          <div className="text-[11px] text-slate-500">Modules</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <HelpCircle className="w-4 h-4 mx-auto text-violet-600 mb-1" />
          <div className="text-sm font-bold text-slate-900">{stats.totalQuizzes}</div>
          <div className="text-[11px] text-slate-500">Quizzes</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <Signal className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
          <div className="text-sm font-bold text-slate-900 truncate">{stats.difficulty}</div>
          <div className="text-[11px] text-slate-500">Level</div>
        </div>
      </div>

      <button
        type="button"
        onClick={handlePrimaryAction}
        disabled={isEnrolling}
        className={`w-full rounded-xl px-4 py-3 font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
          isEnrolled
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        {isEnrolled ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
        {isEnrolling ? 'Enrolling...' : isEnrolled ? 'Open Course' : 'Enroll'}
      </button>
    </motion.div>
  );
};

export const LearnHub = () => {
  const { tools: apiTools, isLoading, error } = useCurriculum();
  const { courseEnrollments, loadCourseEnrollments, startCourse } = useLearningProgress();
  const {
    progress,
    getToolCompletion,
    getOverallCompletion,
    totalXP,
    getStreakInfo
  } = useProgress();
  const [viewMode, setViewMode] = useState('catalog'); // 'catalog' or 'progress'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [enrollError, setEnrollError] = useState(null);
  const streakInfo = getStreakInfo();

  useEffect(() => {
    loadCourseEnrollments();
  }, [loadCourseEnrollments]);

  const enrolledCourseIds = useMemo(() => {
    return new Set(courseEnrollments.map(enrollment => enrollment.course_id));
  }, [courseEnrollments]);

  const categories = useMemo(() => {
    const grouped = new Map();
    apiTools.forEach(course => {
      const categoryId = course.category_id || 'uncategorized';
      grouped.set(categoryId, [...(grouped.get(categoryId) || []), course]);
    });

    return Array.from(grouped.entries()).map(([id, courses], index) => {
      const meta = CATEGORY_META[id] || {
        title: id.split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' '),
        description: 'Explore guided learning courses in this category.',
        icon: '📚',
        gradient: index % 2 === 0 ? 'from-cyan-500 to-blue-500' : 'from-amber-500 to-orange-500',
        ring: index % 2 === 0 ? 'ring-cyan-100' : 'ring-amber-100'
      };
      const totalModules = courses.reduce((sum, course) => sum + (course.modules?.length || 0), 0);
      return { id, courses, totalCourses: courses.length, totalModules, ...meta };
    });
  }, [apiTools]);

  const enrolledTools = useMemo(() => {
    return apiTools.filter(tool => {
      const courseDbId = getCourseDbId(tool);
      return courseDbId ? enrolledCourseIds.has(courseDbId) : false;
    });
  }, [apiTools, enrolledCourseIds]);

  const overallCompletion = useMemo(() => {
    if (enrolledTools.length === 0) return 0;
    const totalModules = enrolledTools.reduce((sum, t) => sum + (t.modules?.length || 0), 0);
    const completedModules = enrolledTools.reduce((sum, t) => {
      return sum + Object.values(progress.completedModules?.[t.id] || {}).filter(m => m.completed).length;
    }, 0);
    return totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  }, [enrolledTools, progress]);

  const selectedCategoryData = categories.find(category => category.id === selectedCategory);
  const query = searchQuery.trim().toLowerCase();

  const visibleCourses = useMemo(() => {
    const courses = selectedCategoryData?.courses || [];
    if (!query) return courses;
    return courses.filter(course =>
      course.name.toLowerCase().includes(query) ||
      (course.tagline || '').toLowerCase().includes(query) ||
      (course.description || '').toLowerCase().includes(query)
    );
  }, [selectedCategoryData, query]);

  const handleEnroll = async (course) => {
    const courseDbId = getCourseDbId(course);
    if (!courseDbId) {
      setEnrollError('Course cannot be enrolled because its numeric ID is missing.');
      return;
    }

    setEnrollError(null);
    setEnrollingCourseId(courseDbId);
    try {
      await startCourse(courseDbId);
      await loadCourseEnrollments();
    } catch (err) {
      setEnrollError(err.message || 'Failed to enroll in course');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-600 shadow-sm">Loading learning catalog...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 flex items-center justify-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-rose-700 shadow-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <GraduationCap className="w-4 h-4" />
            Learn Home
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">All Learning</h1>
              <p className="text-slate-600 max-w-2xl text-lg">
                Choose a learning category first. Then enroll in a course to unlock the full course player and begin progress tracking.
              </p>
            </div>
            {viewMode === 'catalog' && selectedCategory && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 transition-colors"
              >
                Back to Categories
              </button>
            )}
            {viewMode === 'progress' && (
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 transition-colors"
              >
                Back to Catalog
              </button>
            )}
          </div>
        </motion.div>

        {/* Colorful Progress Tracker Banner */}
        {viewMode === 'catalog' && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setViewMode('progress')}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 lg:p-8 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden group mb-8"
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 backdrop-blur">
                  📊
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur">
                      {enrolledTools.length} ENROLLED
                    </span>
                    <span className="bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur">
                      {overallCompletion}% COMPLETE
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Your Learning Progress</h2>
                  <p className="text-white/90 text-sm max-w-xl">
                    Track your progress across all enrolled courses. See completion rates, XP earned, and your learning streak.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 text-center min-w-[80px]">
                  <div className="text-2xl font-bold text-white">{overallCompletion}%</div>
                  <div className="text-xs text-white/80">Complete</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 text-center min-w-[80px]">
                  <div className="text-2xl font-bold text-white">{totalXP}</div>
                  <div className="text-xs text-white/80">XP</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 text-center min-w-[80px]">
                  <div className="text-2xl font-bold text-white">{streakInfo.currentStreak}</div>
                  <div className="text-xs text-white/80">Day Streak</div>
                </div>
                <div className="bg-white text-emerald-600 rounded-xl px-5 py-3 font-semibold group-hover:bg-emerald-50 transition-colors flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  View Details
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.button>
        )}

        <AnimatePresence mode="wait">
          {viewMode === 'progress' ? (
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
                resetProgress={() => {}}
                totalXP={totalXP}
                streakInfo={streakInfo}
                apiTools={enrolledTools}
              />
            </motion.div>
          ) : !selectedCategory ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {categories.map((category, index) => (
                <motion.button
                  key={category.id}
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`text-left rounded-3xl p-6 bg-gradient-to-br ${category.gradient} text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden relative`}
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-6">
                      {category.icon}
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{category.title}</h2>
                    <p className="text-white/85 text-sm leading-relaxed mb-6 min-h-[44px]">{category.description}</p>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-white/20 rounded-2xl px-4 py-3 backdrop-blur">
                        <div className="text-2xl font-bold">{category.totalCourses}</div>
                        <div className="text-xs text-white/80">Courses</div>
                      </div>
                      <div className="bg-white/20 rounded-2xl px-4 py-3 backdrop-blur">
                        <div className="text-2xl font-bold">{category.totalModules}</div>
                        <div className="text-xs text-white/80">Modules</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                      <span>View Courses</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="courses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ring-8 ${selectedCategoryData?.ring || 'ring-slate-100'} bg-white`}>
                      {selectedCategoryData?.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedCategoryData?.title}</h2>
                      <p className="text-slate-500 mt-1">{selectedCategoryData?.totalCourses || 0} courses available. Enroll to begin tracking progress.</p>
                    </div>
                  </div>
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search courses..."
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {enrollError && (
                <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm">
                  {enrollError}
                </div>
              )}

              {visibleCourses.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" data-testid="category-course-grid">
                  {visibleCourses.map((course, index) => {
                    const courseDbId = getCourseDbId(course);
                    const isEnrolled = courseDbId ? enrolledCourseIds.has(courseDbId) : false;
                    return (
                      <CourseCatalogCard
                        key={course.id}
                        course={course}
                        index={index}
                        isEnrolled={isEnrolled}
                        isEnrolling={courseDbId === enrollingCourseId}
                        onEnroll={handleEnroll}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
                  <Grid3X3 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No courses found</h3>
                  <p className="text-slate-500">Try a different search term.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 text-center text-sm text-slate-500">
          Already enrolled? Open your course from its card.
          <Sparkles className="inline w-4 h-4 ml-2 text-amber-500" />
        </div>
      </div>
    </div>
  );
};

export default LearnHub;
