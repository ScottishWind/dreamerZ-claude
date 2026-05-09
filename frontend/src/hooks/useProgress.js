import { useState, useEffect, useCallback } from 'react';
import { CURRICULUM_VERSION, toolsData, getTotalModules, getTotalXP } from '../data/toolsData';

const STORAGE_KEY = 'dreamerz_beta_progress_v1';

// Helper to check if two dates are the same day
const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
};

// Helper to check if date is yesterday
const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

// Helper to check if date is today
const isToday = (date) => {
  return isSameDay(date, new Date());
};

// Default progress structure
const getDefaultProgress = () => ({
  version: CURRICULUM_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedModules: {}, // { toolId: { moduleId: { completed: true, quizScore: 80, attempts: 1, bestScore: 80 } } }
  lastActive: {}, // { toolId: moduleId } - for resume functionality
  totalXP: 0,
  badges: [],
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  streakUpdatedToday: false,
  settings: {
    soundEnabled: true,
    animationsEnabled: true
  }
});

// Progress interface for future DB integration
const progressInterface = {
  async load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Version check - reset if outdated
        if (parsed.version !== CURRICULUM_VERSION) {
          return getDefaultProgress();
        }
        return parsed;
      }
      return getDefaultProgress();
    } catch (error) {
      console.error('Error loading progress:', error);
      return getDefaultProgress();
    }
  },
  
  async save(progress) {
    try {
      const updated = { ...progress, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
      return false;
    }
  },
  
  async reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return getDefaultProgress();
    } catch (error) {
      console.error('Error resetting progress:', error);
      return getDefaultProgress();
    }
  }
};

