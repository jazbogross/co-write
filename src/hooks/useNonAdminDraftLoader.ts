
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadUserDrafts } from '@/utils/suggestions/loadUserDrafts';
import { LineData } from '@/types/lineTypes';

interface UseNonAdminDraftLoaderParams {
  scriptId: string;
  userId: string | null;
  setLineData: React.Dispatch<React.SetStateAction<LineData[]>>;
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>;
}

interface UseNonAdminDraftLoaderResult {
  loadDrafts: () => Promise<{ success: boolean; lineData?: LineData[] }>;
  isLoadingDrafts: boolean;
  hasDrafts: boolean;
}

/**
 * Hook for loading draft data for non-admin users
 */
export const useNonAdminDraftLoader = ({
  scriptId,
  userId,
  setLineData,
  contentToUuidMapRef
}: UseNonAdminDraftLoaderParams): UseNonAdminDraftLoaderResult => {
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [hasDrafts, setHasDrafts] = useState(false);

  /**
   * Load drafts from the database
   */
  const loadDrafts = useCallback(async (): Promise<{ success: boolean; lineData?: LineData[] }> => {
    if (!userId || !scriptId) {
      return { success: false };
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
        return { success: true, lineData: [] };
      }
      
      // Load the draft content
      const draftLineData = await loadUserDrafts(scriptId, userId, contentToUuidMapRef);
      
      // Update line data
      setLineData(draftLineData);
      
      return { 
        success: true,
        lineData: draftLineData
      };
    } catch (error) {
      console.error('Error loading drafts:', error);
      toast.error('Failed to load your drafts');
      return { success: false };
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [scriptId, userId, setLineData, contentToUuidMapRef]);

  return {
    loadDrafts,
    isLoadingDrafts,
    hasDrafts
  };
};
