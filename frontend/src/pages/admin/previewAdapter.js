/**
 * Adapter to convert a course draft (blueprint shape) into the learner-facing
 * tool/sections shape expected by JourneyPlayer.
 *
 * Draft shape:
 *   draft.blueprint.modules[*].lessons[*] with
 *   lesson.content = { explanation, example, activity, key_takeaways, quiz: { questions: [...] } }
 *   lesson.quiz.questions[*] = { question, options, correct_index, explanation }
 *
 * Learner shape:
 *   tool = { id, name, icon, color, xpReward }
 *   sections[*] = { id, title, sort_order, lessons: [{ id, title, level, minutes, content, quiz }] }
 *   quiz.questions[*] = { question, options, correctAnswer, explanation, type }
 */

export const draftToLearnerTool = (draft) => {
  if (!draft || !draft.blueprint) {
    return null;
  }

  const { blueprint, id: draftId } = draft;

  // Build the tool object (minimal metadata)
  const tool = {
    id: draftId,
    name: blueprint.course_title || 'Untitled Course',
    icon: '✨',
    color: '#6366f1',
    xpReward: 0, // Preview mode — no XP
  };

  // Build hierarchical sections structure
  const sections = (blueprint.modules || []).map((module, mIdx) => {
    const lessons = (module.lessons || []).map((lesson, lIdx) => {
      const content = lesson.content || {};
      const quizQuestions = (content.quiz?.questions || []).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_index, // rename to match Quiz component
        explanation: q.explanation,
        type: 'mcq',
      }));

      return {
        id: lesson.id,
        title: `M${mIdx + 1}.${lIdx + 1} — ${lesson.title}`,
        level: blueprint.difficulty || 'beginner',
        minutes: lesson.minutes || 10,
        content: {
          explanation: content.explanation || '',
          example: content.example || '',
          activity: content.activity || '',
        },
        quiz: {
          questions: quizQuestions,
        },
        // Track original module/lesson for debugging
        _originalModuleId: module.id,
        _originalLessonId: lesson.id,
      };
    });

    return {
      id: module.id,
      title: module.title,
      sort_order: module.order || mIdx,
      lessons,
    };
  });

  // Stubbed progress hooks for read-only preview
  const isModuleCompleted = () => false;
  const isModuleUnlocked = () => true; // All modules explorable in preview
  const getModuleProgress = () => null;
  const completeModule = () => {}; // No-op

  return {
    tool,
    sections,
    isModuleCompleted,
    isModuleUnlocked,
    getModuleProgress,
    completeModule,
  };
};
