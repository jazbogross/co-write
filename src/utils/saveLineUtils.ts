
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
      line_number_draft: line.lineNumber, // Initialize draft line number to match current
      draft: null // No draft content initially
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
