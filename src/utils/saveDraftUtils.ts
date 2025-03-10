
import { LineData } from '@/types/lineTypes';
import { supabase } from '@/integrations/supabase/client';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';
import { normalizeContentForStorage } from '@/utils/suggestions/contentUtils';

// Main function to save draft content
export const saveDraft = async (
  scriptId: string, 
  lineData: LineData[], 
  content: string | DeltaContent, 
  userId: string | null,
  quill: any = null
) => {
  try {
    console.log('Saving draft for script:', scriptId, 'with', lineData.length, 'lines');
    
    // Get all existing lines for this script
    const { data: existingLines, error: fetchError } = await supabase
      .from('script_content')
      .select('id, line_number, content, draft')
      .eq('script_id', scriptId);
      
    if (fetchError) throw fetchError;
    
    // Create a map of existing line UUIDs for quick lookup
    const existingLineMap = new Map();
    if (existingLines) {
      existingLines.forEach(line => {
        if (line && typeof line === 'object' && 'id' in line) {
          existingLineMap.set(line.id, line);
        }
      });
    }
    
    // Get all current line UUIDs in the editor
    const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
    
    // Process all current lines from the editor
    for (const line of lineData) {
      console.log('Processing line:', line.lineNumber, 'UUID:', line.uuid);
      
      // Store the line content properly normalized for DB storage
      let lineContent = normalizeContentForStorage(line.content);
      
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

    return { success: true, lineCount: lineData.length };
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};

// New function: Direct DOM-based capture of content
export const captureContentFromDOM = (editor: any): { lineData: LineData[], content: DeltaContent } | null => {
  if (!editor) {
    console.error('Cannot capture content: No editor available');
    return null;
  }
  
  try {
    // Get all lines from the editor
    const lines = editor.getLines(0);
    console.log(`Capturing content from ${lines.length} DOM lines`);
    
    // Get full editor delta
    const fullDelta = editor.getContents();
    
    // Extract content and UUIDs for each line
    const capturedLineData = lines.map((line: any, index: number) => {
      // Get line position
      const lineIndex = editor.getIndex(line);
      const nextLineIndex = line.next ? editor.getIndex(line.next) : editor.getLength();
      
      // Get the Delta object for this line range
      const delta = editor.getContents(lineIndex, nextLineIndex - lineIndex);
      
      // Get UUID from DOM
      let uuid = null;
      if (line.domNode) {
        uuid = line.domNode.getAttribute('data-line-uuid');
      }
      
      // If no UUID, generate a random one (should be rare)
      if (!uuid) {
        uuid = crypto.randomUUID();
        // Try to apply it to the DOM
        if (line.domNode) {
          line.domNode.setAttribute('data-line-uuid', uuid);
        }
      }
      
      return {
        uuid,
        lineNumber: index + 1,
        content: delta,
        originalAuthor: null, // Will be set by server
        editedBy: [],
        hasDraft: true
      };
    });
    
    console.log('Captured line data:', capturedLineData.length, 'lines');
    
    return {
      lineData: capturedLineData,
      content: fullDelta
    };
  } catch (error) {
    console.error('Error capturing content from DOM:', error);
    return null;
  }
};
