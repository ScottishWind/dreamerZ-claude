import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from './useAuth';
import * as progressService from '../services/progressService';

// Learning progress used to live in localStorage, which made it per-browser:
// the same learner saw different completion %, XP and streaks on Chrome vs.
// their phone. This provider makes the server the single source of truth —
// it reads StudentCourseEnrollment / StudentLessonProgress and exposes the
// same interface the screens already expect, so the numbers are identical on
// every device the learner signs in from.

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const ProgressContext = createContext(null);

const DEFAULT_SETTINGS = { soundEnabled: true, animationsEnabled: true };
const XP_PER_LESSON = 25;

const EMPTY_PROGRESS = {
  completedModules: {},
  totalXP: 0,
  currentStreak: 0,
  longestStreak: 0,
  isActiveToday: false,
  streakAtRisk: false,
  lastActivityDate: null,
  badges: [],
  settings: DEFAULT_SETTINGS,
};

const EMPTY_MAPS = {
  courseDbIdBySlug: {}, // courseSlug  -> courseDbId
  courseSlugByDbId: {}, // courseDbId  -> courseSlug
  lessonsByCourseSlug: {}, // courseSlug -> [{ slug, dbId, moduleDbId }] (ordered)
  lessonInfoBySlug: {}, // courseSlug -> { lessonSlug -> { dbId, moduleDbId } }
};

// Streak is derived purely from the server's lesson `completed_at` dates, so
// it is identical on every device — no per-browser counter to drift.
const computeStreak = (completedAtList) => {
  const valid = (completedAtList || [])
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()));

  if (valid.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isActiveToday: false,
      streakAtRisk: false,
      lastActivityDate: null,
    };
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };

  const days = [...new Set(valid.map(startOfDay))].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] - days[i - 1] === DAY_MS) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = startOfDay(new Date());
  const lastDay = days[days.length - 1];
  let currentStreak = 0;
  let isActiveToday = false;
  let streakAtRisk = false;

  // The streak is "live" only if the most recent activity was today or
  // yesterday; otherwise it has lapsed back to zero.
  if (lastDay === today || lastDay === today - DAY_MS) {
    isActiveToday = lastDay === today;
    streakAtRisk = lastDay === today - DAY_MS;
    currentStreak = 1;
    for (let i = days.length - 1; i > 0; i -= 1) {
      if (days[i] - days[i - 1] === DAY_MS) currentStreak += 1;
      else break;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longest, currentStreak),
    isActiveToday,
    streakAtRisk,
    lastActivityDate: new Date(
      Math.max(...valid.map((d) => d.getTime())),
    ).toISOString(),
  };
};

