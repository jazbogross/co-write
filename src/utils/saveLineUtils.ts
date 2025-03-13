
import { DeltaStatic } from 'quill';
import { supabase } from '@/integrations/supabase/client';

/**
 * Save content to the database
 */
export const saveContent = async (
  scriptId: string,
  delta: DeltaStatic,
  userId: string | null,
  isAdmin: boolean = false
): Promise<boolean> => {
  try {
    // Convert Delta to JSON for storage
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
      
      // Get current version number
      const { data: currentContent } = await supabase
        .from('script_content')
        .select('version')
        .eq('script_id', scriptId)
        .single();
      
      // Create a new version
      await supabase
        .from('script_versions')
        .insert({
          script_id: scriptId,
          version_number: (currentContent?.version || 0) + 1,
          content_delta: contentJson,
          created_by: userId
        });
      
      // Update version number
      await supabase
        .from('script_content')
        .update({
          version: (currentContent?.version || 0) + 1
        })
        .eq('script_id', scriptId);
    } else {
      // For non-admins: Save as draft
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
    }
    
    return true;
  } catch (error) {
    console.error('Error saving content:', error);
    return false;
  }
};

/**
 * Load content from the database
 */
export const loadContent = async (
  scriptId: string,
  userId: string | null
): Promise<{ content: DeltaStatic, hasDraft: boolean }> => {
  try {
    // Check for draft first
    if (userId) {
      const { data: draft } = await supabase
        .from('script_drafts')
        .select('draft_content')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (draft?.draft_content) {
        return {
          content: draft.draft_content as unknown as DeltaStatic,
          hasDraft: true
        };
      }
    }
    
    // Load main content
    const { data } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .single();
    
    if (data?.content_delta) {
      return {
        content: data.content_delta as unknown as DeltaStatic,
        hasDraft: false
      };
    }
    
    // Return empty Delta if no content exists
    return {
      content: { ops: [{ insert: '\n' }] } as unknown as DeltaStatic,
      hasDraft: false
    };
  } catch (error) {
    console.error('Error loading content:', error);
    return {
      content: { ops: [{ insert: '\n' }] } as unknown as DeltaStatic,
      hasDraft: false
    };
  }
};
