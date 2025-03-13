
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadUserDrafts } from '@/utils/suggestions/loadUserDrafts';
import { LineData } from '@/types/lineTypes';

/**
 * Hook for loading draft data for non-admin users
 */
export const useNonAdminDraftLoader = () => {
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [hasDrafts, setHasDrafts] = useState(false);

  /**
   * Load drafts for a specific script and user
   */
  const loadNonAdminDrafts = useCallback(async (
    scriptId: string,
    userId: string | null,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>
  ): Promise<boolean> => {
    if (!userId || !scriptId) {
      return false;
    }

    setIsLoadingDrafts(true);
    
    try {
      // Check if the user has any drafts for this script
      const { data: draftChecks } = await supabase
        .from('script_drafts')
        .select('id')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .limit(1);
      
      const userHasDrafts = draftChecks && draftChecks.length > 0;
      setHasDrafts(userHasDrafts);
      
      if (!userHasDrafts) {
        // No drafts found
        console.log('No drafts found for user:', userId);
        setIsLoadingDrafts(false);
        return true;
      }
      
      // Load the draft content
      const draftLineData = await loadUserDrafts(scriptId, userId, contentToUuidMapRef);
      
      // Update line data
      setLineData(draftLineData);
      setIsLoadingDrafts(false);
      return true;
    } catch (error) {
      console.error('Error loading drafts:', error);
      toast.error('Failed to load your drafts');
      setIsLoadingDrafts(false);
      return false;
    }
  }, []);

  return {
    loadNonAdminDrafts,
    isLoadingDrafts,
    hasDrafts
  };
};
