import { LineData } from '@/types/lineTypes';
import { supabase } from '@/integrations/supabase/client';
import { 
  isDeltaObject, 
  logDeltaStructure, 
  extractPlainTextFromDelta 
} from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';
import { normalizeContentForStorage } from '@/utils/suggestions/contentUtils';

export const saveDraft = async (
  scriptId: string, 
  lineData: LineData[], 
  content: string | DeltaContent, 
  userId: string | null,
  quill: any = null
) => {
  try {
    console.log('Saving draft for script:', scriptId, 'with', lineData.length, 'lines');
    
    // First get all existing lines for this script
    const { data: existingLines, error: fetchError } = await supabase
      .from('script_content')
      .select('id, line_number, content, draft')
      .eq('script_id', scriptId);
      
    if (fetchError) throw fetchError;
    
    // Create a map of existing line UUIDs for quick lookup
    const existingLineMap = new Map();
    if (existingLines) {
      existingLines.forEach(line => {
        existingLineMap.set(line.id, line);
      });
    }
    
    // Get all current line UUIDs in the editor
    const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
    
    // Process all current lines from the editor
    for (const line of lineData) {
      console.log('Processing line:', line.lineNumber, 'UUID:', line.uuid);
      
      // Store the line content properly normalized for DB storage
      const lineContent = normalizeContentForStorage(line.content);
      
      if (existingLineMap.has(line.uuid)) {
        // Line exists - update draft content and draft line number
        const updates: any = {
          draft: lineContent,
          line_number_draft: line.lineNumber
        };
        
        const { error } = await supabase
          .from('script_content')
          .update(updates)
          .eq('id', line.uuid);
          
        if (error) throw error;
        
        console.log('Updated draft for line:', line.uuid);
      } else {
        // New line - create it with draft content
        const { error } = await supabase
          .from('script_content')
          .insert({
            id: line.uuid,
            script_id: scriptId,
            content: '', // Empty main content
            draft: lineContent, // Store as draft first
            line_number: 0, // Default line number
            line_number_draft: line.lineNumber,
            original_author: userId
          });
          
        if (error) throw error;
        
        console.log('Created new line with draft:', line.uuid);
      }
    }
    
    // Handle deleted lines
    for (const existingLineId of existingLineMap.keys()) {
      if (!currentLineUUIDs.has(existingLineId)) {
        const { error } = await supabase
          .from('script_content')
          .update({ draft: '{deleted}' })
          .eq('id', existingLineId);
          
        if (error) throw error;
        
        console.log('Marked line as deleted:', existingLineId);
      }
    }

  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};
