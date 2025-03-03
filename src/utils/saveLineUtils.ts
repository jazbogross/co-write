
import { LineData } from '@/types/lineTypes';
import { supabase } from '@/integrations/supabase/client';
import { DeltaContent, extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

export const saveLinesToDatabase = async (
  scriptId: string,
  lineData: LineData[],
  content: string | DeltaContent // Can now properly handle both string and DeltaContent
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
      existingLines.forEach(line => {
        // Type-safe access to line properties
        if (line && typeof line === 'object' && 'id' in line && 'line_number' in line) {
          existingLineMap.set(line.id, line.line_number);
        }
      });
    }
    
    console.log(`Found ${existingLineMap.size} existing lines, processing ${lineData.length} lines`);
    
    // First, make sure we're not trying to save duplicate line numbers
    // Sort lineData by line number to ensure we save in order
    lineData.sort((a, b) => a.lineNumber - b.lineNumber);
    
    // Temporarily adjust all line numbers to large negative values to avoid conflicts
    if (existingLines) {
      for (const line of existingLines) {
        // Type-safe access to line properties
        if (line && typeof line === 'object' && 'id' in line && 'line_number' in line) {
          const { error } = await supabase
            .from('script_content')
            .update({ line_number: -10000 - parseInt(String(line.line_number)) })
            .eq('id', line.id);
            
          if (error) {
            console.error('Error adjusting line numbers:', error);
            throw error;
          }
        }
      }
    }
    
    // Process each line: update existing lines, insert new ones
    for (const line of lineData) {
      // Convert Delta object to string for database storage if needed
      let storedContent: string;
      
      if (isDeltaObject(line.content)) {
        // If it's a Delta object, stringify it for storage
        storedContent = JSON.stringify(line.content);
      } else {
        // If it's already a string, use it directly
        storedContent = typeof line.content === 'string' ? line.content : '';
      }
      
      if (existingLineMap.has(line.uuid)) {
        // Update existing line with current content and clear draft fields
        const { error } = await supabase
          .from('script_content')
          .update({
            content: storedContent,
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
        // Insert new line
        console.log(`Inserting new line: ${line.uuid}, line number: ${line.lineNumber}`);
        const { error } = await supabase
          .from('script_content')
          .insert({
            id: line.uuid,
            script_id: scriptId,
            line_number: line.lineNumber,
            content: storedContent,
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
        // Type-safe access to line properties
        if (line && typeof line === 'object' && 'id' in line) {
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
    }

    console.log('Lines saved and drafts cleared successfully');
  } catch (error) {
    console.error('Error saving lines to database:', error);
    throw error;
  }
};
