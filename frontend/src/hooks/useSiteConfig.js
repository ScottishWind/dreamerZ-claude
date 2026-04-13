import { useState, useEffect, useCallback } from 'react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

/**
 * Hook to fetch all site config from the backend in a single call.
 * Returns pricing plans, FAQs, trust points, benefits, stats,
 * AI tools list, and English week breakdown.
 *
 * DB-backed: pricing plans, FAQs.  Code-backed: trust points, benefits, stats, etc.
 */
export const useSiteConfig = () => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/site/config`);
      if (!response.ok) {
        throw new Error('Failed to load site configuration.');
      }
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err.message || 'Unable to load site configuration.');
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    pricingPlans: config?.pricing?.plans || [],
    bundlePaymentLink: config?.pricing?.bundle_payment_link || '#payment-bundle',
    faqs: config?.faqs || [],
    trustPoints: config?.trust_points || [],
    benefits: config?.benefits || [],
    stats: config?.stats || [],
    aiTools: config?.ai_tools || [],
    englishWeeks: config?.english_weeks || [],
    isLoading,
    error,
    refresh: fetchConfig
  };
};

/**
 * Hook to fetch only pricing data (lighter, for Tools/Curriculum pages).
 */
export const usePricing = () => {
  const [plans, setPlans] = useState([]);
  const [bundleLink, setBundleLink] = useState('#payment-bundle');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPricing = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/site/pricing`);
      if (!response.ok) throw new Error('Failed to load pricing.');
      const data = await response.json();
      setPlans(data.plans || []);
      setBundleLink(data.bundle_payment_link || '#payment-bundle');
    } catch {
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const getPlan = (id) => plans.find(p => p.id === id);

  return { plans, bundleLink, isLoading, getPlan, refresh: fetchPricing };
};

export default useSiteConfig;
