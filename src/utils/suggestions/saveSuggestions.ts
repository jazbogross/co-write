
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import { createContentMap, normalizeContentForStorage } from './contentUtils';
import { trackChanges, trackDeletedLines, ChangeRecord } from './changeTracker';
import { isDeltaObject } from '@/utils/editor';

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
    
    // Track all changes: additions, modifications
    const changes = trackChanges(lineData, originalContent, existingContentMap);
    
    // Track deleted lines
    if (lineData.length < originalContent.split('\n').length) {
      const deletedLines = trackDeletedLines(lineData, existingContent || []);
      changes.push(...deletedLines);
    }

    if (changes.length === 0) {
      console.log('No changes detected to save as suggestions');
      return;
    }

    console.log('Detected changes with preserved UUIDs:', changes);

    // Submit all changes as suggestions
    await saveChangesToDatabase(changes, scriptId, userId);
    
  } catch (error) {
    console.error('Error saving suggestions:', error);
    throw error;
  }
};

/**
 * Save change records to the suggestions table
 */
const saveChangesToDatabase = async (
  changes: ChangeRecord[],
  scriptId: string,
  userId: string | null
) => {
  for (const change of changes) {
    const suggestionData = {
      script_id: scriptId,
      content: change.content,
      user_id: userId,
      line_uuid: change.uuid, // Preserve the original UUID
      status: 'pending',
      line_number: change.lineNumber, // Preserve the original line number
      metadata: { 
        changeType: change.type,
        lineNumber: change.lineNumber,
        originalLineNumber: change.originalLineNumber
      }
    };

    const { error } = await supabase
      .from('script_suggestions')
      .upsert(suggestionData, { onConflict: 'line_uuid' });

    if (error) throw error;
  }
};
