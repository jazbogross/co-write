
import { LineData } from '@/hooks/useLineData';
import { supabase } from '@/integrations/supabase/client';

export const saveDraft = async (
  scriptId: string, 
  lineData: LineData[], 
  content: string, 
  userId: string | null
) => {
  try {
    // First get all existing lines for this script
    const { data: existingLines, error: fetchError } = await supabase
      .from('script_content')
      .select('id, line_number, content, draft')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (fetchError) throw fetchError;
    
    if (!existingLines || existingLines.length === 0) {
      throw new Error('No existing content found');
    }
    
    // Create a map of existing line UUIDs for quick lookup
    const existingLineMap = new Map();
    existingLines.forEach(line => {
      existingLineMap.set(line.id, line);
    });
    
    // Get all current line UUIDs in the editor
    const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
    
    // First, update draft position for all lines in lineData
    for (const line of lineData) {
      const existingLine = existingLineMap.get(line.uuid);
      
      if (existingLine) {
        // Line exists - update its draft content and draft line number
        const { error } = await supabase
          .from('script_content')
          .update({
            draft: line.content !== existingLine.content ? line.content : existingLine.draft,
            line_number_draft: line.lineNumber
          })
          .eq('id', line.uuid);
          
        if (error) throw error;
      } else {
        // New line - add it to script_content with both regular and draft content
        const { error } = await supabase
          .from('script_content')
          .insert({
            id: line.uuid,
            script_id: scriptId,
            line_number: null,  // No original line number for new lines
            line_number_draft: line.lineNumber,
            content: '',  // Original content is empty for new lines
            draft: line.content,
            original_author: userId,
            edited_by: userId ? [userId] : []
          });
          
        if (error) throw error;
      }
    }
    
    // Handle deleted lines (lines that exist in DB but not in editor)
    for (const existingLine of existingLines) {
      if (!currentLineUUIDs.has(existingLine.id)) {
        // Line was deleted - mark it as deleted in draft
        const { error } = await supabase
          .from('script_content')
          .update({
            draft: '{deleted-uuid}'
          })
          .eq('id', existingLine.id);
          
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};
