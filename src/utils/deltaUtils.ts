import { DeltaStatic } from 'quill';
import Delta from 'quill-delta';
import { supabase } from '@/integrations/supabase/client';

/**
 * Convert a JSON object to a proper Quill Delta
 */
export const toDelta = (obj: any): DeltaStatic => {
  if (!obj) return new Delta() as unknown as DeltaStatic;
  
  // If already a Delta instance, return it
  if (typeof obj.compose === 'function') return obj;
  
  // Otherwise create a new Delta from the object
  return new Delta(obj) as unknown as DeltaStatic;
};

/**
 * Convert a Delta to a plain JSON object for storage
 */
export const toJSON = (delta: DeltaStatic): any => {
  return JSON.parse(JSON.stringify(delta));
};

/**
 * Save a Delta to the database
 */
export const saveContent = async (
  scriptId: string, 
  delta: DeltaStatic,
  userId: string | null,
  isAdmin: boolean = false
): Promise<boolean> => {
  try {
    // Convert the Delta to a JSON object for storage
    const contentJson = toJSON(delta);
    
    if (isAdmin) {
      // For admins: Update the main content and create a version
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
      
      // Get the current version number
      const { data: currentContent } = await supabase
        .from('script_content')
        .select('version')
        .eq('script_id', scriptId)
        .single();
      
      // Create a new version entry
      await supabase
        .from('script_versions')
        .insert({
          script_id: scriptId,
          version_number: (currentContent?.version || 0) + 1,
          content_delta: contentJson,
          created_by: userId
        });
      
      // Update the version number in the main content
      await supabase
        .from('script_content')
        .update({
          version: (currentContent?.version || 0) + 1
        })
        .eq('script_id', scriptId);
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
    }
    
    return true;
  } catch (error) {
    console.error('Error saving content:', error);
    return false;
  }
};

/**
 * Load content for a script
 */
export const loadContent = async (
  scriptId: string,
  userId: string | null
): Promise<{ contentDelta: DeltaStatic, hasDraft: boolean }> => {
  try {
    // Check for draft content first (for non-admin users)
    if (userId) {
      const { data: draft } = await supabase
        .from('script_drafts')
        .select('draft_content')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (draft?.draft_content) {
        return {
          contentDelta: toDelta(draft.draft_content),
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
        contentDelta: toDelta(data.content_delta),
        hasDraft: false
      };
    }
    
    // Return empty Delta if no content exists
    return {
      contentDelta: toDelta({ ops: [{ insert: '\n' }] }),
      hasDraft: false
    };
  } catch (error) {
    console.error('Error loading content:', error);
    // Return empty Delta on error
    return {
      contentDelta: toDelta({ ops: [{ insert: '\n' }] }),
      hasDraft: false
    };
  }
};

/**
 * Create suggestion as a diff between original and new content
 */
export const createSuggestion = async (
  scriptId: string,
  originalDelta: DeltaStatic,
  newDelta: DeltaStatic,
  userId: string | null
): Promise<boolean> => {
  try {
    if (!userId) return false;
    
    // Calculate diff between original and new content
    const diffDelta = originalDelta.diff(newDelta);
    const diffJson = toJSON(diffDelta);
    
    // Save the diff as a suggestion
    const { error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
        delta_diff: diffJson,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    // Clear user's draft after submitting suggestion
    await supabase
      .from('script_drafts')
      .delete()
      .eq('script_id', scriptId)
      .eq('user_id', userId);
    
    return true;
  } catch (error) {
    console.error('Error creating suggestion:', error);
    return false;
  }
};
