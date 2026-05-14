import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Zap, Target, RotateCcw, ChevronRight,
  BookOpen, CheckCircle2, AlertTriangle, Sparkles, Mic
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { StreakBadge } from './StreakBadge';
export const ProgressDashboard = ({
  getCourseProgress,
  overallCompletion,
  resetProgress,
  totalXP,
  streakInfo,
  apiTools = [],
  onUnenroll = null
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Use API tools directly (no static data merge needed)
  const allCourses = apiTools;
  const maxXP = allCourses.reduce((sum, t) => sum + (t.xpReward || t.totalXP || 0), 0);

  // Server-backed per-course progress — derived from StudentCourseEnrollment
  // rows so the numbers are identical on every browser/device.
  const courseStats = allCourses.map((tool) => ({ tool, ...getCourseProgress(tool) }));
  const totalLessonsCount = courseStats.reduce((sum, s) => sum + s.totalLessons, 0);
  const completedLessonsCount = courseStats.reduce((sum, s) => sum + s.lessonsCompleted, 0);
  const masteredCount = courseStats.filter((s) => s.totalLessons > 0 && s.completion === 100).length;

  // Handle reset with confirmation
  const handleReset = () => {
    resetProgress();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-8">
      {/* Streak Widget - Full Version */}
      {streakInfo && (
        <StreakBadge
          streak={streakInfo.currentStreak}
          longestStreak={streakInfo.longestStreak}
          isActiveToday={streakInfo.isActiveToday}
          streakAtRisk={streakInfo.streakAtRisk}
          showLongest={true}
        />
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 bg-gradient-to-br from-primary to-violet-600 rounded-2xl p-6 text-white shadow-xl shadow-primary/30"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">Overall Progress</p>
              <div className="text-5xl font-bold">{overallCompletion}%</div>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Target className="w-7 h-7" />
            </div>
          </div>
          <Progress value={overallCompletion} className="h-3 bg-white/20" />
          <p className="mt-3 text-white/80 text-sm">
            {completedLessonsCount} of {totalLessonsCount} lessons completed
          </p>
        </motion.div>

        {/* XP Earned */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-200"
        >
          <div className="flex items-start justify-between mb-2">
            <Zap className="w-8 h-8" />
            <Sparkles className="w-5 h-5 opacity-50" />
          </div>
          <div className="text-3xl font-bold">{totalXP}</div>
          <p className="text-white/80 text-sm">XP Earned</p>
          <p className="text-white/60 text-xs mt-1">of {maxXP} total</p>
        </motion.div>

        {/* Tools Mastered */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200"
        >
          <div className="flex items-start justify-between mb-2">
            <Trophy className="w-8 h-8" />
            <CheckCircle2 className="w-5 h-5 opacity-50" />
          </div>
          <div className="text-3xl font-bold">
            {masteredCount}
          </div>
          <p className="text-white/80 text-sm">Courses Mastered</p>
          <p className="text-white/60 text-xs mt-1">of {allCourses.length} total</p>
        </motion.div>
      </div>

      {/* Per-Tool Progress */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Progress by Course
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {courseStats.map(({ tool, completion, lessonsCompleted, totalLessons }, index) => {
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Link to={`/learn/${tool.id}`} className="block flex-grow" data-testid={`progress-tool-${tool.id}`}>
                    <div className="flex items-center gap-4">
                      {/* Tool Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: `${tool.color}15` }}
                      >
                        {tool.icon}
                      </div>

                      {/* Tool Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">{tool.name}</h4>
                          {tool._source === 'api' && (
                            <span className="bg-rose-100 text-rose-600 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Mic className="w-3 h-3" /> English
                            </span>
                          )}
                          {completion === 100 && (
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              Complete!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{lessonsCompleted}/{totalLessons} lessons</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-grow">
                            <Progress
                              value={completion}
                              className="h-2"
                              style={{
                                '--progress-background': tool.color
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-700 w-12 text-right">
                            {completion}%
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    </div>
                  </Link>

                  {/* Unenroll Button */}
                  {onUnenroll && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUnenroll(tool);
                      }}
                      className="flex-shrink-0 px-3 py-2 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 hover:text-rose-800 transition-colors text-sm font-semibold"
                      title="Unenroll from course"
                    >
                      Unenroll
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Reset Progress */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div className="flex-grow">
            <h4 className="font-semibold text-rose-900 mb-1">Reset All Progress</h4>
            <p className="text-rose-700 text-sm mb-4">
              This will clear all your completed modules, XP, and quiz scores. This action cannot be undone.
            </p>
            
            <AnimatePresence>
              {!showResetConfirm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  className="border-rose-300 text-rose-700 hover:bg-rose-100"
                  data-testid="progress-reset-btn"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Progress
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-rose-800 font-medium">Are you sure?</span>
                  <Button
                    onClick={handleReset}
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                    data-testid="progress-reset-confirm-btn"
                  >
                    Yes, Reset Everything
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowResetConfirm(false)}
                    className="text-slate-600"
                  >
                    Cancel
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
