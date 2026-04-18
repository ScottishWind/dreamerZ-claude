/**
 * Hook stub — all courses are now free.
 * Kept for backward compatibility. Always returns full access.
 */
export const useEnrollment = (_toolId) => {
  return {
    enrolled: true,
    freeModuleCount: 999,
    previewVideoUrl: '',
    pricing: null,
    planId: null,
    isModuleFree: () => true,
    isLoading: false,
    refresh: () => {},
  };
};

export default useEnrollment;
