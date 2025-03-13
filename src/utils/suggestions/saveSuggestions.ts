
import { supabase } from '@/integrations/supabase/client';
import { DeltaContent } from '@/utils/editor/types';
import { LineData } from '@/types/lineTypes';

/**
 * Interface for suggestion submission
 */
interface SuggestionSubmission {
  scriptId: string;
  userId: string;
  deltaDiff: DeltaContent;
}

/**
 * Creates a suggestion for a script
 */
export const saveSuggestions = async (
  scriptId: string,
  userId: string | null,
  lineData: LineData[],
  originalContent: any
): Promise<{ success: boolean; id?: string; error?: any }> => {
  if (!userId) {
    console.error('Cannot save suggestions without a user ID');
    return { success: false, error: 'No user ID provided' };
  }
  
  try {
    // Calculate the diff between current content and original content
    // In the simplified Delta approach, we just store the entire Delta
    const currentDelta = lineData.length > 0 ? lineData[0].content : null;
    
    if (!currentDelta) {
      console.error('No content to save');
      return { success: false, error: 'No content to save' };
    }
    
    // For now, we simply store the entire Delta as the diff
    // In a real implementation, you'd calculate an actual diff
    const deltaDiff = currentDelta;
    
    // Create the suggestion
    const suggestion: SuggestionSubmission = {
      scriptId,
      userId,
      deltaDiff: deltaDiff as DeltaContent
    };
    
    // Save to database
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: suggestion.scriptId,
        user_id: suggestion.userId,
        delta_diff: suggestion.deltaDiff as any,
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving suggestion:', error);
      return { success: false, error };
    }
    
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error in saveSuggestions:', error);
    return { success: false, error };
  }
};
