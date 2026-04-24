/**
 * Adapter to convert a published course (from GET /api/content/courses/{id})
 * into the learner-facing tool/modules shape expected by JourneyPlayer.
 *
 * Published course shape:
 *   course = { id, name, description, sections: [{ id, title, lessons: [...] }] }
 *
 * Learner shape:
 *   tool = { id, name, icon, color, xpReward }
 *   modules[*] = { id, title, level, minutes, content: { explanation, example, activity }, quiz: { questions } }
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

  // Flatten sections → lessons into modules array
  const modules = [];
  (course.sections || []).forEach((section, sIdx) => {
    (section.lessons || []).forEach((lesson) => {
      modules.push({
        ...lesson,
        sectionTitle: section.title,
        sectionOrder: section.sort_order || sIdx,
      });
    });
  });

  // Stubbed progress hooks for admin preview
  const isModuleCompleted = () => false;
  const isModuleUnlocked = () => true;
  const getModuleProgress = () => null;
  const completeModule = () => {};

  return {
    tool,
    modules,
    isModuleCompleted,
    isModuleUnlocked,
    getModuleProgress,
    completeModule,
  };
};
