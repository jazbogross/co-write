
import { LineData } from '@/hooks/useLineData';
import { supabase } from '@/integrations/supabase/client';

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
    const suggestionPromises = changes.map(change => {
      const suggestionData = {
        script_id: scriptId,
        content: change.content,
        user_id: userId,
        line_uuid: change.uuid,
        status: 'pending',
        line_number: change.originalLineNumber,
        metadata: { 
          changeType: change.type,
          lineNumber: change.lineNumber,
          originalLineNumber: change.originalLineNumber
        }
      };

      return supabase
        .from('script_suggestions')
        .insert(suggestionData)
        .then(({ error }) => {
          if (error) throw error;
        });
    });

    await Promise.all(suggestionPromises);
    return true;
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
    console.log('Saving line drafts for script:', scriptId, 'with', lineData.length, 'lines');
    
    // First, get current line data from database
    const { data: existingLines, error: fetchError } = await supabase
      .from('script_suggestions')
      .select('id, line_uuid, line_number, content, draft, line_number_draft')
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
    
    // Track operations for batch processing
    const linesToUpdate = [];
    const linesToInsert = [];
    const deletedLineUpdates = [];
    
    // First, update draft position for all lines
    for (const line of lineData) {
      const existingLine = existingLineMap.get(line.uuid);
      
      if (existingLine) {
        // Only update if content changed or line position changed
        const contentChanged = line.content !== existingLine.content;
        const positionChanged = line.lineNumber !== existingLine.line_number_draft;
        
        if (contentChanged || positionChanged) {
          // Line exists - update its draft content and draft line number
          linesToUpdate.push({
            id: existingLine.id,
            draft: contentChanged ? line.content : existingLine.draft,
            line_number_draft: line.lineNumber
          });
        }
      } else {
        // New line - create a suggestion entry with draft content
        linesToInsert.push({
          script_id: scriptId,
          content: '',  // Original content is empty for new lines
          draft: line.content,
          user_id: userId,
          line_uuid: line.uuid,
          status: 'pending',
          line_number: null,  // No original line number for new lines
          line_number_draft: line.lineNumber
        });
      }
    }
    
    // Handle deleted lines (lines that exist in DB but not in editor)
    if (existingLines) {
      for (const existingLine of existingLines) {
        if (existingLine.line_uuid && !currentLineUUIDs.has(existingLine.line_uuid)) {
          // Line was deleted - mark it as deleted in draft
          deletedLineUpdates.push({
            id: existingLine.id,
            draft: '{deleted-uuid}'
          });
        }
      }
    }
    
    // Process all operations in batches
    const operations = [];
    
    // 1. Process inserts (new lines)
    if (linesToInsert.length > 0) {
      operations.push(supabase
        .from('script_suggestions')
        .insert(linesToInsert)
        .then(({error}) => {
          if (error) throw error;
          console.log(`Inserted ${linesToInsert.length} new line drafts`);
        })
      );
    }
    
    // 2. Process updates (changed lines)
    if (linesToUpdate.length > 0) {
      // Update in batches of 50 to prevent request size limits
      const batchSize = 50;
      for (let i = 0; i < linesToUpdate.length; i += batchSize) {
        const batch = linesToUpdate.slice(i, i + batchSize);
        operations.push(
          ...batch.map(lineUpdate => 
            supabase
              .from('script_suggestions')
              .update({
                draft: lineUpdate.draft,
                line_number_draft: lineUpdate.line_number_draft
              })
              .eq('id', lineUpdate.id)
              .then(({error}) => {
                if (error) throw error;
              })
          )
        );
      }
      console.log(`Updated ${linesToUpdate.length} existing line drafts`);
    }
    
    // 3. Process deletions (lines removed from editor)
    if (deletedLineUpdates.length > 0) {
      // Mark deleted lines in batches of 50
      const batchSize = 50;
      for (let i = 0; i < deletedLineUpdates.length; i += batchSize) {
        const batch = deletedLineUpdates.slice(i, i + batchSize);
        operations.push(
          ...batch.map(lineUpdate => 
            supabase
              .from('script_suggestions')
              .update({
                draft: lineUpdate.draft
              })
              .eq('id', lineUpdate.id)
              .then(({error}) => {
                if (error) throw error;
              })
          )
        );
      }
      console.log(`Marked ${deletedLineUpdates.length} line drafts as deleted`);
    }
    
    // Execute all operations in parallel
    await Promise.all(operations);
    
    console.log('Draft save operations completed successfully');
    return true;
  } catch (error) {
    console.error('Error saving line drafts:', error);
    throw error;
  }
};
