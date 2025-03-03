
import { LineData } from '@/types/lineTypes';
import { supabase } from '@/integrations/supabase/client';

export const saveLinesToDatabase = async (
  scriptId: string,
  lineData: LineData[],
  content: string
) => {
  try {
    console.log('Saving lines to database and clearing drafts');
    
    // First, get all existing lines
    const { data: existingLines, error: fetchError } = await supabase
      .from('script_content')
      .select('id, line_number')
      .eq('script_id', scriptId);
      
    if (fetchError) throw fetchError;
    
    // Create a map of existing line UUIDs for quick lookup
    const existingLineMap = new Map();
    if (existingLines) {
      existingLines.forEach(line => existingLineMap.set(line.id, line.line_number));
    }
    
    console.log(`Found ${existingLineMap.size} existing lines, processing ${lineData.length} lines`);
    
    // First, make sure we're not trying to save duplicate line numbers
    // Sort lineData by line number to ensure we save in order
    lineData.sort((a, b) => a.lineNumber - b.lineNumber);
    
    // Process each line: update existing lines, insert new ones
    for (const line of lineData) {
      if (existingLineMap.has(line.uuid)) {
        // Update existing line with current content and clear draft fields
        const { error } = await supabase
          .from('script_content')
          .update({
            content: line.content,
            line_number: line.lineNumber,
            draft: null,           // Clear draft content
            line_number_draft: null // Clear draft line number
          })
          .eq('id', line.uuid);
          
        if (error) {
          console.error('Error updating existing line:', error, line);
          throw error;
        }
      } else {
        // Check if a line with this line number already exists
        const duplicateLineNumber = existingLines?.find(existing => 
          existing.line_number === line.lineNumber && existing.id !== line.uuid);
          
        if (duplicateLineNumber) {
          console.warn(`Line number ${line.lineNumber} already exists with a different UUID. Adjusting...`);
          
          // Update the existing line's number to avoid conflict
          const { error: updateError } = await supabase
            .from('script_content')
            .update({ line_number: -1 }) // Temporarily set to negative to avoid conflicts
            .eq('id', duplicateLineNumber.id);
            
          if (updateError) {
            console.error('Error updating duplicate line number:', updateError);
            throw updateError;
          }
        }
        
        // Insert new line
        console.log(`Inserting new line: ${line.uuid}, line number: ${line.lineNumber}`);
        const { error } = await supabase
          .from('script_content')
          .insert({
            id: line.uuid,
            script_id: scriptId,
            line_number: line.lineNumber,
            content: line.content,
            original_author: line.originalAuthor,
            edited_by: line.editedBy,
            draft: null,           // No draft content
            line_number_draft: null // No draft line number
          });
          
        if (error) {
          console.error('Error inserting new line:', error, line);
          throw error;
        }
      }
    }
    
    // Delete any lines that no longer exist
    const currentLineUUIDs = lineData.map(line => line.uuid);
    if (existingLines) {
      for (const line of existingLines) {
        if (!currentLineUUIDs.includes(line.id)) {
          // Line was deleted - remove it from the database
          console.log(`Deleting line: ${line.id}`);
          const { error } = await supabase
            .from('script_content')
            .delete()
            .eq('id', line.id);
            
          if (error) throw error;
        }
      }
    }

    // Update the script content as a whole
    const { error: scriptError } = await supabase
      .from('scripts')
      .update({ content })
      .eq('id', scriptId);

    if (scriptError) throw scriptError;
    
    console.log('Lines saved and drafts cleared successfully');
  } catch (error) {
    console.error('Error saving lines to database:', error);
    throw error;
  }
};
