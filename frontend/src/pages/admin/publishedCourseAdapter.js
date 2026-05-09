/**
 * Adapter to convert a published course (from GET /api/content/courses/{id})
 * into the learner-facing tool/sections shape expected by JourneyPlayer.
 *
 * Published course shape:
 *   course = { id, name, description, sections: [{ id, title, lessons: [...] }] }
 *
 * Learner shape:
 *   tool = { id, name, icon, color, xpReward }
 *   sections[*] = { id, title, sort_order, lessons: [{ id, title, level, minutes, content, quiz }] }
 */

export const publishedCourseToLearnerTool = (course) => {
  if (!course) return null;

  const tool = {
    id: course.id,
    name: course.name || 'Untitled Course',
    icon: course.icon || '📚',
    color: course.theme?.color || '#6366f1',
    xpReward: 0, // Preview — no XP
  };

  // Pass sections with nested lessons (hierarchical structure)
  const sections = (course.sections || []).map((section) => ({
    id: section.id,
    title: section.title,
    sort_order: section.sort_order,
    lessons: section.lessons || [],
  }));

  // Stubbed progress hooks for admin preview
  const isModuleCompleted = () => false;
  const isModuleUnlocked = () => true;
  const getModuleProgress = () => null;
  const completeModule = () => {};

  return {
    tool,
    sections,
    isModuleCompleted,
    isModuleUnlocked,
    getModuleProgress,
    completeModule,
  };
};