export const useProgress = () => {
  const [progress, setProgress] = useState(getDefaultProgress());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const loaded = await progressInterface.load();
      setProgress(loaded);
      setIsLoaded(true);
    };
    loadProgress();
  }, []);

  // Save progress whenever it changes
  useEffect(() => {
    if (isLoaded) {
      progressInterface.save(progress);
    }
  }, [progress, isLoaded]);

  // Complete a module
  const completeModule = useCallback((toolId, moduleId, quizScore) => {
    setProgress(prev => {
      const toolProgress = prev.completedModules[toolId] || {};
      const moduleProgress = toolProgress[moduleId] || { attempts: 0, bestScore: 0 };

      // Calculate XP bonus for first completion
      const isFirstCompletion = !moduleProgress.completed;
      const tool = toolsData.find(t => t.id === toolId);
      // For API-loaded tools not in static toolsData, award a flat 25 XP per module
      const xpGain = isFirstCompletion
        ? (tool ? Math.floor(tool.xpReward / tool.modules.length) : 25)
        : 0;

      // Track best score
      const newBestScore = Math.max(quizScore, moduleProgress.bestScore || 0);

      // Calculate streak
      const now = new Date();
      const lastActivity = prev.lastActivityDate;
      let newStreak = prev.currentStreak || 0;
      let longestStreak = prev.longestStreak || 0;
      let streakUpdatedToday = prev.streakUpdatedToday || false;

      if (!streakUpdatedToday) {
        if (!lastActivity) {
          // First ever activity
          newStreak = 1;
        } else if (isToday(lastActivity)) {
          // Already active today, streak already counted
          // This shouldn't happen if streakUpdatedToday is false, but safety check
        } else if (isYesterday(lastActivity)) {
          // Continuing streak from yesterday
          newStreak = (prev.currentStreak || 0) + 1;
        } else {
          // Streak broken, start fresh
          newStreak = 1;
        }
        streakUpdatedToday = true;
        longestStreak = Math.max(longestStreak, newStreak);
      }

      return {
        ...prev,
        completedModules: {
          ...prev.completedModules,
          [toolId]: {
            ...toolProgress,
            [moduleId]: {
              completed: true,
              quizScore: quizScore,
              bestScore: newBestScore,
              attempts: moduleProgress.attempts + 1,
              completedAt: new Date().toISOString()
            }
          }
        },
        lastActive: {
          ...prev.lastActive,
          [toolId]: moduleId
        },
        totalXP: prev.totalXP + xpGain,
        currentStreak: newStreak,
        longestStreak: longestStreak,
        lastActivityDate: now.toISOString(),
        streakUpdatedToday: streakUpdatedToday
      };
    });
  }, []);

  // Check if module is completed
  const isModuleCompleted = useCallback((toolId, moduleId) => {
    return progress.completedModules[toolId]?.[moduleId]?.completed || false;
  }, [progress.completedModules]);

  // Get module progress
  const getModuleProgress = useCallback((toolId, moduleId) => {
    return progress.completedModules[toolId]?.[moduleId] || null;
  }, [progress.completedModules]);

  // Get tool completion percentage
  // Accepts toolId (looks up in static toolsData) or pass totalModules for API tools
  const getToolCompletion = useCallback((toolId, totalModules) => {
    const tool = toolsData.find(t => t.id === toolId);
    const moduleCount = tool ? tool.modules.length : totalModules;
    if (!moduleCount) return 0;

    const toolProgress = progress.completedModules[toolId] || {};
    const completedCount = Object.values(toolProgress).filter(m => m.completed).length;
    return Math.round((completedCount / moduleCount) * 100);
  }, [progress.completedModules]);

  // Get overall completion percentage
  // Accepts optional extraModuleCount for API tools not in static toolsData
  const getOverallCompletion = useCallback((extraModuleCount = 0) => {
    const totalModules = getTotalModules() + extraModuleCount;
    if (totalModules === 0) return 0;
    let completedCount = 0;

    Object.values(progress.completedModules).forEach(toolModules => {
      completedCount += Object.values(toolModules).filter(m => m.completed).length;
    });

    return Math.round((completedCount / totalModules) * 100);
  }, [progress.completedModules]);

  // Check if module is unlocked (previous module completed or first module)
  // Also accepts an optional modules array for API-loaded tools
  const isModuleUnlocked = useCallback((toolId, moduleId, modules) => {
    const tool = toolsData.find(t => t.id === toolId);
    const moduleList = tool ? tool.modules : modules;
    if (!moduleList) return true; // If no module list available, default to unlocked

    const moduleIndex = moduleList.findIndex(m => m.id === moduleId);
    if (moduleIndex <= 0) return true; // First module always unlocked

    const prevModule = moduleList[moduleIndex - 1];
    return isModuleCompleted(toolId, prevModule.id);
  }, [isModuleCompleted]);

  // Reset all progress
  const resetProgress = useCallback(async () => {
    const defaultProgress = await progressInterface.reset();
    setProgress(defaultProgress);
  }, []);

  // Clear progress for a specific course
  const clearCourseProgress = useCallback((toolId) => {
    setProgress(prev => {
      // Calculate XP to subtract from total
      const toolProgress = prev.completedModules[toolId] || {};
      const completedCount = Object.values(toolProgress).filter(m => m.completed).length;
      
      // For API-loaded tools not in static toolsData, assume 25 XP per module
      const xpToSubtract = completedCount * 25;
      
      return {
        ...prev,
        completedModules: {
          ...prev.completedModules,
          [toolId]: {}
        },
        lastActive: {
          ...prev.lastActive,
          [toolId]: null
        },
        totalXP: Math.max(0, prev.totalXP - xpToSubtract)
      };
    });
  }, []);

  // Award badge
  const awardBadge = useCallback((badgeId, badgeName) => {
    setProgress(prev => {
      if (prev.badges.some(b => b.id === badgeId)) return prev;
      return {
        ...prev,
        badges: [...prev.badges, { id: badgeId, name: badgeName, awardedAt: new Date().toISOString() }]
      };
    });
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setProgress(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  // Get last active module for a tool (resume functionality)
  const getLastActiveModule = useCallback((toolId) => {
    return progress.lastActive?.[toolId] || null;
  }, [progress.lastActive]);

  // Get total completed modules count
  const getTotalCompletedModules = useCallback(() => {
    return Object.values(progress.completedModules).reduce(
      (acc, toolModules) => acc + Object.values(toolModules).filter(m => m.completed).length,
      0
    );
  }, [progress.completedModules]);

  // Get streak info
  const getStreakInfo = useCallback(() => {
    const lastActivity = progress.lastActivityDate;
    let currentStreak = progress.currentStreak || 0;
    let isActiveToday = false;
    let streakAtRisk = false;

    if (lastActivity) {
      if (isToday(lastActivity)) {
        isActiveToday = true;
      } else if (isYesterday(lastActivity)) {
        // Streak is at risk - need to learn today to keep it!
        streakAtRisk = true;
      } else {
        // Streak is broken
        currentStreak = 0;
      }
    }

    return {
      currentStreak,
      longestStreak: progress.longestStreak || 0,
      isActiveToday,
      streakAtRisk,
      lastActivityDate: lastActivity
    };
  }, [progress.lastActivityDate, progress.currentStreak, progress.longestStreak]);

  // Check and reset streakUpdatedToday flag if it's a new day
  useEffect(() => {
    if (progress.lastActivityDate && !isToday(progress.lastActivityDate)) {
      setProgress(prev => ({
        ...prev,
        streakUpdatedToday: false
      }));
    }
  }, [progress.lastActivityDate]);

  return {
    progress,
    isLoaded,
    completeModule,
    isModuleCompleted,
    getModuleProgress,
    getToolCompletion,
    getOverallCompletion,
    isModuleUnlocked,
    resetProgress,
    clearCourseProgress,
    awardBadge,
    updateSettings,
    getLastActiveModule,
    getTotalCompletedModules,
    getStreakInfo,
    totalXP: progress.totalXP,
    badges: progress.badges,
    settings: progress.settings
  };
};

export default useProgress;
