
import { LineData } from '@/types/lineTypes';
import { supabase } from '@/integrations/supabase/client';

export const saveDraft = async (
  scriptId: string, 
  lineData: LineData[], 
  content: string, 
  userId: string | null
) => {
  try {
    console.log('Saving draft for script:', scriptId, 'with', lineData.length, 'lines');
    
    // First get all existing lines for this script
    const { data: existingLines, error: fetchError } = await supabase
      .from('script_content')
      .select('id, line_number, content, draft, line_number_draft')
      .eq('script_id', scriptId);
      
    if (fetchError) {
      console.error('Error fetching existing lines:', fetchError);
      throw fetchError;
    }
    
    // Create a map of existing line UUIDs for quick lookup
    const existingLineMap = new Map();
    if (existingLines && existingLines.length > 0) {
      existingLines.forEach(line => {
        existingLineMap.set(line.id, line);
      });
    }
    
    // Get all current line UUIDs in the editor
    const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
    
    // Process all current lines from the editor (source of truth)
    for (const line of lineData) {
      const existingLine = existingLineMap.get(line.uuid);
      
      if (existingLine) {
        // Line exists - check if we need to update draft content or line number
        const updates: { draft?: string; line_number_draft?: number } = {};
        let needsUpdate = false;
        
        // Only update draft if content changed
        if (line.content !== existingLine.content && line.content !== existingLine.draft) {
          updates.draft = line.content;
          needsUpdate = true;
          console.log(`Updating draft content for line ${line.uuid}: content changed`);
        }
        
        // Only update line_number_draft if position changed
        if (line.lineNumber !== existingLine.line_number && 
            line.lineNumber !== existingLine.line_number_draft) {
          updates.line_number_draft = line.lineNumber;
          needsUpdate = true;
          console.log(`Updating draft position for line ${line.uuid}: ${existingLine.line_number} -> ${line.lineNumber}`);
        }
        
        // Only perform update if there are changes
        if (needsUpdate) {
          const { error } = await supabase
            .from('script_content')
            .update(updates)
            .eq('id', line.uuid);
            
          if (error) {
            console.error('Error updating existing line:', error);
            throw error;
          }
        } else {
          console.log(`No changes needed for line ${line.uuid}`);
        }
      } else {
        // New line - add it to script_content with draft content only
        // Set line_number to minimum default (0) to satisfy not-null constraint
        // but use line_number_draft for actual draft positioning
        const { error } = await supabase
          .from('script_content')
          .insert({
            id: line.uuid,
            script_id: scriptId,
            line_number: 0,  // Minimal placeholder to satisfy not-null constraint
            line_number_draft: line.lineNumber,
            content: '',     // Empty content for unpublished lines
            draft: line.content,
            original_author: userId,
            edited_by: userId ? [userId] : []
          });
          
        if (error) {
          console.error('Error inserting new line:', error);
          throw error;
        }
      }
    }
    
    // Handle deleted lines (lines that exist in DB but not in editor)
    if (existingLines && existingLines.length > 0) {
      for (const existingLine of existingLines) {
        if (!currentLineUUIDs.has(existingLine.id)) {
          // Line was deleted - mark it as deleted in draft
          const { error } = await supabase
            .from('script_content')
            .update({
              draft: '{deleted-uuid}'
            })
            .eq('id', existingLine.id);
            
          if (error) {
            console.error('Error marking line as deleted:', error);
            throw error;
          }
        }
      }
    }
    
    console.log('Draft saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};
