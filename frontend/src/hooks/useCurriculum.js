import { useState, useEffect, useCallback } from 'react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const formatModulePreview = (module) => {
  const firstLine = (module.explanation || '').split('\n')[0] || '';
  return {
    ...module,
    description: firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine,
    isAdvanced: module.level === 'advanced',
    content: {
      explanation: module.explanation || '',
      example: module.example || '',
      activity: module.activity || ''
    }
  };
};

const formatTool = (tool, modules = []) => ({
  ...tool,
  xpReward: tool.totalXP,
  color: tool.theme?.color || '#10A37F',
  modules: modules.map(formatModulePreview)
});

export const useCurriculum = () => {
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch legacy tools and published courses in parallel
      const [toolsRes, coursesRes] = await Promise.all([
        fetch(`${API_BASE}/api/content/tools`),
        fetch(`${API_BASE}/api/content/courses`).catch(() => null),
      ]);

      if (!toolsRes.ok) {
        const data = await toolsRes.json();
        throw new Error(data.detail || data.message || 'Failed to load curriculum content.');
      }
      const toolsData = await toolsRes.json();
      const formattedTools = toolsData.map((tool) => formatTool(tool, tool.modules || []));

      // Format published courses as tool-like objects
      let formattedCourses = [];
      if (coursesRes && coursesRes.ok) {
        const coursesData = await coursesRes.json();
        formattedCourses = coursesData.map((course) => {
          const allLessons = (course.sections || []).flatMap((s) => s.lessons || []);
          const diffMap = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
          return {
            ...formatTool(
              {
                id: course.id,
                name: course.name,
                description: course.description,
                tagline: course.tagline || (course.description || '').slice(0, 80),
                category_id: course.category_id || 'ai-learning',
                theme: course.theme || { color: '#7C3AED' },
                totalXP: course.total_xp || allLessons.length * 100,
                icon: course.icon || '📚',
              },
              allLessons
            ),
            difficulty: diffMap[course.difficulty] || 'Beginner',
            _isCourse: true,
          };
        });
      }

      setTools([...formattedTools, ...formattedCourses]);
    } catch (err) {
      setError(err.message || 'Unable to load curriculum content.');
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    tools,
    isLoading,
    error,
    refresh: fetchTools
  };
};

export default useCurriculum;
