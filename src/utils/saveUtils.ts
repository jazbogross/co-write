
import { LineData } from '@/hooks/useLineData';
import { supabase } from '@/integrations/supabase/client';

export const saveLinesToDatabase = async (
  scriptId: string,
  lineData: LineData[],
  content: string
) => {
  try {
    // Delete all existing line content
    await supabase
      .from('script_content')
      .delete()
      .eq('script_id', scriptId);
    
    // Create batch of lines to insert
    const linesToInsert = lineData.map(line => ({
      id: line.uuid, // Preserve the UUIDs
      script_id: scriptId,
      line_number: line.lineNumber,
      content: line.content,
      original_author: line.originalAuthor,
      edited_by: line.editedBy,
      metadata: {}
    }));

    // Insert all lines
    const { error } = await supabase
      .from('script_content')
      .insert(linesToInsert);

    if (error) throw error;

    // Update the script content as a whole
    const { error: scriptError } = await supabase
      .from('scripts')
      .update({ content })
      .eq('id', scriptId);

    if (scriptError) throw scriptError;
  } catch (error) {
    console.error('Error saving lines to database:', error);
    throw error;
  }
};

export const saveSuggestions = async (
  scriptId: string,
  lineData: LineData[],
  originalContent: string,
  userId: string | null
) => {
  try {
    // Get original content lines
    const originalLines = originalContent.split('\n');
    
    // Track all changes: additions, modifications, deletions
    const changes: Array<{
      type: 'modified' | 'added' | 'deleted';
      lineNumber: number;
      originalLineNumber?: number;
      content: string;
      uuid?: string;
    }> = [];
    
    // Find modified lines and added lines
    for (let i = 0; i < lineData.length; i++) {
      const currentLine = lineData[i];
      
      if (i < originalLines.length) {
        if (currentLine.content.trim() !== originalLines[i].trim()) {
          changes.push({
            type: 'modified',
            lineNumber: currentLine.lineNumber,
            originalLineNumber: i + 1,
            content: currentLine.content,
            uuid: currentLine.uuid
          });
        }
      } else {
        changes.push({
          type: 'added',
          lineNumber: currentLine.lineNumber,
          content: currentLine.content,
          uuid: currentLine.uuid
        });
      }
    }
    
    // Find deleted lines
    if (lineData.length < originalLines.length) {
      // Create a map of all line UUIDs currently in use
      const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
      
      // Get original line data from Supabase to find UUIDs of deleted lines
      const { data: originalLineData, error } = await supabase
        .from('script_content')
        .select('id, line_number, content')
        .eq('script_id', scriptId)
        .order('line_number', { ascending: true });
        
      if (error) throw error;
      
      if (originalLineData) {
        for (const line of originalLineData) {
          // If a line UUID from the database is not in our current line UUIDs, it was deleted
          if (!currentLineUUIDs.has(line.id)) {
            changes.push({
              type: 'deleted',
              lineNumber: line.line_number,
              originalLineNumber: line.line_number,
              content: '', // Empty content for deletion
              uuid: line.id
            });
          }
        }
      }
    }

    if (changes.length === 0) {
      throw new Error('No changes detected');
    }

    console.log('Detected changes:', changes);

    // Submit all changes as suggestions
    for (const change of changes) {
      const suggestionData = {
        script_id: scriptId,
        content: change.content,
        user_id: userId,
        line_uuid: change.uuid,
        status: 'pending',
        metadata: { 
          changeType: change.type,
          lineNumber: change.lineNumber,
          originalLineNumber: change.originalLineNumber
        }
      };

      const { error } = await supabase
        .from('script_suggestions')
        .insert(suggestionData);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving suggestions:', error);
    throw error;
  }
};

export const saveLineDrafts = async (
  scriptId: string,
  lineData: LineData[],
  originalContent: string,
  userId: string | null
) => {
  try {
    await supabase
      .from('script_suggestions')
      .delete()
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'draft');
    
    for (const line of lineData) {
      const originalLine = originalContent.split('\n')[line.lineNumber - 1] || '';
      
      if (line.content !== originalLine) {
        const { error } = await supabase
          .from('script_suggestions')
          .insert({
            script_id: scriptId,
            content: line.content,
            user_id: userId,
            line_uuid: line.uuid,
            status: 'draft'
          });

        if (error) throw error;
      }
    }
  } catch (error) {
    console.error('Error saving line drafts:', error);
    throw error;
  }
};

export const saveDraft = async (
  scriptId: string, 
  lineData: LineData[], 
  content: string, 
  userId: string | null
) => {
  const serializableData = {
    lines: lineData.map(line => ({
      uuid: line.uuid,
      lineNumber: line.lineNumber,
      content: line.content,
      originalAuthor: line.originalAuthor,
      editedBy: line.editedBy
    })),
    fullContent: content
  };

  const { error } = await supabase
    .from('script_drafts')
    .insert({
      script_id: scriptId,
      content: serializableData,
      user_id: userId
    });

  if (error) throw error;
};
