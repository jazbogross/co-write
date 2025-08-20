import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';
import { LineData } from '@/types/lineTypes';
import { toDelta, normalizeContentForStorage, toJSON } from '@/utils/deltaUtils';
import Delta from 'quill-delta';

/**
 * Interface for suggestion submission
 */
interface SuggestionSubmission {
  scriptId: string;
  userId: string;
  deltaDiff: DeltaStatic;
}

/**
 * Creates a suggestion for a script
 */
export const saveSuggestions = async (
  scriptId: string,
  userId: string | null,
  lineData: LineData[]
): Promise<{ success: boolean; id?: string; error?: unknown }> => {
  if (!userId) {
    console.error('Cannot save suggestions without a user ID');
    return { success: false, error: 'No user ID provided' };
  }
  
  try {
    // Extract the user's suggested Delta from lineData
    const currentDelta = lineData.length > 0 ? lineData[0].content : null;
    
    if (!currentDelta) {
      console.error('No content to save');
      return { success: false, error: 'No content to save' };
    }
    
    // Fetch original script content to compute a proper diff
    const { data: originalData, error: originalError } = await supabase
      .from('scripts')
      .select('content, updated_at')
      .eq('id', scriptId)
      .single();

    if (originalError) {
      console.error('Failed to fetch original content for diff:', originalError);
      return { success: false, error: originalError };
    }

    const originalDelta = toDelta(originalData?.content || { ops: [{ insert: '\n' }] });
    const suggestedDelta = toDelta(currentDelta);

    // Compute delta diff using quill-delta to produce retain/insert/delete/attributes ops only
    const base = new Delta((originalDelta as any).ops || []);
    const next = new Delta((suggestedDelta as any).ops || []);
    const diff = base.diff(next);
    
    // Build suggestion parts with replacement grouping (merge adjacent delete+insert at same position)
    const rows: { script_id: string; user_id: string; delta_diff: any; status: string; created_at: string }[] = [];
    let i = 0;
    let cursor = 0; // position in original content
    const opsList = diff.ops || [];
    while (i < opsList.length) {
      const op = opsList[i];
      // Advance cursor for plain retains
      if (op.retain && !op.attributes) {
        cursor += op.retain;
        i += 1;
        continue;
      }

      const created_at = new Date().toISOString();
      const partOps: any[] = [];
      if (cursor > 0) partOps.push({ retain: cursor });

      // Replacement grouping
      if (op.delete) {
        const delLen = op.delete;
        let insText: any = null;
        let insAttrs: any = null;
        // Look ahead: if next op is insert, group as one replacement
        if (i + 1 < opsList.length && opsList[i + 1].insert) {
          insText = opsList[i + 1].insert;
          insAttrs = opsList[i + 1].attributes || null;
          i += 1; // consume insert too
        }
        partOps.push({ delete: delLen });
        if (insText) {
          partOps.push({ insert: insText, ...(insAttrs ? { attributes: insAttrs } : {}) });
        }
        // Advance cursor past deleted original text
        cursor += delLen;
        i += 1;
      } else if (op.insert) {
        // Look ahead: if next is a delete, group as replacement (store as delete then insert)
        if (i + 1 < opsList.length && opsList[i + 1].delete) {
          const delLen = opsList[i + 1].delete;
          partOps.push({ delete: delLen });
          partOps.push({ insert: op.insert, ...(op.attributes ? { attributes: op.attributes } : {}) });
          cursor += delLen;
          i += 2; // consume both
        } else {
          // Pure insertion part
          partOps.push({ insert: op.insert, ...(op.attributes ? { attributes: op.attributes } : {}) });
          i += 1;
        }
        // Do not advance cursor for pure insert (it doesn't consume original)
      } else if (op.retain && op.attributes) {
        partOps.push({ retain: op.retain, attributes: op.attributes });
        cursor += op.retain;
        i += 1;
      } else {
        // Fallback: emit as-is
        partOps.push(op);
        i += 1;
      }

      // Attach baseUpdatedAt metadata inside delta_diff JSON
      const deltaJson = toJSON({ ops: partOps, meta: { baseUpdatedAt: originalData?.updated_at || null } });
      rows.push({ script_id: scriptId, user_id: userId, delta_diff: deltaJson, status: 'pending', created_at });
    }
    
    // Get the current authenticated user to verify
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData || !userData.user) {
      console.error('No authenticated user found');
      return { success: false, error: 'Authentication required' };
    }
    
    // Make sure userId matches the authenticated user's ID
    if (userData.user.id !== userId) {
      console.error('User ID mismatch');
      return { success: false, error: 'User ID does not match authenticated user' };
    }
    
    console.log('Saving suggestion diff for script:', scriptId, 'by user:', userId);
    
    // Save multiple rows to database
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert(rows)
      .select('id');
    
    if (error) {
      console.error('Error saving suggestion:', error);
      return { success: false, error };
    }
    
    console.log('Suggestion parts saved successfully:', data?.length || 0);
    return { success: true };
  } catch (error) {
    console.error('Error in saveSuggestions:', error);
    return { success: false, error };
  }
};
