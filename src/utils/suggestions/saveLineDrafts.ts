
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import { normalizeContentForStorage } from './contentUtils';
import { isDeltaObject } from '@/utils/editor';

/**
 * Save line drafts to the database for non-admin users
 */
export const saveLineDrafts = async (
  scriptId: string,
  lineData: LineData[],
  originalContent: string,
  userId: string | null
) => {
  try {
    if (!userId) {
      console.error('Cannot save draft: No user ID provided');
      throw new Error('User ID is required to save drafts');
    }

    console.log(`Saving ${lineData.length} line drafts for user ${userId} on script ${scriptId}`);
    
    // First, get current suggestions from database
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
    
    console.log(`Found ${existingLineMap.size} existing suggestions, processing ${lineData.length} lines`);
    
    // Update existing lines and create new ones
    let updatedCount = 0;
    let createdCount = 0;
    
    for (const line of lineData) {
      const existingLine = existingLineMap.get(line.uuid);
      
      // Convert content to appropriate format for storage - ONLY normalize once
      const contentToStore = normalizeContentForStorage(line.content);
      
      if (existingLine) {
        // Line exists - update its draft content and draft line number
        const { error } = await supabase
          .from('script_suggestions')
          .update({
            draft: contentToStore,
            line_number_draft: line.lineNumber
          })
          .eq('id', existingLine.id);
          
        if (error) {
          console.error('Error updating draft for line', line.uuid, error);
          throw error;
        }
        updatedCount++;
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
          
        if (error) {
          console.error('Error creating draft for line', line.uuid, error);
          throw error;
        }
        createdCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} existing suggestions and created ${createdCount} new ones`);
    
    // Handle deleted lines
    let deletedCount = 0;
    for (const existingLine of (existingLines || [])) {
      if (existingLine.line_uuid && !currentLineUUIDs.has(existingLine.line_uuid)) {
        // Line was deleted - mark it as deleted in draft
        const { error } = await supabase
          .from('script_suggestions')
          .update({
            draft: '{deleted-uuid}'
          })
          .eq('id', existingLine.id);
          
        if (error) {
          console.error('Error marking suggestion as deleted', existingLine.id, error);
          throw error;
        }
        deletedCount++;
      }
    }
    
    console.log(`Marked ${deletedCount} suggestions as deleted`);
    console.log('Draft suggestions saved successfully');
    
  } catch (error) {
    console.error('Error saving line drafts:', error);
    throw error;
  }
};
