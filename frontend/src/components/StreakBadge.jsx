import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, AlertTriangle, Sparkles } from 'lucide-react';

// Streak milestone messages
const getMilestoneMessage = (streak) => {
  if (streak >= 365) return { emoji: '👑', text: 'LEGENDARY! One year!' };
  if (streak >= 100) return { emoji: '💎', text: 'Diamond learner!' };
  if (streak >= 30) return { emoji: '🏆', text: 'Monthly master!' };
  if (streak >= 14) return { emoji: '⭐', text: 'Two week warrior!' };
  if (streak >= 7) return { emoji: '🔥', text: 'Week streak!' };
  if (streak >= 5) return { emoji: '🎯', text: 'High five!' };
  if (streak >= 3) return { emoji: '✨', text: 'Getting started!' };
  return null;
};

export const StreakBadge = ({ 
  streak = 0, 
  longestStreak = 0,
  isActiveToday = false, 
  streakAtRisk = false,
  compact = false,
  showLongest = false
}) => {
  const milestone = getMilestoneMessage(streak);
  
  // Compact version for headers
  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm ${
          streakAtRisk 
            ? 'bg-amber-100 text-amber-700 border border-amber-300'
            : streak > 0
              ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border border-orange-200'
              : 'bg-slate-100 text-slate-500'
        }`}
        data-testid="streak-badge-compact"
      >
        <motion.span
          animate={streak > 0 ? { 
            scale: [1, 1.2, 1],
          } : {}}
          transition={{ duration: 0.5, repeat: streak > 2 ? Infinity : 0, repeatDelay: 2 }}
        >
          {streakAtRisk ? '⚠️' : streak > 0 ? '🔥' : '💤'}
        </motion.span>
        <span>{streak} day{streak !== 1 ? 's' : ''}</span>
        {streakAtRisk && (
          <span className="text-xs opacity-75">at risk!</span>
        )}
      </motion.div>
    );
  }

  // Full version for dashboard
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      <div className={`rounded-2xl p-6 ${
        streakAtRisk
          ? 'bg-gradient-to-br from-amber-400 to-orange-500'
          : streak > 0
            ? 'bg-gradient-to-br from-orange-500 to-red-500'
            : 'bg-gradient-to-br from-slate-400 to-slate-500'
      } text-white shadow-lg`}>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 opacity-10">
          <Flame className="w-32 h-32 -mt-4 -mr-4" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={streak > 0 ? { 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0]
                } : {}}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                className="text-4xl"
              >
                {streakAtRisk ? '⚠️' : streak > 0 ? '🔥' : '💤'}
              </motion.div>
              <div>
                <h3 className="font-bold text-lg">Learning Streak</h3>
                <p className="text-white/80 text-sm">
                  {streakAtRisk 
                    ? 'Learn today to keep your streak!'
                    : isActiveToday 
                      ? 'Great job today!' 
                      : streak > 0 
                        ? 'Keep it going!'
                        : 'Start your streak today!'}
                </p>
              </div>
            </div>
            
            {isActiveToday && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-white/20 rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Done today!
              </motion.div>
            )}
          </div>

          {/* Streak Count */}
          <div className="flex items-end gap-4 mb-4">
            <motion.div
              key={streak}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-bold"
            >
              {streak}
            </motion.div>
            <div className="mb-2">
              <div className="text-xl font-medium">day{streak !== 1 ? 's' : ''}</div>
              {milestone && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-white/90 text-sm flex items-center gap-1"
                >
                  <span>{milestone.emoji}</span>
                  <span>{milestone.text}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Streak Progress to next milestone */}
          {streak > 0 && streak < 7 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Progress to 7-day streak</span>
                <span>{streak}/7</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(streak / 7) * 100}%` }}
                  className="h-full bg-white rounded-full"
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
            </div>
          )}

          {/* Longest Streak */}
          {showLongest && longestStreak > 0 && (
            <div className="flex items-center gap-2 text-white/80 text-sm pt-3 border-t border-white/20">
              <Trophy className="w-4 h-4" />
              <span>Personal best: <strong className="text-white">{longestStreak} days</strong></span>
              {streak === longestStreak && streak > 0 && (
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">🎉 New record!</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Streak at risk warning */}
      <AnimatePresence>
        {streakAtRisk && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Your streak is at risk!</p>
              <p className="text-amber-700 text-sm">Complete a module today to keep your {streak}-day streak going.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StreakBadge;
