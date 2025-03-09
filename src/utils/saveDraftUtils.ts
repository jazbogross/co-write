
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
    
    // Debug log
    console.log(`Processing ${lineData.length} lines, ${existingLines?.length || 0} existing lines`);
    
    // Process all current lines from the editor (source of truth)
    for (const line of lineData) {
      const existingLine = existingLineMap.get(line.uuid);
      
      // Store the line content properly normalized for DB storage
      let lineContent = normalizeContentForStorage(line.content);
      
      // Debug log formatted content
      if (isDeltaObject(line.content)) {
        console.log(`Line ${line.lineNumber} saving as Delta:`, lineContent.substring(0, 50) + '...');
        logDeltaStructure(line.content);
        
        // Extract and log the plain text so we can verify it's being saved correctly
        const plainText = extractPlainTextFromDelta(line.content);
        console.log(`Line ${line.lineNumber} plain text:`, plainText.substring(0, 50) + (plainText.length > 50 ? '...' : ''));
      }
      
      if (existingLine) {
        // Line exists - check if we need to update draft content or line number
        const updates: { draft?: string; line_number_draft?: number } = {};
        let needsUpdate = false;
        
        // Compare current content with existing content
        let currentPlainContent = typeof line.content === 'string' ? line.content : 
            isDeltaObject(line.content) ? extractPlainTextFromDelta(line.content) : '';
        
        let existingPlainContent = existingLine.content;
        try {
          // Try to parse existing content if it's a stringified Delta
          const parsed = JSON.parse(existingLine.content);
          if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
            existingPlainContent = extractPlainTextFromDelta(parsed);
          }
        } catch (e) {
          // Not JSON, use as-is
        }
        
        // Check if content has changed compared to the original
        if (currentPlainContent !== existingPlainContent) {
          updates.draft = lineContent;
          needsUpdate = true;
          console.log(`Updating draft content for line ${line.uuid}`);
        }
        
        // Check if line number has changed compared to the original
        if (line.lineNumber !== existingLine.line_number) {
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
            content: '',  // Empty since this is a new line
            draft: lineContent,
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
