import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import { createContentMap, normalizeContentForStorage } from './contentUtils';
import { trackChanges, trackDeletedLines, ChangeRecord } from './changeTracker';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

/**
 * Save suggestions to the database
 */
export const saveSuggestions = async (
  scriptId: string,
  lineData: LineData[],
  originalContent: string,
  userId: string | null
) => {
  console.log('********Line Data********', lineData);
  try {
    if (!userId) {
      throw new Error('User ID is required to save suggestions');
    }
    
    if (!scriptId || scriptId.trim() === '') {
      throw new Error('Script ID is required');
    }
    
    // First, get the existing script content to track UUIDs and line numbers
    const { data: existingContent, error: contentError } = await supabase
      .from('script_content')
      .select('id, line_number, content')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (contentError) {
      throw contentError;
    }
    
    // Create a map of content to existing UUIDs and line numbers
    const existingContentMap = createContentMap(existingContent || []);
    
    // Track all changes: additions, modifications, and unchanged lines
    const changes = await trackChanges(lineData, scriptId, existingContentMap);
    
    // Track deleted lines
    if (lineData.length < (existingContent?.length || 0)) {
      const deletedLines = trackDeletedLines(lineData, existingContent || []);
      
      // Ensure deletedLines is an array before concat
      if (Array.isArray(deletedLines)) {
        // Ensure changes is also an array before concat
        if (Array.isArray(changes)) {
          changes.push(...deletedLines);
        }
      }
    }

    // Safety check to ensure changes is an array
    if (!Array.isArray(changes)) {
      console.error('Expected changes to be an array but got:', typeof changes);
      return;
    }

    // Filter out only the actual changes for logging
    const actualChanges = changes.filter(change => change.type !== 'unchanged');
    
    if (actualChanges.length === 0) {
      console.log('No changes detected to save as suggestions');
    } else {
      console.log('Detected changes:', actualChanges);
    }

    // Submit all changes as suggestions, including unchanged ones
    await saveChangesToDatabase(changes, scriptId, userId);
    
  } catch (error) {
    console.error('Error saving suggestions:', error);
    throw error;
  }
};

/**
 * Save change records to the database
 */
const saveChangesToDatabase = async (
  changes: ChangeRecord[],
  scriptId: string,
  userId: string | null
) => {
  if (!Array.isArray(changes)) {
    console.error('Expected changes to be an array but got:', typeof changes);
    return;
  }

  for (const change of changes) {
    // Set the appropriate status based on change type
    let status = 'pending';
    
    if (change.type === 'unchanged') {
      status = 'unchanged';
    }
    
    const suggestionData = {
      script_id: scriptId,
      content: change.content,
      user_id: userId,
      line_uuid: change.uuid, // Preserve the original UUID
      status: status,
      line_number: change.lineNumber, // Preserve the original line number
      metadata: { 
        changeType: change.type,
        lineNumber: change.lineNumber,
        originalLineNumber: change.originalLineNumber
      }
    };

    console.log(`Saving suggestion for line ${change.lineNumber} with status: ${status}`);

    const { error } = await supabase
      .from('script_suggestions')
      .upsert(suggestionData, { onConflict: 'line_uuid' });

    if (error) throw error;
  }
};
