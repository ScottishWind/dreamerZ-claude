import { useState, useEffect, useCallback } from 'react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

/**
 * Hook to fetch course access info for a specific tool.
 * Returns enrollment status, free module count, preview video URL, and pricing.
 * Works for both logged-in and anonymous users.
 */
export const useEnrollment = (toolId) => {
  const [access, setAccess] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    if (!toolId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('dreamerz_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/course-access/${toolId}`, { headers });
      if (!res.ok) throw new Error('Failed to load access info');
      const data = await res.json();
      setAccess(data);
    } catch {
      // Default: not enrolled, 2 free modules
      setAccess({
        tool_id: toolId,
        enrolled: false,
        free_module_count: 2,
        preview_video_url: '',
        pricing: null,
        plan_id: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const isModuleFree = useCallback((moduleIndex) => {
    if (!access) return moduleIndex < 2;
    if (access.enrolled) return true;
    return moduleIndex < (access.free_module_count || 2);
  }, [access]);

  return {
    enrolled: access?.enrolled ?? false,
    freeModuleCount: access?.free_module_count ?? 2,
    previewVideoUrl: access?.preview_video_url ?? '',
    pricing: access?.pricing ?? null,
    planId: access?.plan_id ?? null,
    isModuleFree,
    isLoading,
    refresh: fetchAccess,
  };
};

export default useEnrollment;
