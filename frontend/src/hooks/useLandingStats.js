import { useEffect, useState, useCallback } from 'react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const DEFAULT_STATS = {
  learners: 0,
  lessons_completed: 0,
  avg_minutes_per_learner: 0,
  top_courses: [],
  registrations_last_30d: [],
  as_of: null,
};

/**
 * Fetch the aggregate metrics rendered on the public landing page.
 * Single request to /api/content/landing-stats; the response is cached
 * server-side for 5 minutes (Cache-Control), so this is cheap to call
 * even on every page load.
 *
 * Returns: { stats, isLoading, error, refresh }
 */
export const useLandingStats = () => {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/content/landing-stats`);
      if (!res.ok) {
        // 5xx is acceptable on the landing page — we just show defaults.
        // Don't block hero render on a backend hiccup.
        throw new Error(`Stats unavailable (${res.status})`);
      }
      const data = await res.json();
      setStats({ ...DEFAULT_STATS, ...data });
    } catch (err) {
      setError(err.message || 'Could not load stats');
      // Keep DEFAULT_STATS so the page still renders something.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
};

export default useLandingStats;
