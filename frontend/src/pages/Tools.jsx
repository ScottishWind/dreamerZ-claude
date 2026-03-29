import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toolsData } from '../data/toolsData';
import { ToolCard } from '../components/ToolCard';
import { useProgress } from '../hooks/useProgress';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { StreakBadge } from '../components/StreakBadge';
import { Trophy, Zap, Target, BarChart3, Grid3X3 } from 'lucide-react';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';

export const Tools = () => {
  const { 
    progress,
    getToolCompletion, 
    getOverallCompletion, 
    totalXP,
    resetProgress,
    getStreakInfo
  } = useProgress();
  const overallCompletion = getOverallCompletion();
  const streakInfo = getStreakInfo();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'progress'

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

          {/* View Toggle */}
          <div className="flex items-center gap-2 mt-6">
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
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Tools Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="tools-grid">
                {toolsData.map((tool, index) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    index={index}
                    completion={getToolCompletion(tool.id)}
                  />
                ))}
              </div>

              {/* Pro Tip */}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Tools;
