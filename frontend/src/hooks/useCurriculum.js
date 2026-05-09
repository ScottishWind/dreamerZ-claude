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
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/content/tools`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.message || 'Failed to load curriculum content.');
      }

      const toolsData = await res.json();
      const formatted = toolsData.map((tool) => formatTool(tool, tool.modules || []));

      setCourses(formatted);
    } catch (err) {
      setError(err.message || 'Unable to load curriculum content.');
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    tools: courses,
    courses,
    isLoading,
    error,
    refresh: fetchCourses
  };
};

export default useCurriculum;
