
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';

/**
 * Save lines to the database
 */
export const saveLinesToDatabase = async (
  scriptId: string,
  lineData: LineData[],
  content: string | DeltaContent
): Promise<boolean> => {
  try {
    // For the simplified Delta approach, we don't need lineData
    // Convert Delta to a format suitable for database storage
    const contentToSave = typeof content === 'string'
      ? { ops: [{ insert: content }] }
      : content;
    
    // Update script_content
    const { error } = await supabase
      .from('script_content')
      .upsert({
        script_id: scriptId,
        content_delta: JSON.parse(JSON.stringify(contentToSave)),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'script_id'
      });
    
    if (error) {
      console.error('Error saving content:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveLinesToDatabase:', error);
    return false;
  }
};

// Add missing exports for DeltaEditor.tsx
export const saveContent = async (
  scriptId: string,
  delta: any,
  userId: string,
  isAdmin: boolean = false
): Promise<boolean> => {
  try {
    // Convert the Delta to a JSON object for storage
    const contentJson = JSON.parse(JSON.stringify(delta));
    
    if (isAdmin) {
      // For admins: Update the main content
      const { error } = await supabase
        .from('script_content')
        .upsert({
          script_id: scriptId,
          content_delta: contentJson,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'script_id'
        });
      
      if (error) throw error;
      
      return true;
    } else {
      // For non-admins: Save as a draft
      if (!userId) return false;
      
      const { error } = await supabase
        .from('script_drafts')
        .upsert({
          script_id: scriptId,
          user_id: userId,
          draft_content: contentJson,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'script_id,user_id'
        });
      
      if (error) throw error;
      
      return true;
    }
  } catch (error) {
    console.error('Error saving content:', error);
    return false;
  }
};

// Load content for DeltaEditor
export const loadContent = async (
  scriptId: string,
  userId: string
): Promise<{content: any, hasDraft: boolean}> => {
  try {
    // Check for draft content first (for non-admin users)
    const { data: draft } = await supabase
      .from('script_drafts')
      .select('draft_content')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (draft?.draft_content) {
      return {
        content: draft.draft_content,
        hasDraft: true
      };
    }
    
    // Load main content
    const { data } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .single();
    
    if (data?.content_delta) {
      return {
        content: data.content_delta,
        hasDraft: false
      };
    }
    
    // Return empty Delta if no content exists
    return {
      content: { ops: [{ insert: '\n' }] },
      hasDraft: false
    };
  } catch (error) {
    console.error('Error loading content:', error);
    // Return empty Delta on error
    return {
      content: { ops: [{ insert: '\n' }] },
      hasDraft: false
    };
  }
};
