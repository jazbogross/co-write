
import { supabase } from '@/integrations/supabase/client';
import { LineData, DeltaStatic } from '@/types/lineTypes';
import { toast } from 'sonner';

// Save suggestions
export const saveSuggestions = async (
  scriptId: string, 
  lineData: LineData[], 
  content: string,
  userId: string
) => {
  try {
    // For the new delta approach, we only need to submit the delta diff
    const { data: latestContent } = await supabase
      .from('script_content')
      .select('content_delta, version')
      .eq('script_id', scriptId)
      .single();
    
    if (!latestContent) {
      throw new Error('No content found for this script');
    }
    
    // In a real implementation, we would calculate the delta diff between
    // the original content and the user's changes.
    // For now, we'll just save the entire content as a suggestion
    
    // Get the current editor content from the draft if it exists
    const { data: existingDraft } = await supabase
      .from('script_drafts')
      .select('draft_content')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .maybeSingle();
    
    const deltaDiff = existingDraft?.draft_content || {
      ops: [{ insert: "Sample suggestion\n" }]
    };
    
    // Save the suggestion
    await supabase.from('script_suggestions').insert({
      script_id: scriptId,
      user_id: userId,
      delta_diff: deltaDiff,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Clear the draft after submitting the suggestion
    if (existingDraft) {
      await supabase
        .from('script_drafts')
        .delete()
        .eq('script_id', scriptId)
        .eq('user_id', userId);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving suggestions:', error);
    toast.error('Failed to save suggestions');
    return false;
  }
};

// Save line drafts - simplified for delta approach
export const saveLineDrafts = async (
  scriptId: string,
  lineData: LineData[],
  content: string,
  userId: string
) => {
  try {
    // In the delta approach, we simply save the entire draft content
    // Get current editor content from somewhere, or use lineData to reconstruct
    
    // For now, we'll just mock a Delta
    const draftContent = {
      ops: [
        { insert: "Draft content\n" },
        { insert: "Line 2\n" }
      ]
    };
    
    // Check if draft already exists
    const { data: existingDraft } = await supabase
      .from('script_drafts')
      .select('id')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingDraft) {
      // Update existing draft
      await supabase
        .from('script_drafts')
        .update({
          draft_content: draftContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDraft.id);
    } else {
      // Insert new draft
      await supabase
        .from('script_drafts')
        .insert({
          script_id: scriptId,
          user_id: userId,
          draft_content: draftContent
        });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving drafts:', error);
    toast.error('Failed to save drafts');
    return false;
  }
};
