
import { useRef } from 'react';
import { LineData } from '@/types/lineTypes';

export const useDrafts = () => {
  const isLoadingDrafts = useRef<boolean>(false);
  
  const loadDraftsForCurrentUser = async (
    scriptId: string, 
    userId: string | null, 
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
    loadDraftsImplementation: (userId: string | null) => Promise<void>
  ) => {
    if (!scriptId || !userId || isLoadingDrafts.current) return;
    
    isLoadingDrafts.current = true;
    console.log('Loading drafts for user:', userId);
    
    try {
      // Use the simplified implementation from useLineDataInit
      await loadDraftsImplementation(userId);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      isLoadingDrafts.current = false;
    }
  };

  return { loadDraftsForCurrentUser };
};
