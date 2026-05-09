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
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [toolsRes, catsRes] = await Promise.all([
        fetch(`${API_BASE}/api/content/tools`),
        fetch(`${API_BASE}/api/content/categories`),
      ]);

      if (!toolsRes.ok) {
        const data = await toolsRes.json().catch(() => ({}));
        throw new Error(data.detail || data.message || 'Failed to load courses.');
      }

      const toolsData = await toolsRes.json();
      const formatted = toolsData.map((tool) => formatTool(tool, tool.modules || []));
      setCourses(formatted);

      // Categories endpoint is best-effort; if it fails we silently fall back to
      // synthesising from courses so the UI still renders something.
      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setCategories(Array.isArray(catsData) ? catsData : []);
      } else {
        setCategories([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load curriculum content.');
      setCourses([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    tools: courses,
    courses,
    categories,
    isLoading,
    error,
    refresh: fetchAll
  };
};

export default useCurriculum;