export const ProgressProvider = ({ children }) => {
  const { isAuthenticated, isLoaded: authLoaded } = useAuth();
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Curriculum maps — let us translate between the frontend's slug-based ids
  // (course slug + lesson slug, what every screen passes in) and the numeric
  // ids the progress API is keyed by.
  const mapsRef = useRef(EMPTY_MAPS);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) {
      mapsRef.current = EMPTY_MAPS;
      setProgress(EMPTY_PROGRESS);
      setIsLoaded(true);
      return;
    }

    try {
      // 1. Curriculum — build the slug <-> numeric-id maps.
      const toolsRes = await fetch(`${API_BASE}/api/content/tools`);
      const tools = toolsRes.ok ? await toolsRes.json() : [];

      const courseDbIdBySlug = {};
      const courseSlugByDbId = {};
      const lessonsByCourseSlug = {};
      const lessonInfoBySlug = {};

      tools.forEach((tool) => {
        const courseSlug = tool.id;
        courseDbIdBySlug[courseSlug] = tool.db_id;
        courseSlugByDbId[tool.db_id] = courseSlug;
        lessonsByCourseSlug[courseSlug] = [];
        lessonInfoBySlug[courseSlug] = {};
        (tool.modules || []).forEach((lesson) => {
          lessonsByCourseSlug[courseSlug].push({
            slug: lesson.id,
            dbId: lesson.db_id,
            moduleDbId: lesson.module_db_id,
          });
          lessonInfoBySlug[courseSlug][lesson.id] = {
            dbId: lesson.db_id,
            moduleDbId: lesson.module_db_id,
          };
        });
      });

      mapsRef.current = {
        courseDbIdBySlug,
        courseSlugByDbId,
        lessonsByCourseSlug,
        lessonInfoBySlug,
      };

      // 2. Enrollments + per-course lesson progress (the source of truth).
      const enrollments = await progressService.getStudentCourseEnrollments();

      const completedModules = {};
      const completedAtList = [];

      await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseSlug = courseSlugByDbId[enrollment.course_id];
          if (!courseSlug) return;

          const lessonProgress = await progressService
            .getCourseLessonProgress(enrollment.course_id)
            .catch(() => []);

          const slugByLessonDbId = {};
          (lessonsByCourseSlug[courseSlug] || []).forEach((l) => {
            slugByLessonDbId[l.dbId] = l.slug;
          });

          completedModules[courseSlug] = completedModules[courseSlug] || {};
          lessonProgress.forEach((lp) => {
            const lessonSlug = slugByLessonDbId[lp.lesson_id];
            if (!lessonSlug) return;
            const completed = lp.status === 'completed';
            completedModules[courseSlug][lessonSlug] = {
              completed,
              quizScore: lp.best_score || 0,
              bestScore: lp.best_score || 0,
              // `visit_count` increments every time a lesson is opened
              // (including plain page refreshes), so it isn't a meaningful
              // "attempts" number for the learner. There is no cheap
              // per-lesson quiz-attempt counter today, so we surface 0
              // here — the UI hides the line when there's no real attempt
              // data to show.
              attempts: 0,
              completedAt: lp.completed_at || null,
            };
            if (completed && lp.completed_at) {
              completedAtList.push(lp.completed_at);
            }
          });
        }),
      );

      const completedCount = Object.values(completedModules).reduce(
        (acc, lessons) =>
          acc + Object.values(lessons).filter((l) => l.completed).length,
        0,
      );
      const streak = computeStreak(completedAtList);

      setProgress({
        completedModules,
        totalXP: completedCount * XP_PER_LESSON,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isActiveToday: streak.isActiveToday,
        streakAtRisk: streak.streakAtRisk,
        lastActivityDate: streak.lastActivityDate,
        badges: [],
        settings: DEFAULT_SETTINGS,
      });
    } catch (err) {
      console.error('Failed to load learning progress:', err);
      setProgress(EMPTY_PROGRESS);
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoaded) {
      setIsLoaded(false);
      loadAll();
    }
  }, [authLoaded, loadAll]);

  // ── Read helpers (keyed by course slug + lesson slug) ──
  const isModuleCompleted = useCallback(
    (toolId, moduleId) =>
      progress.completedModules?.[toolId]?.[moduleId]?.completed || false,
    [progress.completedModules],
  );

  const getModuleProgress = useCallback(
    (toolId, moduleId) =>
      progress.completedModules?.[toolId]?.[moduleId] || null,
    [progress.completedModules],
  );

  const getToolCompletion = useCallback(
    (toolId, totalModules) => {
      const lessons = mapsRef.current.lessonsByCourseSlug[toolId];
      const moduleCount = lessons?.length || totalModules || 0;
      if (!moduleCount) return 0;
      const done = Object.values(
        progress.completedModules?.[toolId] || {},
      ).filter((m) => m.completed).length;
      return Math.round((done / moduleCount) * 100);
    },
    [progress.completedModules],
  );

  const getOverallCompletion = useCallback(() => {
    let done = 0;
    let total = 0;
    Object.entries(progress.completedModules || {}).forEach(
      ([courseSlug, lessons]) => {
        const courseLessons = mapsRef.current.lessonsByCourseSlug[courseSlug];
        total += courseLessons?.length || Object.keys(lessons).length;
        done += Object.values(lessons).filter((m) => m.completed).length;
      },
    );
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [progress.completedModules]);

  const isModuleUnlocked = useCallback(
    (toolId, moduleId, modules) => {
      // Prefer the curriculum's lesson order; fall back to the modules array
      // the caller passed in (used by API tools not in the map yet).
      const ordered =
        mapsRef.current.lessonsByCourseSlug[toolId]?.map((l) => l.slug) ||
        (modules || []).map((m) => m.id);
      if (!ordered || ordered.length === 0) return true;
      const idx = ordered.indexOf(moduleId);
      if (idx <= 0) return true; // first lesson is always unlocked
      return isModuleCompleted(toolId, ordered[idx - 1]);
    },
    [isModuleCompleted],
  );

  const getLastActiveModule = useCallback(() => null, []);

  const getTotalCompletedModules = useCallback(
    () =>
      Object.values(progress.completedModules || {}).reduce(
        (acc, lessons) =>
          acc + Object.values(lessons).filter((l) => l.completed).length,
        0,
      ),
    [progress.completedModules],
  );

  const getStreakInfo = useCallback(
    () => ({
      currentStreak: progress.currentStreak || 0,
      longestStreak: progress.longestStreak || 0,
      isActiveToday: progress.isActiveToday || false,
      streakAtRisk: progress.streakAtRisk || false,
      lastActivityDate: progress.lastActivityDate || null,
    }),
    [progress],
  );

  // ── Write helpers ──
  const completeModule = useCallback(
    (toolId, moduleId, quizScore) => {
      const score = quizScore || 0;

      // Optimistic local update so the UI (sidebar checks, header %) reacts
      // immediately; the server write + re-sync happens right after.
      setProgress((prev) => {
        const courseModules = prev.completedModules[toolId] || {};
        const existing = courseModules[moduleId] || {};
        const wasCompleted = existing.completed;
        const completedCount =
          Object.values({
            ...prev.completedModules,
            [toolId]: {
              ...courseModules,
              [moduleId]: { completed: true },
            },
          }).reduce(
            (acc, lessons) =>
              acc + Object.values(lessons).filter((l) => l.completed).length,
            0,
          );
        return {
          ...prev,
          completedModules: {
            ...prev.completedModules,
            [toolId]: {
              ...courseModules,
              [moduleId]: {
                completed: true,
                quizScore: score,
                bestScore: Math.max(score, existing.bestScore || 0),
                attempts: (existing.attempts || 0) + 1,
                completedAt: existing.completedAt || new Date().toISOString(),
              },
            },
          },
          totalXP: wasCompleted
            ? prev.totalXP
            : completedCount * XP_PER_LESSON,
        };
      });

      (async () => {
        try {
          const lessonInfo =
            mapsRef.current.lessonInfoBySlug?.[toolId]?.[moduleId];
          const courseDbId = mapsRef.current.courseDbIdBySlug?.[toolId];
          if (lessonInfo?.dbId && courseDbId) {
            // Ensure a lesson-progress row exists, then mark it complete.
            await progressService
              .startLessonProgress(
                lessonInfo.dbId,
                courseDbId,
                lessonInfo.moduleDbId,
              )
              .catch(() => {});
            await progressService.completeLessonProgress(lessonInfo.dbId);
          }
        } catch (err) {
          console.error('Failed to persist module completion:', err);
        } finally {
          loadAll();
        }
      })();
    },
    [loadAll],
  );

  const resetProgress = useCallback(async () => {
    try {
      const enrollments = await progressService
        .getStudentCourseEnrollments()
        .catch(() => []);
      await Promise.all(
        enrollments.map((e) =>
          progressService.deleteCourseEnrollment(e.course_id).catch(() => {}),
        ),
      );
    } catch (err) {
      console.error('Failed to reset progress:', err);
    } finally {
      await loadAll();
    }
  }, [loadAll]);

  const clearCourseProgress = useCallback(async () => {
    // The server-side deletion is performed by the caller (LearnHub's
    // unenroll uses useLearningProgress.deleteCourse, which removes the
    // enrollment and its lesson progress). Here we just re-sync.
    await loadAll();
  }, [loadAll]);

  // Badges / settings are not yet server-backed; kept as inert no-ops so the
  // existing call sites keep working.
  const awardBadge = useCallback(() => {}, []);
  const updateSettings = useCallback(() => {}, []);

  const value = {
    progress,
    isLoaded,
    refresh: loadAll,
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
    settings: progress.settings,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return ctx;
};

export default useProgress;
