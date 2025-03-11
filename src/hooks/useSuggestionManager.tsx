
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SuggestionGroupManager, UserGroup, GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import { generateLineDiff } from '@/utils/diff/contentDiff';

export function useSuggestionManager(scriptId: string) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [groupedSuggestions, setGroupedSuggestions] = useState<UserGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<GroupedSuggestion | null>(null);
  const [originalContent, setOriginalContent] = useState<string | any>('');
  const { toast } = useToast();

  const normalizeContent = (content: any): string => {
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
          return extractPlainTextFromDelta(parsed);
        }
      } catch (e) {
        return content;
      }
      return content;
    } else if (isDeltaObject(content)) {
      return extractPlainTextFromDelta(content);
    }
    return String(content);
  };

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('script_suggestions')
        .select(`
          id,
          content,
          status,
          rejection_reason,
          line_uuid,
          line_number,
          metadata,
          user_id,
          profiles (
            username
          )
        `)
        .eq('script_id', scriptId)
        .neq('status', 'draft')
        .neq('status', 'unchanged')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const lineUuids = data
          .filter(item => item.line_uuid)
          .map(item => item.line_uuid);
        
        if (lineUuids.length > 0) {
          const { data: contentData, error: contentError } = await supabase
            .from('script_content')
            .select('id, content')
            .in('id', lineUuids);
            
          if (contentError) throw contentError;
          
          const originalContentMap = new Map();
          if (contentData) {
            contentData.forEach(item => {
              originalContentMap.set(item.id, item.content);
            });
          }
          
          const enhancedData = data.map(suggestion => ({
            ...suggestion,
            original_content: suggestion.line_uuid ? 
              originalContentMap.get(suggestion.line_uuid) : null
          }));
          
          setSuggestions(enhancedData);
          
          const grouped = SuggestionGroupManager.groupByUser(enhancedData);
          setGroupedSuggestions(grouped);
        } else {
          setSuggestions(data);
          const grouped = SuggestionGroupManager.groupByUser(data);
          setGroupedSuggestions(grouped);
        }
      } else {
        setSuggestions([]);
        setGroupedSuggestions([]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [scriptId]);

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    setIsProcessing(true);
    try {
      console.log(`Starting approval process for ${ids.length} suggestions`);
      
      for (const id of ids) {
        console.log(`Processing suggestion approval for ID: ${id}`);
        
        // 1. Fetch the suggestion data
        const { data: suggestionData, error: suggestionError } = await supabase
          .from('script_suggestions')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (suggestionError) {
          console.error('Error fetching suggestion:', suggestionError);
          throw suggestionError;
        }
        
        if (!suggestionData) {
          console.error('Suggestion not found');
          throw new Error('Suggestion not found');
        }

        console.log('Suggestion data:', suggestionData);

        // 2. Process based on whether it's updating an existing line or adding a new one
        if (suggestionData.line_uuid) {
          // Case: Update existing line
          console.log(`Updating existing line ${suggestionData.line_uuid}`);
          
          // 2a. Fetch current content to manage edited_by array
          const { data: contentData, error: contentError } = await supabase
            .from('script_content')
            .select('edited_by')
            .eq('id', suggestionData.line_uuid)
            .maybeSingle();
            
          if (contentError) {
            console.error('Error fetching content data:', contentError);
            throw contentError;
          }
          
          // 2b. Prepare edited_by array (ensuring it's an array)
          let editedByArray = [];
          if (contentData && contentData.edited_by) {
            try {
              // Handle possible formats of edited_by
              if (Array.isArray(contentData.edited_by)) {
                editedByArray = [...contentData.edited_by];
              } else if (typeof contentData.edited_by === 'string') {
                editedByArray = JSON.parse(contentData.edited_by);
              } else if (typeof contentData.edited_by === 'object') {
                editedByArray = Object.values(contentData.edited_by);
              }
              
              // Ensure it's actually an array
              if (!Array.isArray(editedByArray)) {
                editedByArray = [];
              }
            } catch (e) {
              console.error('Error parsing edited_by:', e);
              editedByArray = [];
            }
            
            // Add user if not already included
            if (!editedByArray.includes(suggestionData.user_id)) {
              editedByArray.push(suggestionData.user_id);
            }
          } else {
            editedByArray = [suggestionData.user_id];
          }
          
          console.log(`Updating script_content with edited_by:`, editedByArray);
          
          // 2c. Update the content
          const { error: updateError } = await supabase
            .from('script_content')
            .update({ 
              content: suggestionData.content,
              line_number: suggestionData.line_number,
              edited_by: editedByArray
            })
            .eq('id', suggestionData.line_uuid);

          if (updateError) {
            console.error('Error updating script_content:', updateError);
            throw updateError;
          }
          
          console.log(`Successfully updated line ${suggestionData.line_uuid}`);
        } else if (suggestionData.line_number) {
          // Case: Add new line
          console.log(`Adding new line at position ${suggestionData.line_number}`);
          
          // Generate a UUID for the new line
          const lineUuid = crypto.randomUUID();
          
          // Insert new line
          const { error: insertError } = await supabase
            .from('script_content')
            .insert({
              id: lineUuid,
              script_id: scriptId,
              content: suggestionData.content,
              line_number: suggestionData.line_number,
              original_author: suggestionData.user_id,
              edited_by: [suggestionData.user_id]
            });
            
          if (insertError) {
            console.error('Error inserting new line:', insertError);
            throw insertError;
          }
          
          console.log(`Successfully added new line with UUID ${lineUuid}`);
          
          // Update the suggestion with the new line UUID for future reference
          const { error: updateSuggestionError } = await supabase
            .from('script_suggestions')
            .update({ line_uuid: lineUuid })
            .eq('id', id);
            
          if (updateSuggestionError) {
            console.error('Error updating suggestion with new line UUID:', updateSuggestionError);
            // Non-critical error, can continue
          }
        } else {
          console.error('Invalid suggestion data - no line_uuid or line_number');
          throw new Error('Invalid suggestion data - missing line information');
        }

        // 3. Update suggestion status
        const { error: statusError } = await supabase
          .from('script_suggestions')
          .update({ status: 'approved' })
          .eq('id', id);

        if (statusError) {
          console.error('Error updating suggestion status:', statusError);
          throw statusError;
        }
        
        console.log(`Successfully approved suggestion ${id}`);
      }

      // 4. Update local state
      const updatedSuggestions = suggestions.map(suggestion => 
        ids.includes(suggestion.id) 
          ? { ...suggestion, status: 'approved' } 
          : suggestion
      );
      
      setSuggestions(updatedSuggestions);
      
      const grouped = SuggestionGroupManager.groupByUser(updatedSuggestions);
      setGroupedSuggestions(grouped);

      // 5. Notify user
      toast({
        title: "Success",
        description: ids.length > 1 
          ? `${ids.length} suggestions approved` 
          : "Suggestion approved and changes applied",
      });
      
      // 6. Reload suggestions to ensure UI is up to date
      await loadSuggestions();
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!id || !reason.trim()) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('script_suggestions')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', id);

      if (error) throw error;

      setSuggestions(suggestions.map(suggestion =>
        suggestion.id === id
          ? { ...suggestion, status: 'rejected', rejection_reason: reason }
          : suggestion
      ));
      
      const updatedSuggestions = suggestions.map(suggestion =>
        suggestion.id === id
          ? { ...suggestion, status: 'rejected', rejection_reason: reason }
          : suggestion
      );
      
      const grouped = SuggestionGroupManager.groupByUser(updatedSuggestions);
      setGroupedSuggestions(grouped);

      toast({
        title: "Success",
        description: "Suggestion rejected",
      });
      
      await loadSuggestions();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExpandSuggestion = async (id: string) => {
    let foundSuggestion: GroupedSuggestion | null = null;
    
    for (const group of groupedSuggestions) {
      const suggestion = group.suggestions.find(s => s.id === id);
      if (suggestion) {
        foundSuggestion = suggestion;
        break;
      }
    }
    
    if (!foundSuggestion) return;
    setExpandedSuggestion(foundSuggestion);
    
    if (foundSuggestion.line_uuid && foundSuggestion.original_content) {
      setOriginalContent(foundSuggestion.original_content);
    } else {
      setOriginalContent('');
    }
  };

  return {
    isLoading,
    isProcessing,
    groupedSuggestions,
    expandedSuggestion,
    originalContent,
    handleApprove,
    handleReject,
    handleExpandSuggestion,
    setExpandedSuggestion
  };
}
