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
 * Save change records to the database
 */
const saveChangesToDatabase = async (
  changes: ChangeRecord[],
  scriptId: string,
  userId: string | null
) => {
  for (const change of changes) {
    // Compare the content with original content to detect unchanged lines
    let status = 'pending';
    
    if (change.type === 'modified' && change.uuid) {
      // Fetch the original content to compare
      const { data: originalData, error: originalError } = await supabase
        .from('script_content')
        .select('content')
        .eq('id', change.uuid)
        .single();
        
      if (!originalError && originalData) {
        // Normalize both contents for comparison
        const normalizedOriginal = normalizeContent(originalData.content);
        const normalizedNew = normalizeContent(change.content);
        
        // If content is unchanged, mark as 'unchanged'
        if (normalizedOriginal === normalizedNew) {
          status = 'unchanged';
          console.log('Detected unchanged content for line with UUID:', change.uuid);
        }
      }
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

    const { error } = await supabase
      .from('script_suggestions')
      .upsert(suggestionData, { onConflict: 'line_uuid' });

    if (error) throw error;
  }
};

// Helper function to normalize content for comparison
const normalizeContent = (content: any): string => {
  if (typeof content === 'string') {
    try {
      // Check if it's stringified JSON/Delta
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
        return extractPlainTextFromDelta(parsed);
      }
    } catch (e) {
      // Not JSON, use as is
      return content;
    }
    return content;
  } else if (isDeltaObject(content)) {
    return extractPlainTextFromDelta(content);
  }
  return String(content);
};
