
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import { normalizeContentForStorage } from './contentUtils';

/**
 * Save line drafts to the database
 */
export const saveLineDrafts = async (
  scriptId: string,
  lineData: LineData[],
  originalContent: string,
  userId: string | null
) => {
  try {
    // First, get current line data from database
    const { data: existingLines, error: fetchError } = await supabase
      .from('script_suggestions')
      .select('id, line_uuid, line_number, content, draft')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (fetchError) throw fetchError;
    
    // Create a map of existing line UUIDs for quick lookup
    const existingLineMap = new Map();
    if (existingLines) {
      existingLines.forEach(line => {
        if (line.line_uuid) {
          existingLineMap.set(line.line_uuid, line);
        }
      });
    }
    
    // Get all current line UUIDs in the editor
    const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
    
    // Update existing lines and create new ones
    await updateExistingAndCreateNewLines(
      lineData, 
      existingLineMap, 
      scriptId, 
      userId
    );
    
    // Handle deleted lines
    await handleDeletedLines(
      existingLines || [], 
      currentLineUUIDs
    );
    
  } catch (error) {
    console.error('Error saving line drafts:', error);
    throw error;
  }
};

/**
 * Update existing lines and create new ones
 */
const updateExistingAndCreateNewLines = async (
  lineData: LineData[],
  existingLineMap: Map<any, any>,
  scriptId: string,
  userId: string | null
) => {
  for (const line of lineData) {
    const existingLine = existingLineMap.get(line.uuid);
    
    // Convert content to appropriate format for storage
    const contentToStore = normalizeContentForStorage(line.content);
    
    if (existingLine) {
      // Line exists - update its draft content and draft line number
      const { error } = await supabase
        .from('script_suggestions')
        .update({
          draft: contentToStore !== existingLine.content ? contentToStore : existingLine.draft,
          line_number_draft: line.lineNumber
        })
        .eq('id', existingLine.id);
        
      if (error) throw error;
    } else {
      // New line - create a suggestion entry with draft content
      const { error } = await supabase
        .from('script_suggestions')
        .insert({
          script_id: scriptId,
          content: '',  // Original content is empty for new lines
          draft: contentToStore,
          user_id: userId,
          line_uuid: line.uuid,
          status: 'pending',
          line_number: null,  // No original line number for new lines
          line_number_draft: line.lineNumber
        });
        
      if (error) throw error;
    }
  }
};

/**
 * Handle lines that were deleted in the editor
 */
const handleDeletedLines = async (
  existingLines: any[],
  currentLineUUIDs: Set<string>
) => {
  for (const existingLine of existingLines) {
    if (existingLine.line_uuid && !currentLineUUIDs.has(existingLine.line_uuid)) {
      // Line was deleted - mark it as deleted in draft
      const { error } = await supabase
        .from('script_suggestions')
        .update({
          draft: '{deleted-uuid}'
        })
        .eq('id', existingLine.id);
        
      if (error) throw error;
    }
  }
};
