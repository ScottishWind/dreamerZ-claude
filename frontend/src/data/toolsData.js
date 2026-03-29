// Re-export from curriculum.js for backward compatibility
// This file maintains the old API while using the new curriculum data

import { 
  tools as toolsArray, 
  journeys, 
  getToolById as getToolByIdNew,
  getModuleById as getModuleByIdNew,
  getTotalModules,
  getTotalXP,
  curriculum
} from './curriculum';

// Export curriculum version for progress tracking
export const CURRICULUM_VERSION = curriculum.version;

// Transform tools to match old API format
export const toolsData = toolsArray.map(tool => ({
  id: tool.id,
  name: tool.name,
  tagline: tool.tagline,
  icon: tool.icon,
  color: tool.theme.color,
  difficulty: tool.id === 'chatgpt' ? 'Beginner' : 
              tool.id === 'gemini' || tool.id === 'syllaby' ? 'Intermediate' : 'Beginner',
  xpReward: tool.totalXP,
  description: tool.description,
  modules: journeys[tool.id]?.map(module => ({
    id: module.id,
    title: module.title,
    level: module.level,
    minutes: module.minutes,
    description: module.explanation.split('\n')[0].substring(0, 100) + '...',
    isAdvanced: module.level === 'advanced',
    content: {
      explanation: module.explanation,
      example: module.example,
      activity: module.activity
    },
    quiz: module.quiz.questions.map(q => ({
      id: q.id,
      type: q.type, // Preserve question type: 'mcq', 'true-false', 'short-answer'
      question: q.question,
      options: q.type === 'true-false' ? ['True', 'False'] : (q.options || []),
      correctAnswer: q.type === 'true-false' 
        ? (q.correctAnswer === true ? 0 : 1)
        : q.correctAnswer,
      explanation: q.explanation // Preserve explanation for feedback
    }))
  })) || []
}));

// Keep old API functions
export const getToolById = (id) => {
  return toolsData.find(tool => tool.id === id);
};

export const getModuleById = (toolId, moduleId) => {
  const tool = getToolById(toolId);
  return tool?.modules.find((module) => module.id === moduleId);
};

export { getTotalModules, getTotalXP };

// Also export new curriculum for direct access
export { toolsArray as tools, journeys };
