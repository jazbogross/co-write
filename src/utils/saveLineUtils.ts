
import { supabase } from '@/integrations/supabase/client';
import { LineData, DeltaStatic } from '@/types/lineTypes';
import { toast } from 'sonner';

// Save content to database
export const saveLinesToDatabase = async (
  scriptId: string,
  lineData: LineData[],
  content: string | DeltaStatic
) => {
  try {
    console.log('Saving to database with content type:', typeof content);
    
    // Make sure our content is a Delta object
    let contentToSave = content;
    if (typeof contentToSave === 'string') {
      try {
        contentToSave = JSON.parse(contentToSave);
      } catch (e) {
        console.warn('Could not parse string content as Delta:', e);
        // Create a simple Delta with the string content
        contentToSave = {
          ops: [{ insert: contentToSave + '\n' }]
        };
      }
    }
    
    // Check if a script_content record already exists
    const { data: existingContent } = await supabase
      .from('script_content')
      .select('*')
      .eq('script_id', scriptId)
      .maybeSingle();
    
    if (existingContent) {
      // Update existing content and increment version
      await supabase
        .from('script_content')
        .update({
          content_delta: contentToSave,
          version: existingContent.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('script_id', scriptId);
      
      // Also save a version history record
      await supabase
        .from('script_versions')
        .insert({
          script_id: scriptId,
          version_number: existingContent.version + 1,
          content_delta: contentToSave,
          created_at: new Date().toISOString()
        });
    } else {
      // Create new script_content record
      await supabase
        .from('script_content')
        .insert({
          script_id: scriptId,
          content_delta: contentToSave,
          version: 1
        });
      
      // Also save initial version history
      await supabase
        .from('script_versions')
        .insert({
          script_id: scriptId,
          version_number: 1,
          content_delta: contentToSave,
          created_at: new Date().toISOString()
        });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving to database:', error);
    toast.error('Failed to save content');
    return false;
  }
};
