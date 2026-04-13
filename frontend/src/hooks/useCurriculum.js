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
      const response = await fetch(`${API_BASE}/api/content/tools`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.message || 'Failed to load curriculum content.');
      }
      const data = await response.json();
      setTools(data.map((tool) => formatTool(tool, tool.modules || [])));
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
