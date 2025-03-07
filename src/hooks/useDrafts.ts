
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';

export const useDrafts = () => {
  const loadDraftsForCurrentUser = useCallback(
    (
      scriptId: string,
      userId: string | null,
      setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
      contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
      loadDraftsImpl: (userId: string | null) => Promise<void>
    ) => {
      if (!scriptId || !userId) {
        console.log('😎 useDrafts: Missing required parameters');
        return;
      }

      console.log('😎 useDrafts: Loading drafts for', userId);
      
      try {
        // Call the implementation function provided by useLineDataInit
        return loadDraftsImpl(userId);
      } catch (error) {
        console.error('😎 useDrafts: Error loading drafts:', error);
      }
    },
    []
  );

  return { loadDraftsForCurrentUser };
};
