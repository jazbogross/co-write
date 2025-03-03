
import { LineData } from '@/hooks/useLineData';
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
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (fetchError) throw fetchError;
    
    // Unlike before, we don't throw an error if no existingLines, we just proceed with empty array
    const existingLinesArray = existingLines || [];
    
    // Create a map of existing line UUIDs for quick lookup
    const existingLineMap = new Map();
    existingLinesArray.forEach(line => {
      existingLineMap.set(line.id, line);
    });
    
    // Get all current line UUIDs in the editor
    const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
    
    // First, batch prepare all updates and inserts
    const linesToUpdate = [];
    const linesToInsert = [];
    
    // First, update draft position for all lines in lineData
    for (const line of lineData) {
      const existingLine = existingLineMap.get(line.uuid);
      
      if (existingLine) {
        // Only update if content changed or line position changed
        const contentChanged = line.content !== existingLine.content;
        const positionChanged = line.lineNumber !== existingLine.line_number_draft;
        
        if (contentChanged || positionChanged) {
          // Line exists - update its draft content and draft line number
          linesToUpdate.push({
            id: line.uuid,
            draft: contentChanged ? line.content : existingLine.draft,
            line_number_draft: line.lineNumber
          });
        }
      } else {
        // New line - add it to script_content with both regular and draft content
        linesToInsert.push({
          id: line.uuid,
          script_id: scriptId,
          line_number: null,  // No original line number for new lines
          line_number_draft: line.lineNumber,
          content: '',  // Original content is empty for new lines
          draft: line.content,
          original_author: userId,
          edited_by: userId ? [userId] : []
        });
      }
    }
    
    // Handle deleted lines (lines that exist in DB but not in editor)
    const deletedLineUpdates = [];
    for (const existingLine of existingLinesArray) {
      if (!currentLineUUIDs.has(existingLine.id)) {
        // Line was deleted - mark it as deleted in draft
        deletedLineUpdates.push({
          id: existingLine.id,
          draft: '{deleted-uuid}'
        });
      }
    }
    
    // Process all operations in batches
    const operations = [];
    
    // 1. Process inserts (new lines)
    if (linesToInsert.length > 0) {
      operations.push(supabase
        .from('script_content')
        .insert(linesToInsert)
        .then(({error}) => {
          if (error) throw error;
          console.log(`Inserted ${linesToInsert.length} new lines`);
        })
      );
    }
    
    // 2. Process updates (changed lines)
    if (linesToUpdate.length > 0) {
      // Update in batches of 50 to prevent request size limits
      const batchSize = 50;
      for (let i = 0; i < linesToUpdate.length; i += batchSize) {
        const batch = linesToUpdate.slice(i, i + batchSize);
        operations.push(
          ...batch.map(lineUpdate => 
            supabase
              .from('script_content')
              .update({
                draft: lineUpdate.draft,
                line_number_draft: lineUpdate.line_number_draft
              })
              .eq('id', lineUpdate.id)
              .then(({error}) => {
                if (error) throw error;
              })
          )
        );
      }
      console.log(`Updated ${linesToUpdate.length} existing lines`);
    }
    
    // 3. Process deletions (lines removed from editor)
    if (deletedLineUpdates.length > 0) {
      // Mark deleted lines in batches of 50
      const batchSize = 50;
      for (let i = 0; i < deletedLineUpdates.length; i += batchSize) {
        const batch = deletedLineUpdates.slice(i, i + batchSize);
        operations.push(
          ...batch.map(lineUpdate => 
            supabase
              .from('script_content')
              .update({
                draft: lineUpdate.draft
              })
              .eq('id', lineUpdate.id)
              .then(({error}) => {
                if (error) throw error;
              })
          )
        );
      }
      console.log(`Marked ${deletedLineUpdates.length} lines as deleted`);
    }
    
    // Execute all operations in parallel
    await Promise.all(operations);
    
    console.log('Draft save operations completed successfully');
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};
