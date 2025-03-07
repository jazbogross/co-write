
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { processLinesData, processDraftLines } from '@/utils/lineProcessing';
import { fetchAllLines } from '../fetchLineData';
import { loadAdminDrafts } from './adminDraftLoading';
import { loadNonAdminDrafts } from './userDraftLoading';

/**
 * Loads user drafts from the database and returns processed line data
 */
export const loadDrafts = async (
  scriptId: string,
  userId: string | null,
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  isAdmin: boolean = true
): Promise<LineData[]> => {
  if (!scriptId || !userId) {
    console.log('**** LineDataService **** loadDrafts aborted: missing scriptId or userId');
    return [];
  }
  
  console.log('**** LineDataService **** Loading drafts for user:', userId, 'isAdmin:', isAdmin);
  
  try {
    // Get the base content first - needed for both admin and non-admin users
    const allLines = await fetchAllLines(scriptId, isAdmin);
    
    if (!allLines || allLines.length === 0) {
      console.log('**** LineDataService **** No base lines found for script:', scriptId);
      return [];
    }
    
    if (isAdmin) {
      return loadAdminDrafts(allLines, contentToUuidMapRef, isAdmin);
    } else {
      return loadNonAdminDrafts(scriptId, userId, allLines, contentToUuidMapRef, isAdmin);
    }
  } catch (error) {
    console.error('**** LineDataService **** Error loading drafts:', error);
    throw error;
  }
};
