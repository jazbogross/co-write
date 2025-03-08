
import { LineData } from '@/types/lineTypes';

/**
 * Hook for admin-specific draft loading
 */
export const useAdminDraftLoader = () => {
  const loadAdminDrafts = async (
    userId: string | null,
    loadDraftsImplementation: (userId: string | null) => Promise<void>
  ) => {
    console.log('Using admin draft loading implementation');
    if (!userId) return;
    
    await loadDraftsImplementation(userId);
  };

  return { loadAdminDrafts };
};
