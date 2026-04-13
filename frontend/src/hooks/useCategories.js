import { useState, useEffect, useCallback } from 'react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/content/categories`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.message || 'Failed to load categories.');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Unable to load categories.');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refresh: fetchCategories,
  };
};

export default useCategories;
